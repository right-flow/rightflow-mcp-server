/**
 * Memory Manager - Security Tests
 *
 * TDD Stage 1 (RED): Write failing tests
 * Status: Tests written, implementation pending
 *
 * TDD Workflow:
 * 1. RED: Run this test - it should FAIL (no implementation yet)
 * 2. GREEN: Implement MemoryManager to make tests pass
 * 3. REFACTOR: Improve implementation quality
 * 4. QA: Run `npm run qa:stage2`
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  MemoryManager,
  MemoryLimitError,
} from "../../../src/security/memoryManager.js";

describe("MemoryManager", () => {
  beforeEach(() => {
    // Reset any global state before each test
    vi.clearAllMocks();
  });

  describe("Constructor", () => {
    it("should create with default config", () => {
      const manager = new MemoryManager();
      expect(manager).toBeDefined();
    });

    it("should create with custom config", () => {
      const manager = new MemoryManager({
        maxPerDocument: 50 * 1024 * 1024, // 50MB
        maxTotal: 200 * 1024 * 1024, // 200MB
        maxBatchSize: 25,
      });
      expect(manager).toBeDefined();
    });

    it("should reject invalid config - zero maxPerDocument", () => {
      expect(() => new MemoryManager({ maxPerDocument: 0 })).toThrow(
        "maxPerDocument must be greater than 0"
      );
    });

    it("should reject invalid config - negative maxTotal", () => {
      expect(() => new MemoryManager({ maxTotal: -1 })).toThrow(
        "maxTotal must be greater than 0"
      );
    });

    it("should reject invalid config - zero maxBatchSize", () => {
      expect(() => new MemoryManager({ maxBatchSize: 0 })).toThrow(
        "maxBatchSize must be greater than 0"
      );
    });
  });

  describe("Memory Allocation Tracking", () => {
    it("should allocate memory within limits", () => {
      const manager = new MemoryManager();
      const token = manager.allocate("client1", 10 * 1024 * 1024); // 10MB
      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
    });

    it("should track multiple allocations", () => {
      const manager = new MemoryManager();
      const token1 = manager.allocate("client1", 10 * 1024 * 1024);
      const token2 = manager.allocate("client1", 20 * 1024 * 1024);
      expect(token1).toBeDefined();
      expect(token2).toBeDefined();
      expect(token1).not.toBe(token2);
    });

    it("should track allocations per client separately", () => {
      const manager = new MemoryManager();
      const token1 = manager.allocate("client1", 50 * 1024 * 1024);
      const token2 = manager.allocate("client2", 50 * 1024 * 1024);
      expect(token1).toBeDefined();
      expect(token2).toBeDefined();
    });
  });

  describe("Per-Document Memory Limits", () => {
    it("should reject allocation exceeding per-document limit", () => {
      const manager = new MemoryManager({ maxPerDocument: 100 * 1024 * 1024 });

      expect(() =>
        manager.allocate("client1", 150 * 1024 * 1024)
      ).toThrow(MemoryLimitError);
    });

    it("should provide error code for per-document limit violation", () => {
      const manager = new MemoryManager({ maxPerDocument: 100 * 1024 * 1024 });

      try {
        manager.allocate("client1", 150 * 1024 * 1024);
        expect.fail("Should have thrown MemoryLimitError");
      } catch (error) {
        expect(error).toBeInstanceOf(MemoryLimitError);
        expect((error as MemoryLimitError).code).toBe("PER_DOCUMENT_LIMIT_EXCEEDED");
      }
    });

    it("should allow allocation exactly at per-document limit", () => {
      const manager = new MemoryManager({ maxPerDocument: 100 * 1024 * 1024 });
      const token = manager.allocate("client1", 100 * 1024 * 1024);
      expect(token).toBeDefined();
    });
  });

  describe("Total Memory Limits", () => {
    it("should reject allocation exceeding total memory limit", () => {
      const manager = new MemoryManager({
        maxPerDocument: 200 * 1024 * 1024, // 200MB per doc
        maxTotal: 200 * 1024 * 1024, // 200MB total
      });

      // Allocate 150MB
      manager.allocate("client1", 150 * 1024 * 1024);

      // Try to allocate another 100MB (would exceed 200MB total)
      expect(() =>
        manager.allocate("client2", 100 * 1024 * 1024)
      ).toThrow(MemoryLimitError);
    });

    it("should provide error code for total limit violation", () => {
      const manager = new MemoryManager({
        maxPerDocument: 200 * 1024 * 1024, // 200MB per doc
        maxTotal: 200 * 1024 * 1024, // 200MB total
      });
      manager.allocate("client1", 150 * 1024 * 1024);

      try {
        manager.allocate("client2", 100 * 1024 * 1024);
        expect.fail("Should have thrown MemoryLimitError");
      } catch (error) {
        expect(error).toBeInstanceOf(MemoryLimitError);
        expect((error as MemoryLimitError).code).toBe("TOTAL_LIMIT_EXCEEDED");
      }
    });

    it("should allow allocation up to total limit", () => {
      const manager = new MemoryManager({ maxTotal: 200 * 1024 * 1024 });

      const token1 = manager.allocate("client1", 100 * 1024 * 1024);
      const token2 = manager.allocate("client2", 100 * 1024 * 1024);

      expect(token1).toBeDefined();
      expect(token2).toBeDefined();
    });

    it("should allow new allocations after releasing memory", () => {
      const manager = new MemoryManager({
        maxPerDocument: 200 * 1024 * 1024, // 200MB per doc
        maxTotal: 200 * 1024 * 1024, // 200MB total
      });

      const token1 = manager.allocate("client1", 150 * 1024 * 1024);
      manager.release(token1);

      // Should now be able to allocate again
      const token2 = manager.allocate("client2", 150 * 1024 * 1024);
      expect(token2).toBeDefined();
    });
  });

  describe("Batch Size Limits", () => {
    it("should reject batch allocation exceeding batch size limit", () => {
      const manager = new MemoryManager({ maxBatchSize: 50 });

      expect(() =>
        manager.allocateBatch("client1", 60, 1024 * 1024)
      ).toThrow(MemoryLimitError);
    });

    it("should provide error code for batch size violation", () => {
      const manager = new MemoryManager({ maxBatchSize: 50 });

      try {
        manager.allocateBatch("client1", 60, 1024 * 1024);
        expect.fail("Should have thrown MemoryLimitError");
      } catch (error) {
        expect(error).toBeInstanceOf(MemoryLimitError);
        expect((error as MemoryLimitError).code).toBe("BATCH_SIZE_EXCEEDED");
      }
    });

    it("should allow batch allocation within limit", () => {
      const manager = new MemoryManager({ maxBatchSize: 50 });
      const tokens = manager.allocateBatch("client1", 30, 1024 * 1024);
      expect(tokens).toHaveLength(30);
    });

    it("should respect total memory limit for batch allocations", () => {
      const manager = new MemoryManager({
        maxBatchSize: 50,
        maxTotal: 100 * 1024 * 1024,
      });

      // Try to allocate 50 documents of 5MB each (250MB total > 100MB limit)
      expect(() =>
        manager.allocateBatch("client1", 50, 5 * 1024 * 1024)
      ).toThrow(MemoryLimitError);
    });
  });

  describe("Memory Release", () => {
    it("should release memory successfully", () => {
      const manager = new MemoryManager();
      const token = manager.allocate("client1", 50 * 1024 * 1024);

      expect(() => manager.release(token)).not.toThrow();
    });

    it("should allow reuse of released memory", () => {
      const manager = new MemoryManager({ maxTotal: 100 * 1024 * 1024 });

      const token1 = manager.allocate("client1", 80 * 1024 * 1024);
      manager.release(token1);

      // Should now have space for new allocation
      const token2 = manager.allocate("client2", 80 * 1024 * 1024);
      expect(token2).toBeDefined();
    });

    it("should handle releasing invalid token gracefully", () => {
      const manager = new MemoryManager();

      // Should not throw for invalid token (already released or never existed)
      expect(() => manager.release("invalid-token")).not.toThrow();
    });

    it("should release batch allocations", () => {
      const manager = new MemoryManager();
      const tokens = manager.allocateBatch("client1", 10, 5 * 1024 * 1024);

      expect(() => manager.releaseBatch(tokens)).not.toThrow();
    });

    it("should allow reuse after batch release", () => {
      const manager = new MemoryManager({ maxTotal: 100 * 1024 * 1024 });

      const tokens1 = manager.allocateBatch("client1", 10, 8 * 1024 * 1024);
      manager.releaseBatch(tokens1);

      // Should have space for new allocations
      const tokens2 = manager.allocateBatch("client2", 10, 8 * 1024 * 1024);
      expect(tokens2).toHaveLength(10);
    });
  });

  describe("Client Memory Tracking", () => {
    it("should track memory usage per client", () => {
      const manager = new MemoryManager();

      manager.allocate("client1", 30 * 1024 * 1024);
      manager.allocate("client2", 20 * 1024 * 1024);

      const stats1 = manager.getClientStats("client1");
      const stats2 = manager.getClientStats("client2");

      expect(stats1.currentUsage).toBe(30 * 1024 * 1024);
      expect(stats2.currentUsage).toBe(20 * 1024 * 1024);
    });

    it("should track peak memory usage per client", () => {
      const manager = new MemoryManager();

      const token1 = manager.allocate("client1", 50 * 1024 * 1024);
      manager.release(token1);
      manager.allocate("client1", 30 * 1024 * 1024);

      const stats = manager.getClientStats("client1");
      expect(stats.peakUsage).toBe(50 * 1024 * 1024);
      expect(stats.currentUsage).toBe(30 * 1024 * 1024);
    });

    it("should track allocation count per client", () => {
      const manager = new MemoryManager();

      manager.allocate("client1", 10 * 1024 * 1024);
      manager.allocate("client1", 20 * 1024 * 1024);
      manager.allocate("client1", 15 * 1024 * 1024);

      const stats = manager.getClientStats("client1");
      expect(stats.allocationCount).toBe(3);
    });

    it("should reset client memory tracking", () => {
      const manager = new MemoryManager();

      manager.allocate("client1", 50 * 1024 * 1024);
      manager.resetClient("client1");

      const stats = manager.getClientStats("client1");
      expect(stats.currentUsage).toBe(0);
      expect(stats.allocationCount).toBe(0);
    });
  });

  describe("Global Statistics", () => {
    it("should report global memory usage", () => {
      const manager = new MemoryManager();

      manager.allocate("client1", 30 * 1024 * 1024);
      manager.allocate("client2", 20 * 1024 * 1024);

      const stats = manager.getGlobalStats();
      expect(stats.totalUsage).toBe(50 * 1024 * 1024);
    });

    it("should report peak global memory usage", () => {
      const manager = new MemoryManager();

      const token1 = manager.allocate("client1", 80 * 1024 * 1024);
      manager.release(token1);
      manager.allocate("client2", 40 * 1024 * 1024);

      const stats = manager.getGlobalStats();
      expect(stats.peakUsage).toBe(80 * 1024 * 1024);
      expect(stats.totalUsage).toBe(40 * 1024 * 1024);
    });

    it("should report active client count", () => {
      const manager = new MemoryManager();

      manager.allocate("client1", 10 * 1024 * 1024);
      manager.allocate("client2", 10 * 1024 * 1024);
      manager.allocate("client3", 10 * 1024 * 1024);

      const stats = manager.getGlobalStats();
      expect(stats.activeClients).toBe(3);
    });

    it("should report total allocation count", () => {
      const manager = new MemoryManager();

      manager.allocate("client1", 10 * 1024 * 1024);
      manager.allocate("client1", 10 * 1024 * 1024);
      manager.allocate("client2", 10 * 1024 * 1024);

      const stats = manager.getGlobalStats();
      expect(stats.totalAllocations).toBe(3);
    });
  });

  describe("Garbage Collection", () => {
    it("should force garbage collection", () => {
      const manager = new MemoryManager();

      manager.allocate("client1", 50 * 1024 * 1024);

      expect(() => manager.forceGC()).not.toThrow();
    });

    it("should clean up unreleased allocations on reset", () => {
      const manager = new MemoryManager({ maxTotal: 100 * 1024 * 1024 });

      manager.allocate("client1", 80 * 1024 * 1024);
      manager.resetAll();

      // Should be able to allocate again after reset
      const token = manager.allocate("client2", 80 * 1024 * 1024);
      expect(token).toBeDefined();
    });

    it("should report memory available after GC", () => {
      const manager = new MemoryManager({ maxTotal: 100 * 1024 * 1024 });

      const token = manager.allocate("client1", 60 * 1024 * 1024);
      manager.release(token);
      manager.forceGC();

      const stats = manager.getGlobalStats();
      expect(stats.totalUsage).toBe(0);
    });
  });

  describe("Error Messages", () => {
    it("should include size info in per-document error", () => {
      const manager = new MemoryManager({ maxPerDocument: 100 * 1024 * 1024 });

      try {
        manager.allocate("client1", 150 * 1024 * 1024);
        expect.fail("Should have thrown");
      } catch (error) {
        expect((error as MemoryLimitError).message).toContain("150");
        expect((error as MemoryLimitError).message).toContain("100");
      }
    });

    it("should include available memory in total limit error", () => {
      const manager = new MemoryManager({
        maxPerDocument: 200 * 1024 * 1024, // 200MB per doc
        maxTotal: 200 * 1024 * 1024, // 200MB total
      });
      manager.allocate("client1", 150 * 1024 * 1024);

      try {
        manager.allocate("client2", 100 * 1024 * 1024);
        expect.fail("Should have thrown");
      } catch (error) {
        expect((error as MemoryLimitError).message).toContain("available");
      }
    });

    it("should include batch info in batch size error", () => {
      const manager = new MemoryManager({ maxBatchSize: 50 });

      try {
        manager.allocateBatch("client1", 60, 1024 * 1024);
        expect.fail("Should have thrown");
      } catch (error) {
        expect((error as MemoryLimitError).message).toContain("60");
        expect((error as MemoryLimitError).message).toContain("50");
      }
    });
  });
});
