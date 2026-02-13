/**
 * useApiWithRetry Hook
 * Created: 2026-02-12
 * Purpose: Provides retry logic for API calls with exponential backoff
 *
 * Features:
 * - Configurable retry count and delay
 * - Exponential backoff with jitter
 * - Automatic retry on network errors and 5xx responses
 * - No retry on 4xx client errors (except 429 rate limit)
 * - Cancellation support via AbortController
 */

import { useCallback, useRef, useMemo } from 'react';
import { useAuth } from '@clerk/clerk-react';

interface RetryConfig {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  retryOn5xx?: boolean;
  retryOnNetworkError?: boolean;
}

interface FetchOptions extends RequestInit {
  skipAuth?: boolean;
}

interface UseApiWithRetryReturn {
  fetchWithRetry: <T>(url: string, options?: FetchOptions) => Promise<T>;
  abortAll: () => void;
}

const DEFAULT_CONFIG: Required<RetryConfig> = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  retryOn5xx: true,
  retryOnNetworkError: true,
};

/**
 * Calculate delay with exponential backoff and jitter
 * @param attempt - Current attempt number (0-indexed)
 * @param baseDelay - Base delay in milliseconds
 * @param maxDelay - Maximum delay cap
 */
function calculateDelay(attempt: number, baseDelay: number, maxDelay: number): number {
  // Exponential backoff: baseDelay * 2^attempt
  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  // Add jitter (±25%) to prevent thundering herd
  const jitter = exponentialDelay * 0.25 * (Math.random() * 2 - 1);
  const delay = exponentialDelay + jitter;
  return Math.min(delay, maxDelay);
}

/**
 * Determine if we should retry based on error type
 */
function shouldRetry(
  error: unknown,
  response: Response | null,
  config: Required<RetryConfig>
): boolean {
  // Network error (fetch failed)
  if (!response && config.retryOnNetworkError) {
    return true;
  }

  if (response) {
    // Rate limited - always retry
    if (response.status === 429) {
      return true;
    }

    // Server errors (5xx)
    if (response.status >= 500 && config.retryOn5xx) {
      return true;
    }

    // Client errors (4xx except 429) - don't retry
    if (response.status >= 400 && response.status < 500) {
      return false;
    }
  }

  return false;
}

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Hook that provides API fetch with automatic retry logic
 *
 * @example
 * ```tsx
 * const { fetchWithRetry } = useApiWithRetry({ maxRetries: 3 });
 *
 * const loadData = async () => {
 *   try {
 *     const data = await fetchWithRetry<MyData>('/api/v1/data');
 *     setData(data);
 *   } catch (error) {
 *     setError('Failed to load data');
 *   }
 * };
 * ```
 */
export function useApiWithRetry(config: RetryConfig = {}): UseApiWithRetryReturn {
  const { getToken } = useAuth();
  const abortControllerRef = useRef<AbortController | null>(null);

  // Memoize config to prevent infinite loops - only recalculate if config values change
  const mergedConfig = useMemo<Required<RetryConfig>>(() => ({
    ...DEFAULT_CONFIG,
    ...config,
  }), [
    config.maxRetries,
    config.baseDelayMs,
    config.maxDelayMs,
    config.retryOn5xx,
    config.retryOnNetworkError,
  ]);

  const fetchWithRetry = useCallback(
    async <T>(url: string, options: FetchOptions = {}): Promise<T> => {
      // Create new abort controller for this request chain
      abortControllerRef.current = new AbortController();
      const { signal } = abortControllerRef.current;

      const { skipAuth = false, ...fetchOptions } = options;

      let lastError: unknown = null;
      let lastResponse: Response | null = null;

      for (let attempt = 0; attempt <= mergedConfig.maxRetries; attempt++) {
        try {
          // Check if aborted
          if (signal.aborted) {
            throw new DOMException('Aborted', 'AbortError');
          }

          // Get fresh token for each attempt (tokens may expire)
          const headers: HeadersInit = {
            'Content-Type': 'application/json',
            ...fetchOptions.headers,
          };

          if (!skipAuth) {
            const token = await getToken();
            if (token) {
              (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
            }
          }

          const response = await fetch(url, {
            ...fetchOptions,
            headers,
            signal,
          });

          lastResponse = response;

          if (response.ok) {
            // Check if response has content
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
              return await response.json();
            }
            // Return empty object for non-JSON responses
            return {} as T;
          }

          // Response not ok - check if we should retry
          if (attempt < mergedConfig.maxRetries && shouldRetry(null, response, mergedConfig)) {
            const delay = calculateDelay(attempt, mergedConfig.baseDelayMs, mergedConfig.maxDelayMs);
            console.warn(`API call to ${url} failed with ${response.status}, retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${mergedConfig.maxRetries})`);
            await sleep(delay);
            continue;
          }

          // No more retries or shouldn't retry - throw error
          const errorText = await response.text().catch(() => 'Unknown error');
          throw new Error(`HTTP ${response.status}: ${errorText}`);

        } catch (error) {
          lastError = error;

          // Don't retry on abort
          if (error instanceof DOMException && error.name === 'AbortError') {
            throw error;
          }

          // Check if we should retry on network error
          if (attempt < mergedConfig.maxRetries && shouldRetry(error, lastResponse, mergedConfig)) {
            const delay = calculateDelay(attempt, mergedConfig.baseDelayMs, mergedConfig.maxDelayMs);
            console.warn(`API call to ${url} failed with network error, retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${mergedConfig.maxRetries})`);
            await sleep(delay);
            continue;
          }

          // No more retries - throw the error
          throw error;
        }
      }

      // Should not reach here, but throw last error if we do
      throw lastError || new Error('Unknown error during fetch');
    },
    [getToken, mergedConfig]
  );

  const abortAll = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  return {
    fetchWithRetry,
    abortAll,
  };
}

/**
 * Standalone fetch with retry (for use outside of React components)
 * Does not include authentication - caller must provide Authorization header
 */
export async function fetchWithRetryStandalone<T>(
  url: string,
  options: RequestInit = {},
  config: RetryConfig = {}
): Promise<T> {
  const mergedConfig: Required<RetryConfig> = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  let lastError: unknown = null;
  let lastResponse: Response | null = null;

  for (let attempt = 0; attempt <= mergedConfig.maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      lastResponse = response;

      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          return await response.json();
        }
        return {} as T;
      }

      if (attempt < mergedConfig.maxRetries && shouldRetry(null, response, mergedConfig)) {
        const delay = calculateDelay(attempt, mergedConfig.baseDelayMs, mergedConfig.maxDelayMs);
        await sleep(delay);
        continue;
      }

      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`HTTP ${response.status}: ${errorText}`);

    } catch (error) {
      lastError = error;

      if (attempt < mergedConfig.maxRetries && shouldRetry(error, lastResponse, mergedConfig)) {
        const delay = calculateDelay(attempt, mergedConfig.baseDelayMs, mergedConfig.maxDelayMs);
        await sleep(delay);
        continue;
      }

      throw error;
    }
  }

  throw lastError || new Error('Unknown error during fetch');
}
