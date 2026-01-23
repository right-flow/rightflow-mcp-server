/**
 * Outbound Gateway - Integration Hub Phase 3
 * HTTP client for external API calls with retry, timeout, rate limiting, and circuit breaker
 *
 * Features:
 * - HTTP methods: GET, POST, PUT, PATCH, DELETE
 * - Authentication: Basic Auth, API Key, OAuth 2.0 (future)
 * - Retry logic: 3 retries with exponential backoff (1s, 2s, 4s)
 * - Timeout: 10 seconds default, configurable
 * - Rate limiting: Redis-based sliding window (100 req/min default)
 * - Circuit breaker: Opens after 5 failures, reopens after 60s
 * - Performance tracking: Duration metrics for all requests
 * - Error handling: Comprehensive error types with context
 */

import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import axiosRetry from 'axios-retry';
import { redisConnection } from '../../config/redis';
import logger from '../../utils/logger';

// ============================================================================
// Types
// ============================================================================

export interface OutboundRequest {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;        // milliseconds, default: 10000
  maxRetries?: number;     // default: 3
  auth?: {
    type: 'basic' | 'apikey' | 'oauth2';
    credentials: Record<string, string>;
  };
}

export interface OutboundResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: any;
  durationMs: number;
  fromCache?: boolean;
}

export interface CircuitState {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failures: number;
  lastFailure?: number;
  openedAt?: number;
}

// ============================================================================
// Custom Error Classes
// ============================================================================

export class OutboundGatewayError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public connectorId?: string,
    public durationMs?: number,
    public details?: any,
  ) {
    super(message);
    this.name = 'OutboundGatewayError';
  }
}

export class TimeoutError extends OutboundGatewayError {
  constructor(message: string, timeout: number, connectorId?: string) {
    super(message, 408, connectorId);
    this.name = 'TimeoutError';
    this.details = { timeout };
  }
}

export class RateLimitError extends OutboundGatewayError {
  constructor(message: string, connectorId?: string, limit?: number) {
    super(message, 429, connectorId);
    this.name = 'RateLimitError';
    this.details = { limit };
  }
}

export class CircuitBreakerError extends OutboundGatewayError {
  constructor(message: string, connectorId?: string, circuitState?: CircuitState) {
    super(message, 503, connectorId);
    this.name = 'CircuitBreakerError';
    this.details = { circuitState };
  }
}

// ============================================================================
// Rate Limiting (Redis Sliding Window)
// ============================================================================

/**
 * Check if request is within rate limit using Redis sliding window
 * Default: 100 requests per minute
 */
async function checkRateLimit(
  connectorId: string,
  limit: number = 100,
  windowSec: number = 60,
): Promise<boolean> {
  const key = `rate_limit:${connectorId}`;
  const now = Date.now();
  const windowStart = now - (windowSec * 1000);

  try {
    // Remove old entries outside window
    await redisConnection.zremrangebyscore(key, 0, windowStart);

    // Count requests in current window
    const count = await redisConnection.zcard(key);

    if (count >= limit) {
      logger.warn('Rate limit exceeded', {
        connectorId,
        currentCount: count,
        limit,
        windowSec,
      });
      return false;
    }

    // Add current request to window
    await redisConnection.zadd(key, now, `${now}-${Math.random()}`);
    await redisConnection.expire(key, windowSec);

    return true;
  } catch (error: any) {
    logger.error('Rate limit check failed', {
      connectorId,
      error: error.message,
    });
    // On Redis error, allow request (fail open)
    return true;
  }
}

// ============================================================================
// Circuit Breaker (Redis State Machine)
// ============================================================================

/**
 * Check circuit breaker state
 * Returns true if circuit is CLOSED or HALF_OPEN (allow request)
 * Returns false if circuit is OPEN (block request)
 */
