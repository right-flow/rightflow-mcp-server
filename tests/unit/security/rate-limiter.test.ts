/**
 * Rate Limiter - Security Tests
 *
 * TDD Stage 1 (RED): Write failing tests
 * Status: Tests written, implementation pending
 *
 * TDD Workflow:
 * 1. RED: Run this test - it should FAIL (no implementation yet)
 * 2. GREEN: Implement RateLimiter to make tests pass
 * 3. REFACTOR: Improve implementation quality
 * 4. QA: Run `npm run qa:stage2`
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  RateLimiter,
  RateLimitError,
} from "../../../src/security/rateLimiter.js";

describe("RateLimiter", () => {
  beforeEach(() => {
    // Reset time mocks before each test
    vi.useRealTimers();
  });

  describe("Constructor", () => {
    it("should create with default config", () => {
      const limiter = new RateLimiter();
      expect(limiter).toBeDefined();
    });

    it("should create with custom config", () => {
      const limiter = new RateLimiter({
        requestsPerMinute: 10,
        maxConcurrent: 5,
        cooldownSeconds: 10,
      });
      expect(limiter).toBeDefined();
    });

    it("should reject invalid config", () => {
      expect(() => new RateLimiter({ requestsPerMinute: 0 })).toThrow();
      expect(() => new RateLimiter({ requestsPerMinute: -1 })).toThrow();
      expect(() => new RateLimiter({ maxConcurrent: 0 })).toThrow();
      expect(() => new RateLimiter({ cooldownSeconds: -1 })).toThrow();
    });
  });

  describe("Token Bucket Algorithm", () => {
    it("should allow requests within rate limit", async () => {
      const limiter = new RateLimiter({ requestsPerMinute: 60 }); // 1 per second

      await expect(limiter.checkLimit("client1")).resolves.toBeUndefined();
      await expect(limiter.checkLimit("client1")).resolves.toBeUndefined();
    });

    it("should block requests exceeding rate limit", async () => {
      const limiter = new RateLimiter({ requestsPerMinute: 2 }); // Very low limit

      // First 2 requests should pass
      await limiter.checkLimit("client1");
      await limiter.checkLimit("client1");

      // 3rd request should fail
      await expect(limiter.checkLimit("client1")).rejects.toThrow(RateLimitError);
    });

    it("should refill tokens over time", async () => {
      vi.useFakeTimers();
      const limiter = new RateLimiter({ requestsPerMinute: 60 }); // 1 per second

      // Use up tokens
      await limiter.checkLimit("client1");
      await limiter.checkLimit("client1");

      // Advance time to refill tokens
      vi.advanceTimersByTime(2000); // 2 seconds = 2 tokens

      // Should allow more requests
      await expect(limiter.checkLimit("client1")).resolves.toBeUndefined();

      vi.useRealTimers();
    });

    it("should handle fractional token refills", async () => {
      vi.useFakeTimers();
      const limiter = new RateLimiter({ requestsPerMinute: 60 }); // 1 per second

      // Consume all 60 tokens to drain the bucket
      for (let i = 0; i < 60; i++) {
        await limiter.checkLimit("client1");
      }

      // Now client has 0 tokens
      // Advance time by half a second (0.5 tokens)
      vi.advanceTimersByTime(500);

      // Should still block (not enough tokens: 0.5 < 1)
      await expect(limiter.checkLimit("client1")).rejects.toThrow(RateLimitError);

      // Advance another half second (now 1 full token: 0.5 + 0.5 = 1)
      vi.advanceTimersByTime(500);

      // Should allow (exactly 1 token available)
      await expect(limiter.checkLimit("client1")).resolves.toBeUndefined();

      vi.useRealTimers();
    });
  });

  describe("Concurrency Limits", () => {
    it("should track concurrent requests", async () => {
      const limiter = new RateLimiter({ maxConcurrent: 2 });

      // Start 2 concurrent requests
      const promise1 = limiter.acquire("client1");
      const promise2 = limiter.acquire("client1");

      await promise1;
      await promise2;

      // 3rd concurrent request should fail
      await expect(limiter.acquire("client1")).rejects.toThrow(RateLimitError);
    });

    it("should release concurrent slots", async () => {
      const limiter = new RateLimiter({ maxConcurrent: 2 });

      // Acquire and release
      const token1 = await limiter.acquire("client1");
      const token2 = await limiter.acquire("client1");

      limiter.release(token1);
      limiter.release(token2);

      // Should be able to acquire again
      await expect(limiter.acquire("client1")).resolves.toBeDefined();
    });

    it("should handle release of invalid tokens", () => {
      const limiter = new RateLimiter();

      // Releasing invalid token should not crash
      expect(() => limiter.release("invalid-token")).not.toThrow();
    });
  });

  describe("Per-Client Isolation", () => {
    it("should track limits separately per client", async () => {
      const limiter = new RateLimiter({ requestsPerMinute: 2 });

      // Client 1 uses up their limit
      await limiter.checkLimit("client1");
      await limiter.checkLimit("client1");

      // Client 2 should still have their limit available
      await expect(limiter.checkLimit("client2")).resolves.toBeUndefined();
    });

    it("should track concurrency separately per client", async () => {
      const limiter = new RateLimiter({ maxConcurrent: 1 });

      // Client 1 acquires
      await limiter.acquire("client1");

      // Client 2 should still be able to acquire
      await expect(limiter.acquire("client2")).resolves.toBeDefined();
    });
  });

  describe("Cooldown After Errors", () => {
    it("should enter cooldown after error", async () => {
      const limiter = new RateLimiter({ cooldownSeconds: 2 });

      // Trigger an error (rate limit exceeded)
      try {
        await limiter.checkLimit("client1");
        await limiter.checkLimit("client1");
        await limiter.checkLimit("client1"); // This will fail
      } catch {
        // Expected error
      }

      // Mark as error
      limiter.recordError("client1");

      // Immediate request should fail (in cooldown)
      await expect(limiter.checkLimit("client1")).rejects.toThrow(RateLimitError);
    });

    it("should exit cooldown after timeout", async () => {
      vi.useFakeTimers();
      const limiter = new RateLimiter({ cooldownSeconds: 2 });

      limiter.recordError("client1");

      // Advance time past cooldown
      vi.advanceTimersByTime(2500);

      // Should allow requests again
      await expect(limiter.checkLimit("client1")).resolves.toBeUndefined();

      vi.useRealTimers();
    });
  });

  describe("Reset Functionality", () => {
    it("should reset client state", async () => {
      const limiter = new RateLimiter({ requestsPerMinute: 2 });

      // Use up tokens
      await limiter.checkLimit("client1");
      await limiter.checkLimit("client1");

      // Reset
      limiter.reset("client1");

      // Should have full tokens again
      await expect(limiter.checkLimit("client1")).resolves.toBeUndefined();
    });

    it("should reset all clients", async () => {
      const limiter = new RateLimiter({ requestsPerMinute: 2 });

      await limiter.checkLimit("client1");
      await limiter.checkLimit("client2");

      // Reset all
      limiter.resetAll();

      // Both clients should have full tokens
      await expect(limiter.checkLimit("client1")).resolves.toBeUndefined();
      await expect(limiter.checkLimit("client2")).resolves.toBeUndefined();
    });
  });

  describe("Statistics", () => {
    it("should provide client statistics", async () => {
      const limiter = new RateLimiter({ requestsPerMinute: 60, maxConcurrent: 3 });

      await limiter.checkLimit("client1");
      const token = await limiter.acquire("client1");

      const stats = limiter.getStats("client1");

      expect(stats).toHaveProperty("tokensRemaining");
      expect(stats).toHaveProperty("concurrentActive");
      expect(stats).toHaveProperty("inCooldown");
      expect(stats.concurrentActive).toBe(1);
      expect(stats.inCooldown).toBe(false);

      limiter.release(token);
    });

    it("should provide global statistics", () => {
      const limiter = new RateLimiter();

      limiter.checkLimit("client1");
      limiter.checkLimit("client2");

      const globalStats = limiter.getGlobalStats();

      expect(globalStats).toHaveProperty("totalClients");
      expect(globalStats).toHaveProperty("totalRequests");
      expect(globalStats.totalClients).toBeGreaterThanOrEqual(2);
    });
  });

  describe("Error Codes", () => {
    it("should throw error with RATE_LIMIT_EXCEEDED code", async () => {
      const limiter = new RateLimiter({ requestsPerMinute: 1 });

      await limiter.checkLimit("client1");

      try {
        await limiter.checkLimit("client1");
      } catch (error) {
        expect(error).toBeInstanceOf(RateLimitError);
        expect((error as RateLimitError).code).toBe("RATE_LIMIT_EXCEEDED");
      }
    });

    it("should throw error with CONCURRENT_LIMIT_EXCEEDED code", async () => {
      const limiter = new RateLimiter({ maxConcurrent: 1 });

      await limiter.acquire("client1");

      try {
        await limiter.acquire("client1");
      } catch (error) {
        expect(error).toBeInstanceOf(RateLimitError);
        expect((error as RateLimitError).code).toBe("CONCURRENT_LIMIT_EXCEEDED");
      }
    });

    it("should throw error with IN_COOLDOWN code", async () => {
      const limiter = new RateLimiter({ cooldownSeconds: 5 });

      limiter.recordError("client1");

      try {
        await limiter.checkLimit("client1");
      } catch (error) {
        expect(error).toBeInstanceOf(RateLimitError);
        expect((error as RateLimitError).code).toBe("IN_COOLDOWN");
      }
    });
  });
});
