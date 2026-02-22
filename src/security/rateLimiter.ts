/**
 * Rate Limiter - Security Component
 *
 * Implements token bucket algorithm with concurrency limits and error cooldown.
 *
 * Security Features:
 * - Rate limiting (default: 20 requests/minute)
 * - Concurrency limits (default: 3 concurrent requests)
 * - Per-client tracking and isolation
 * - Error cooldown (default: 5 seconds)
 * - Automatic token refill over time
 *
 * @example Basic usage
 * ```typescript
 * const limiter = new RateLimiter();
 * await limiter.checkLimit('client-id'); // Throws if limit exceeded
 * ```
 *
 * @example With concurrent requests
 * ```typescript
 * const limiter = new RateLimiter({ maxConcurrent: 3 });
 * const token = await limiter.acquire('client-id');
 * try {
 *   // Do work
 * } finally {
 *   limiter.release(token);
 * }
 * ```
 */

import { randomUUID } from "node:crypto";

/**
 * Rate limiter configuration options
 */
export interface RateLimiterConfig {
  /** Requests allowed per minute (default: 20) */
  requestsPerMinute?: number;
  /** Maximum concurrent requests per client (default: 3) */
  maxConcurrent?: number;
  /** Cooldown period in seconds after errors (default: 5) */
  cooldownSeconds?: number;
}

/**
 * Error codes for rate limiting violations
 */
export const RateLimitErrorCodes = {
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
  CONCURRENT_LIMIT_EXCEEDED: "CONCURRENT_LIMIT_EXCEEDED",
  IN_COOLDOWN: "IN_COOLDOWN",
} as const;

export type RateLimitErrorCode =
  (typeof RateLimitErrorCodes)[keyof typeof RateLimitErrorCodes];

/**
 * Error thrown when rate limit is exceeded
 */
export class RateLimitError extends Error {
  constructor(
    message: string,
    public code: RateLimitErrorCode,
    public retryAfter?: number
  ) {
    super(message);
    this.name = "RateLimitError";
  }
}

/**
 * Client state for rate limiting
 */
interface ClientState {
  /** Available tokens (fractional) */
  tokens: number;
  /** Last token refill timestamp */
  lastRefill: number;
  /** Currently active concurrent requests */
  concurrent: Set<string>;
  /** Cooldown end timestamp (if in cooldown) */
  cooldownUntil?: number;
  /** Total requests made */
  totalRequests: number;
}

/**
 * Client statistics
 */
export interface ClientStats {
  /** Tokens remaining */
  tokensRemaining: number;
  /** Currently active concurrent requests */
  concurrentActive: number;
  /** Whether client is in cooldown */
  inCooldown: boolean;
  /** Seconds until cooldown ends (if in cooldown) */
  cooldownRemaining?: number;
  /** Total requests made */
  totalRequests: number;
}

/**
 * Global statistics
 */
export interface GlobalStats {
  /** Total number of clients tracked */
  totalClients: number;
  /** Total requests across all clients */
  totalRequests: number;
  /** Clients currently in cooldown */
  clientsInCooldown: number;
}

/**
 * Rate Limiter - Token bucket with concurrency control
 *
 * Implements a token bucket algorithm where:
 * - Each client gets a bucket of tokens
 * - Tokens are consumed on each request
 * - Tokens refill at a constant rate
 * - Concurrent requests are tracked separately
 */
export class RateLimiter {
  private readonly config: Required<RateLimiterConfig>;
  private readonly clients: Map<string, ClientState>;
  private readonly tokensPerSecond: number;

  /**
   * Create a new Rate Limiter
   *
   * @param config - Rate limiter configuration
   * @throws Error if configuration is invalid
   */
  constructor(config: RateLimiterConfig = {}) {
    // Apply defaults
    this.config = {
      requestsPerMinute: config.requestsPerMinute ?? 20,
      maxConcurrent: config.maxConcurrent ?? 3,
      cooldownSeconds: config.cooldownSeconds ?? 5,
    };

    // Validate configuration
    this.validateConfig();

    // Calculate tokens per second for refill rate
    this.tokensPerSecond = this.config.requestsPerMinute / 60;

    // Initialize client state map
    this.clients = new Map();
  }

  /**
   * Check if client can make a request
   *
   * This only checks the rate limit (token bucket), not concurrency.
   * Use acquire() for concurrent request tracking.
   *
   * @param clientId - Unique client identifier
   * @throws RateLimitError if limit exceeded or in cooldown
   */
  async checkLimit(clientId: string): Promise<void> {
    const state = this.getOrCreateClientState(clientId);

    // Check cooldown first
    if (this.isInCooldown(state)) {
      const remaining = Math.ceil((state.cooldownUntil! - Date.now()) / 1000);
      throw new RateLimitError(
        `Client in cooldown for ${remaining} more seconds`,
        RateLimitErrorCodes.IN_COOLDOWN,
        remaining
      );
    }

    // Refill tokens based on time elapsed
    this.refillTokens(state);

    // Check if enough tokens available
    if (state.tokens < 1) {
      const waitTime = Math.ceil((1 - state.tokens) / this.tokensPerSecond);
      throw new RateLimitError(
        `Rate limit exceeded. Try again in ${waitTime} seconds`,
        RateLimitErrorCodes.RATE_LIMIT_EXCEEDED,
        waitTime
      );
    }

    // Consume a token
    state.tokens -= 1;
    state.totalRequests += 1;
  }

