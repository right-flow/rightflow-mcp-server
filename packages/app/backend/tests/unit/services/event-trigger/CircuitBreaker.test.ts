/**
 * Unit Tests for Circuit Breaker
 * Tests state transitions (closed -> open -> half-open -> closed)
 * and fault tolerance behavior
 *
 * Coverage target: 95%+
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CircuitBreaker } from '../../../../src/services/event-trigger/CircuitBreaker';

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker;

  beforeEach(() => {
    vi.useFakeTimers();
    circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 60000, // 1 minute
      resetTimeout: 30000 // 30 seconds
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('State: CLOSED', () => {
    it('should start in CLOSED state', () => {
      expect(circuitBreaker.getState()).toBe('closed');
    });

    it('should execute function successfully when closed', async () => {
      const mockFn = vi.fn().mockResolvedValue('success');

      const result = await circuitBreaker.execute(mockFn);

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should track failures without opening circuit (< threshold)', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('Failure'));

      for (let i = 0; i < 4; i++) {
        await expect(circuitBreaker.execute(mockFn)).rejects.toThrow('Failure');
      }

      expect(circuitBreaker.getState()).toBe('closed');
      expect(circuitBreaker.getStats().failures).toBe(4);
    });

    it('should open circuit after reaching failure threshold (5)', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('Failure'));

      for (let i = 0; i < 5; i++) {
        await expect(circuitBreaker.execute(mockFn)).rejects.toThrow('Failure');
      }

      expect(circuitBreaker.getState()).toBe('open');
    });

    it('should reset failure count after successful execution', async () => {
      const mockFn = vi
        .fn()
        .mockRejectedValueOnce(new Error('Failure'))
        .mockResolvedValueOnce('success');

      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow();
      await circuitBreaker.execute(mockFn);

      expect(circuitBreaker.getStats().failures).toBe(0);
      expect(circuitBreaker.getState()).toBe('closed');
    });
  });

  describe('State: OPEN', () => {
    beforeEach(async () => {
      // Force circuit to open
      const mockFn = vi.fn().mockRejectedValue(new Error('Failure'));
      for (let i = 0; i < 5; i++) {
        await expect(circuitBreaker.execute(mockFn)).rejects.toThrow();
      }
      expect(circuitBreaker.getState()).toBe('open');
    });

    it('should reject calls immediately when open', async () => {
      const mockFn = vi.fn().mockResolvedValue('success');

      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow(
        'Circuit breaker is OPEN'
      );

      expect(mockFn).not.toHaveBeenCalled();
    });

    it('should transition to HALF_OPEN after reset timeout', async () => {
      expect(circuitBreaker.getState()).toBe('open');

      // Fast-forward time by 30 seconds (reset timeout)
      vi.advanceTimersByTime(30000);

      const mockFn = vi.fn().mockResolvedValue('success');
      await circuitBreaker.execute(mockFn);

      expect(circuitBreaker.getState()).toBe('half_open');
    });

    it('should not transition to HALF_OPEN before reset timeout', async () => {
      expect(circuitBreaker.getState()).toBe('open');

      // Fast-forward time by only 15 seconds (< 30s reset timeout)
      vi.advanceTimersByTime(15000);

      const mockFn = vi.fn().mockResolvedValue('success');

      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow(
        'Circuit breaker is OPEN'
      );

      expect(circuitBreaker.getState()).toBe('open');
    });

    it('should track open circuit duration', async () => {
      const openTime = Date.now();

      vi.advanceTimersByTime(10000);

      const stats = circuitBreaker.getStats();
      expect(stats.state).toBe('open');
      expect(stats.lastStateChange).toBeDefined();
    });
  });

  describe('State: HALF_OPEN', () => {
    beforeEach(async () => {
      // Force circuit to open
      const mockFn = vi.fn().mockRejectedValue(new Error('Failure'));
      for (let i = 0; i < 5; i++) {
        await expect(circuitBreaker.execute(mockFn)).rejects.toThrow();
      }

      // Transition to half-open
      vi.advanceTimersByTime(30000);
    });

    it('should allow limited test requests when half-open', async () => {
      const mockFn = vi.fn().mockResolvedValue('success');

      await circuitBreaker.execute(mockFn);

      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(circuitBreaker.getState()).toBe('half_open');
    });

    it('should close circuit after success threshold (2) successes', async () => {
      const mockFn = vi.fn().mockResolvedValue('success');

      await circuitBreaker.execute(mockFn);
      await circuitBreaker.execute(mockFn);

      expect(circuitBreaker.getState()).toBe('closed');
      expect(circuitBreaker.getStats().failures).toBe(0);
    });

    it('should reopen circuit on first failure in half-open state', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('Still failing'));

      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow('Still failing');

      expect(circuitBreaker.getState()).toBe('open');
    });

    it('should track consecutive successes in half-open state', async () => {
      const mockFn = vi.fn().mockResolvedValue('success');

      await circuitBreaker.execute(mockFn);

      const stats = circuitBreaker.getStats();
      expect(stats.consecutiveSuccesses).toBe(1);
    });
  });

  describe('Timeout Handling', () => {
    it('should timeout long-running operations (60s)', async () => {
      const mockFn = vi.fn(
        () =>
          new Promise(resolve => {
            setTimeout(() => resolve('too slow'), 70000);
          })
      );

      const promise = circuitBreaker.execute(mockFn);

      vi.advanceTimersByTime(60000);

      await expect(promise).rejects.toThrow('Operation timed out after 60000ms');
    });

    it('should count timeout as failure', async () => {
      const mockFn = vi.fn(
        () =>
          new Promise(resolve => {
            setTimeout(() => resolve('too slow'), 70000);
          })
      );

      const promise = circuitBreaker.execute(mockFn);
      vi.advanceTimersByTime(60000);

      await expect(promise).rejects.toThrow();

      expect(circuitBreaker.getStats().failures).toBe(1);
    });

    it('should not timeout if operation completes in time', async () => {
      const mockFn = vi.fn(
        () =>
          new Promise(resolve => {
            setTimeout(() => resolve('fast enough'), 1000);
          })
      );

      const promise = circuitBreaker.execute(mockFn);

      vi.advanceTimersByTime(1000);

      await expect(promise).resolves.toBe('fast enough');
    });
  });

  describe('Error Classification', () => {
    it('should treat network errors as failures', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));

      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow();

      expect(circuitBreaker.getStats().failures).toBe(1);
    });

    it('should treat 5xx errors as failures', async () => {
      const error = new Error('Internal Server Error');
      (error as any).statusCode = 500;
      const mockFn = vi.fn().mockRejectedValue(error);

      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow();

      expect(circuitBreaker.getStats().failures).toBe(1);
    });

    it('should NOT treat 4xx errors as failures (client errors)', async () => {
      const error = new Error('Bad Request');
      (error as any).statusCode = 400;
      const mockFn = vi.fn().mockRejectedValue(error);

      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow();

      expect(circuitBreaker.getStats().failures).toBe(0);
    });

    it('should NOT treat validation errors as failures', async () => {
      const error = new Error('Validation failed');
      (error as any).isValidationError = true;
      const mockFn = vi.fn().mockRejectedValue(error);

      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow();

      expect(circuitBreaker.getStats().failures).toBe(0);
    });
  });

  describe('Manual Control', () => {
    it('should manually open circuit', () => {
      circuitBreaker.open();

      expect(circuitBreaker.getState()).toBe('open');
    });

    it('should manually close circuit', async () => {
      // First open the circuit
      const mockFn = vi.fn().mockRejectedValue(new Error('Failure'));
      for (let i = 0; i < 5; i++) {
        await expect(circuitBreaker.execute(mockFn)).rejects.toThrow();
      }

      // Manually close
      circuitBreaker.close();

      expect(circuitBreaker.getState()).toBe('closed');
      expect(circuitBreaker.getStats().failures).toBe(0);
    });

    it('should reset circuit breaker state', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('Failure'));
      for (let i = 0; i < 3; i++) {
        await expect(circuitBreaker.execute(mockFn)).rejects.toThrow();
      }

      circuitBreaker.reset();

      expect(circuitBreaker.getState()).toBe('closed');
      expect(circuitBreaker.getStats().failures).toBe(0);
      expect(circuitBreaker.getStats().totalRequests).toBe(0);
    });
  });

  describe('Statistics & Monitoring', () => {
    it('should track total requests', async () => {
      const mockFn = vi
        .fn()
        .mockResolvedValueOnce('success')
        .mockRejectedValueOnce(new Error('Failure'))
        .mockResolvedValueOnce('success');

      await circuitBreaker.execute(mockFn);
      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow();
      await circuitBreaker.execute(mockFn);

      expect(circuitBreaker.getStats().totalRequests).toBe(3);
    });

    it('should track success count', async () => {
      const mockFn = vi.fn().mockResolvedValue('success');

      await circuitBreaker.execute(mockFn);
      await circuitBreaker.execute(mockFn);

      expect(circuitBreaker.getStats().successes).toBe(2);
    });

    it('should track failure count', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('Failure'));

      for (let i = 0; i < 3; i++) {
        await expect(circuitBreaker.execute(mockFn)).rejects.toThrow();
      }

      expect(circuitBreaker.getStats().failures).toBe(3);
    });

    it('should calculate success rate', async () => {
      const mockFn = vi
        .fn()
        .mockResolvedValueOnce('success')
        .mockResolvedValueOnce('success')
        .mockRejectedValueOnce(new Error('Failure'));

      await circuitBreaker.execute(mockFn);
      await circuitBreaker.execute(mockFn);
      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow();

      const stats = circuitBreaker.getStats();
      expect(stats.successRate).toBeCloseTo(0.667, 2); // 2/3 = 66.7%
    });

    it('should track last state change timestamp', async () => {
      const beforeOpen = Date.now();

      const mockFn = vi.fn().mockRejectedValue(new Error('Failure'));
      for (let i = 0; i < 5; i++) {
        await expect(circuitBreaker.execute(mockFn)).rejects.toThrow();
      }

      const stats = circuitBreaker.getStats();
      expect(stats.lastStateChange).toBeGreaterThanOrEqual(beforeOpen);
    });
  });

  describe('Configuration', () => {
    it('should use custom failure threshold', async () => {
      circuitBreaker = new CircuitBreaker({
        failureThreshold: 3,
        successThreshold: 2,
        timeout: 60000,
        resetTimeout: 30000
      });

      const mockFn = vi.fn().mockRejectedValue(new Error('Failure'));

      for (let i = 0; i < 3; i++) {
        await expect(circuitBreaker.execute(mockFn)).rejects.toThrow();
      }

      expect(circuitBreaker.getState()).toBe('open');
    });

    it('should use custom success threshold', async () => {
      circuitBreaker = new CircuitBreaker({
        failureThreshold: 5,
        successThreshold: 3,
        timeout: 60000,
        resetTimeout: 30000
      });

      // Open circuit
      const failFn = vi.fn().mockRejectedValue(new Error('Failure'));
      for (let i = 0; i < 5; i++) {
        await expect(circuitBreaker.execute(failFn)).rejects.toThrow();
      }

      // Transition to half-open
      vi.advanceTimersByTime(30000);

      // Need 3 successes to close
      const successFn = vi.fn().mockResolvedValue('success');
      await circuitBreaker.execute(successFn);
      await circuitBreaker.execute(successFn);

      expect(circuitBreaker.getState()).toBe('half_open');

      await circuitBreaker.execute(successFn);

      expect(circuitBreaker.getState()).toBe('closed');
    });

    it('should use custom timeout', async () => {
      circuitBreaker = new CircuitBreaker({
        failureThreshold: 5,
        successThreshold: 2,
        timeout: 5000, // 5 seconds
        resetTimeout: 30000
      });

      const mockFn = vi.fn(
        () =>
          new Promise(resolve => {
            setTimeout(() => resolve('too slow'), 10000);
          })
      );

      const promise = circuitBreaker.execute(mockFn);

      vi.advanceTimersByTime(5000);

      await expect(promise).rejects.toThrow('Operation timed out after 5000ms');
    });

    it('should use custom reset timeout', async () => {
      circuitBreaker = new CircuitBreaker({
        failureThreshold: 5,
        successThreshold: 2,
        timeout: 60000,
        resetTimeout: 10000 // 10 seconds
      });

      // Open circuit
      const failFn = vi.fn().mockRejectedValue(new Error('Failure'));
      for (let i = 0; i < 5; i++) {
        await expect(circuitBreaker.execute(failFn)).rejects.toThrow();
      }

      // Should stay open for 9 seconds
      vi.advanceTimersByTime(9000);
      await expect(circuitBreaker.execute(failFn)).rejects.toThrow(
        'Circuit breaker is OPEN'
      );

      // Should transition to half-open after 10 seconds
      vi.advanceTimersByTime(1000);
      const successFn = vi.fn().mockResolvedValue('success');
      await circuitBreaker.execute(successFn);

      expect(circuitBreaker.getState()).toBe('half_open');
    });
  });

  describe('Concurrency', () => {
    it('should handle concurrent executions', async () => {
      const mockFn = vi.fn().mockResolvedValue('success');

      const promises = Array.from({ length: 10 }, () => circuitBreaker.execute(mockFn));

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      expect(results.every(r => r === 'success')).toBe(true);
      expect(circuitBreaker.getStats().totalRequests).toBe(10);
    });

    it('should handle concurrent failures correctly', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('Failure'));

      const promises = Array.from({ length: 5 }, () =>
        circuitBreaker.execute(mockFn).catch(e => e)
      );

      await Promise.all(promises);

      expect(circuitBreaker.getState()).toBe('open');
    });

    it('should prevent race conditions in state transitions', async () => {
      // Open circuit
      const failFn = vi.fn().mockRejectedValue(new Error('Failure'));
      for (let i = 0; i < 5; i++) {
        await expect(circuitBreaker.execute(failFn)).rejects.toThrow();
      }

      // Transition to half-open
      vi.advanceTimersByTime(30000);

      // Execute concurrent requests in half-open state
      const successFn = vi.fn().mockResolvedValue('success');
      const promises = Array.from({ length: 3 }, () =>
        circuitBreaker.execute(successFn)
      );

      await Promise.all(promises);

      // Should close after 2 successes (success threshold)
      expect(circuitBreaker.getState()).toBe('closed');
    });
  });
});