async function checkCircuit(connectorId: string): Promise<boolean> {
  const key = `circuit:${connectorId}`;

  try {
    const data = await redisConnection.get(key);

    if (!data) {
      // No circuit state = CLOSED (default)
      return true;
    }

    const circuit: CircuitState = JSON.parse(data);

    if (circuit.state === 'OPEN') {
      const timeSinceOpen = Date.now() - (circuit.openedAt || 0);

      if (timeSinceOpen > 60000) {
        // Transition to HALF_OPEN after 60 seconds
        circuit.state = 'HALF_OPEN';
        await redisConnection.setex(key, 300, JSON.stringify(circuit));

        logger.info('Circuit breaker transitioning to HALF_OPEN', {
          connectorId,
          timeSinceOpen,
        });

        return true; // Allow 1 request
      }

      logger.warn('Circuit breaker OPEN - blocking request', {
        connectorId,
        timeSinceOpen,
        failures: circuit.failures,
      });

      return false; // Circuit still open
    }

    // CLOSED or HALF_OPEN - allow request
    return true;
  } catch (error: any) {
    logger.error('Circuit breaker check failed', {
      connectorId,
      error: error.message,
    });
    // On Redis error, allow request (fail open)
    return true;
  }
}

/**
 * Record successful request - close circuit
 */
async function recordSuccess(connectorId: string): Promise<void> {
  const key = `circuit:${connectorId}`;

  try {
    await redisConnection.del(key); // Reset circuit to CLOSED

    logger.debug('Circuit breaker closed after successful request', {
      connectorId,
    });
  } catch (error: any) {
    logger.error('Failed to record circuit success', {
      connectorId,
      error: error.message,
    });
  }
}

/**
 * Record failed request - increment failure count
 * Opens circuit after 5 consecutive failures
 */
async function recordFailure(connectorId: string): Promise<void> {
  const key = `circuit:${connectorId}`;

  try {
    const data = await redisConnection.get(key);

    const circuit: CircuitState = data
      ? JSON.parse(data)
      : { state: 'CLOSED' as const, failures: 0 };

    circuit.failures++;
    circuit.lastFailure = Date.now();

    if (circuit.failures >= 5) {
      circuit.state = 'OPEN';
      circuit.openedAt = Date.now();

      logger.error('Circuit breaker OPENED after 5 failures', {
        connectorId,
        failures: circuit.failures,
      });
    }

    await redisConnection.setex(key, 300, JSON.stringify(circuit));
  } catch (error: any) {
    logger.error('Failed to record circuit failure', {
      connectorId,
      error: error.message,
    });
  }
}

// ============================================================================
// HTTP Client Configuration
// ============================================================================

// Create axios instance with retry configuration
const httpClient = axios.create();

// Configure axios-retry
axiosRetry(httpClient, {
  retries: 3,
  retryDelay: (retryCount) => {
    // Exponential backoff: 1s, 2s, 4s
    return Math.pow(2, retryCount - 1) * 1000;
  },
  retryCondition: (error: AxiosError) => {
    // Retry on network errors or 5xx server errors
    // Do NOT retry on 4xx client errors (400, 401, 404, etc.)
    return (
      axiosRetry.isNetworkError(error) ||
      axiosRetry.isRetryableError(error) ||
      (error.response?.status !== undefined && error.response.status >= 500)
    );
  },
  onRetry: (retryCount, error, requestConfig) => {
    logger.warn('Retrying request', {
      retryCount,
      url: requestConfig.url,
      error: error.message,
    });
  },
});

// ============================================================================
// Main Request Function
// ============================================================================

/**
 * Make HTTP request to external API
 * Includes rate limiting, circuit breaker, retry logic, timeout
 */
