/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascading failures by monitoring failure rates and opening circuit when threshold is exceeded
 *
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Failure threshold exceeded, requests fail immediately
 * - HALF_OPEN: Testing if service recovered, limited requests allowed
 */

import type {
  CircuitBreakerConfig,
  CircuitBreakerState,
  CircuitBreakerStats,
} from '../../types/event-trigger';

export class CircuitBreaker {
  private state: CircuitBreakerState = 'closed';
  private failureCount = 0;
  private successCount = 0;
  private consecutiveSuccesses = 0;
  private lastStateChange: number = Date.now();
  private nextAttemptTime: number = 0;
  private totalRequests = 0;
  private readonly config: CircuitBreakerConfig;

  constructor(config: CircuitBreakerConfig) {
    this.config = config;
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.totalRequests++;

    // Check if circuit is open
    if (this.state === 'open') {
      if (Date.now() < this.nextAttemptTime) {
        throw new Error('Circuit breaker is OPEN');
      }
      // Transition to half-open to test recovery
      this.transitionTo('half_open');
    }

    try {
      // Execute with timeout
      const result = await this.executeWithTimeout(fn);

      // Record success
      this.onSuccess();

      return result;
    } catch (error) {
      // Record failure
      this.onFailure(error as Error);
      throw error;
    }
  }

  /**
   * Execute function with timeout protection
   */
  private async executeWithTimeout<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Operation timed out after ${this.config.timeout}ms`));
      }, this.config.timeout);

      fn()
        .then(result => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * Handle successful execution
   */
  private onSuccess(): void {
    this.failureCount = 0;
    this.successCount++;
    this.consecutiveSuccesses++;

    // If in half-open state and reached success threshold, close circuit
    if (
      this.state === 'half_open' &&
      this.consecutiveSuccesses >= this.config.successThreshold
    ) {
      this.transitionTo('closed');
    }
  }

  /**
   * Handle failed execution
   */
  private onFailure(error: Error): void {
    // Check if this is a retryable error (5xx, network errors)
    if (!this.isRetryableError(error)) {
      // Non-retryable errors (4xx, validation) don't count as failures
      return;
    }

    this.failureCount++;
    this.consecutiveSuccesses = 0;

    // If in half-open state, reopen circuit immediately on failure
    if (this.state === 'half_open') {
      this.transitionTo('open');
      return;
    }

    // If in closed state and reached failure threshold, open circuit
    if (this.state === 'closed' && this.failureCount >= this.config.failureThreshold) {
      this.transitionTo('open');
    }
  }

  /**
   * Determine if error should be retried
   */
  private isRetryableError(error: any): boolean {
    // 4xx errors (client errors) are not retryable
    if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
      return false;
    }

    // Validation errors are not retryable
    if (error.isValidationError) {
      return false;
    }

    // Everything else is retryable (5xx, network errors, timeouts)
    return true;
  }

  /**
   * Transition to new state
   */
  private transitionTo(newState: CircuitBreakerState): void {
    this.state = newState;
    this.lastStateChange = Date.now();

    if (newState === 'open') {
      this.nextAttemptTime = Date.now() + this.config.resetTimeout;
    }

    if (newState === 'closed') {
      this.failureCount = 0;
      this.successCount = 0;
      this.consecutiveSuccesses = 0;
    }
  }

  /**
   * Get current state
   */
  getState(): CircuitBreakerState {
    return this.state;
  }

  /**
   * Get circuit breaker statistics
   */
  getStats(): CircuitBreakerStats {
    const successRate =
      this.totalRequests > 0 ? this.successCount / this.totalRequests : 0;

    return {
      state: this.state,
      failures: this.failureCount,
      successes: this.successCount,
      consecutiveSuccesses: this.consecutiveSuccesses,
      totalRequests: this.totalRequests,
      successRate,
      lastStateChange: this.lastStateChange,
    };
  }

  /**
   * Manually open circuit
   */
  open(): void {
    this.transitionTo('open');
  }

  /**
   * Manually close circuit
   */
  close(): void {
    this.transitionTo('closed');
  }

  /**
   * Reset all statistics
   */
  reset(): void {
    this.state = 'closed';
    this.failureCount = 0;
    this.successCount = 0;
    this.consecutiveSuccesses = 0;
    this.totalRequests = 0;
    this.lastStateChange = Date.now();
    this.nextAttemptTime = 0;
  }
}