  /**
   * Acquire a slot for a concurrent request
   *
   * Returns a token that MUST be released when the request completes.
   * Also checks rate limit before acquiring.
   *
   * @param clientId - Unique client identifier
   * @returns Token to be used with release()
   * @throws RateLimitError if limits exceeded
   */
  async acquire(clientId: string): Promise<string> {
    // First check rate limit
    await this.checkLimit(clientId);

    const state = this.getOrCreateClientState(clientId);

    // Check concurrent limit
    if (state.concurrent.size >= this.config.maxConcurrent) {
      throw new RateLimitError(
        `Concurrent limit of ${this.config.maxConcurrent} exceeded`,
        RateLimitErrorCodes.CONCURRENT_LIMIT_EXCEEDED
      );
    }

    // Create unique token for this request
    const token = randomUUID();
    state.concurrent.add(token);

    return token;
  }

  /**
   * Release a concurrent request slot
   *
   * @param token - Token returned from acquire()
   */
  release(token: string): void {
    // Find and remove token from any client's concurrent set
    for (const state of this.clients.values()) {
      if (state.concurrent.has(token)) {
        state.concurrent.delete(token);
        return;
      }
    }

    // Token not found - silently ignore (already released or invalid)
  }

  /**
   * Record an error for a client
   *
   * Puts the client into cooldown for the configured period.
   *
   * @param clientId - Unique client identifier
   */
  recordError(clientId: string): void {
    const state = this.getOrCreateClientState(clientId);
    state.cooldownUntil = Date.now() + this.config.cooldownSeconds * 1000;
  }

  /**
   * Reset a client's state
   *
   * Clears tokens, concurrent requests, and cooldown.
   *
   * @param clientId - Unique client identifier
   */
  reset(clientId: string): void {
    this.clients.delete(clientId);
  }

  /**
   * Reset all clients' state
   */
  resetAll(): void {
    this.clients.clear();
  }

  /**
   * Get statistics for a specific client
   *
   * @param clientId - Unique client identifier
   * @returns Client statistics
   */
  getStats(clientId: string): ClientStats {
    const state = this.getOrCreateClientState(clientId);
    this.refillTokens(state); // Update tokens before reporting

    const inCooldown = this.isInCooldown(state);
    const cooldownRemaining = inCooldown
      ? Math.ceil((state.cooldownUntil! - Date.now()) / 1000)
      : undefined;

    return {
      tokensRemaining: Math.floor(state.tokens * 10) / 10, // Round to 1 decimal
      concurrentActive: state.concurrent.size,
      inCooldown,
      cooldownRemaining,
      totalRequests: state.totalRequests,
    };
  }

  /**
   * Get global statistics across all clients
   *
   * @returns Global statistics
   */
  getGlobalStats(): GlobalStats {
    let totalRequests = 0;
    let clientsInCooldown = 0;

    for (const state of this.clients.values()) {
      totalRequests += state.totalRequests;
      if (this.isInCooldown(state)) {
        clientsInCooldown++;
      }
    }

    return {
      totalClients: this.clients.size,
      totalRequests,
      clientsInCooldown,
    };
  }

  /**
   * Validate configuration values
   *
   * @throws Error if configuration is invalid
   */
  private validateConfig(): void {
    if (this.config.requestsPerMinute <= 0) {
      throw new Error("requestsPerMinute must be greater than 0");
    }

    if (this.config.maxConcurrent <= 0) {
      throw new Error("maxConcurrent must be greater than 0");
    }

    if (this.config.cooldownSeconds < 0) {
      throw new Error("cooldownSeconds must be non-negative");
    }
  }

  /**
   * Get or create client state
   *
   * @param clientId - Unique client identifier
   * @returns Client state
   */
  private getOrCreateClientState(clientId: string): ClientState {
    let state = this.clients.get(clientId);

    if (!state) {
      state = {
        tokens: this.config.requestsPerMinute,
        lastRefill: Date.now(),
        concurrent: new Set(),
        totalRequests: 0,
      };
      this.clients.set(clientId, state);
    }

    return state;
  }

  /**
   * Refill tokens based on elapsed time
   *
   * Uses fractional tokens to ensure smooth rate limiting.
   *
   * @param state - Client state to refill
   */
  private refillTokens(state: ClientState): void {
    const now = Date.now();
    const elapsed = (now - state.lastRefill) / 1000; // seconds
    const tokensToAdd = elapsed * this.tokensPerSecond;

    // Add tokens (up to max capacity)
    state.tokens = Math.min(
      this.config.requestsPerMinute,
      state.tokens + tokensToAdd
    );

    state.lastRefill = now;
  }

  /**
   * Check if client is in cooldown
   *
   * @param state - Client state to check
   * @returns True if in cooldown
   */
  private isInCooldown(state: ClientState): boolean {
    if (!state.cooldownUntil) {
      return false;
    }

    // Check if cooldown has expired
    if (Date.now() >= state.cooldownUntil) {
      delete state.cooldownUntil;
      return false;
    }

    return true;
  }
}