export async function makeRequest(
  connectorId: string,
  organizationId: string,
  request: OutboundRequest,
): Promise<OutboundResponse> {
  const startTime = Date.now();

  // 1. Check rate limit
  const withinLimit = await checkRateLimit(connectorId);
  if (!withinLimit) {
    throw new RateLimitError(
      `Rate limit exceeded for connector ${connectorId}`,
      connectorId,
      100,
    );
  }

  // 2. Check circuit breaker
  const circuitClosed = await checkCircuit(connectorId);
  if (!circuitClosed) {
    throw new CircuitBreakerError(
      `Circuit breaker open for connector ${connectorId}`,
      connectorId,
    );
  }

  // 3. Build axios config
  const axiosConfig: AxiosRequestConfig = {
    url: request.url,
    method: request.method,
    headers: request.headers || {},
    data: request.body,
    timeout: request.timeout || 10000, // 10 second default
    'axios-retry': {
      retries: request.maxRetries !== undefined ? request.maxRetries : 3,
    },
  };

  // Add authentication
  if (request.auth) {
    if (request.auth.type === 'basic') {
      axiosConfig.auth = {
        username: request.auth.credentials.username,
        password: request.auth.credentials.password,
      };
    } else if (request.auth.type === 'apikey') {
      const headerName = request.auth.credentials.headerName || 'X-API-Key';
      const apiKey = request.auth.credentials.apiKey;
      axiosConfig.headers![headerName] = apiKey;
    }
  }

  // 4. Make request
  try {
    logger.info('Outbound request started', {
      connectorId,
      organizationId,
      method: request.method,
      url: request.url,
      timeout: axiosConfig.timeout,
    });

    const response: AxiosResponse = await httpClient.request(axiosConfig);
    const durationMs = Date.now() - startTime;

    // Record success for circuit breaker
    await recordSuccess(connectorId);

    logger.info('Outbound request completed', {
      connectorId,
      organizationId,
      status: response.status,
      durationMs,
    });

    return {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers as Record<string, string>,
      data: response.data,
      durationMs,
    };
  } catch (error: any) {
    const durationMs = Date.now() - startTime;

    // Record failure for circuit breaker
    await recordFailure(connectorId);

    // Handle different error types
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      logger.error('Outbound request timeout', {
        connectorId,
        organizationId,
        url: request.url,
        timeout: axiosConfig.timeout,
        durationMs,
      });

      throw new TimeoutError(
        `Request timeout after ${axiosConfig.timeout}ms`,
        axiosConfig.timeout as number,
        connectorId,
      );
    }

    if (error.response) {
      // HTTP error response (4xx, 5xx)
      const statusCode = error.response.status;

      logger.error('Outbound request failed', {
        connectorId,
        organizationId,
        url: request.url,
        status: statusCode,
        statusText: error.response.statusText,
        durationMs,
      });

      // Sanitize error message (don't include credentials)
      const sanitizedError = {
        status: statusCode,
        statusText: error.response.statusText,
        data: error.response.data,
      };

      throw new OutboundGatewayError(
        `HTTP ${statusCode}: ${error.response.statusText}`,
        statusCode,
        connectorId,
        durationMs,
        sanitizedError,
      );
    }

    if (error.request) {
      // Network error (no response received)
      logger.error('Outbound request network error', {
        connectorId,
        organizationId,
        url: request.url,
        error: error.message,
        code: error.code,
        durationMs,
      });

      throw new OutboundGatewayError(
        `Network error: ${error.message}`,
        undefined,
        connectorId,
        durationMs,
        { code: error.code },
      );
    }

    // Other error (request setup, malformed JSON parsing, etc.)
    logger.error('Outbound request error', {
      connectorId,
      organizationId,
      error: error.message,
      durationMs,
    });

    throw new OutboundGatewayError(
      `Request failed: ${error.message}`,
      undefined,
      connectorId,
      durationMs,
    );
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get circuit breaker state for monitoring
 */
export async function getCircuitState(connectorId: string): Promise<CircuitState | null> {
  try {
    const data = await redisConnection.get(`circuit:${connectorId}`);
    return data ? JSON.parse(data) : null;
  } catch (error: any) {
    logger.error('Failed to get circuit state', {
      connectorId,
      error: error.message,
    });
    return null;
  }
}

/**
 * Reset circuit breaker manually (admin function)
 */
export async function resetCircuit(connectorId: string): Promise<void> {
  try {
    await redisConnection.del(`circuit:${connectorId}`);
    logger.info('Circuit breaker manually reset', { connectorId });
  } catch (error: any) {
    logger.error('Failed to reset circuit', {
      connectorId,
      error: error.message,
    });
  }
}

/**
 * Get rate limit status for monitoring
 */
export async function getRateLimitStatus(
  connectorId: string,
  windowSec: number = 60,
): Promise<{ count: number; limit: number; remaining: number }> {
  try {
    const key = `rate_limit:${connectorId}`;
    const now = Date.now();
    const windowStart = now - (windowSec * 1000);

    await redisConnection.zremrangebyscore(key, 0, windowStart);
    const count = await redisConnection.zcard(key);
    const limit = 100; // Default limit

    return {
      count,
      limit,
      remaining: Math.max(0, limit - count),
    };
  } catch (error: any) {
    logger.error('Failed to get rate limit status', {
      connectorId,
      error: error.message,
    });
    return { count: 0, limit: 100, remaining: 100 };
  }
}
