/**
 * Memory Manager - Security Component
 *
 * Implements resource limits and memory tracking for PDF operations.
 *
 * Security Features:
 * - Per-document memory limit (default: 100MB)
 * - Total memory limit across all operations (default: 500MB)
 * - Batch size limit (default: 50 documents)
 * - Per-client memory tracking and isolation
 * - Peak memory usage tracking
 * - Automatic cleanup and garbage collection
 *
 * @example Basic usage
 * ```typescript
 * const manager = new MemoryManager();
 * const token = manager.allocate('client-id', 50 * 1024 * 1024); // 50MB
 * try {
 *   // Process PDF
 * } finally {
 *   manager.release(token);
 * }
 * ```
 *
 * @example Batch operations
 * ```typescript
 * const manager = new MemoryManager({ maxBatchSize: 25 });
 * const tokens = manager.allocateBatch('client-id', 10, 5 * 1024 * 1024);
 * try {
 *   // Process batch
 * } finally {
 *   manager.releaseBatch(tokens);
 * }
 * ```
 */

import { randomUUID } from "node:crypto";

/**
 * Memory manager configuration options
 */
export interface MemoryManagerConfig {
  /** Maximum memory per document in bytes (default: 100MB) */
  maxPerDocument?: number;
  /** Maximum total memory across all operations in bytes (default: 500MB) */
  maxTotal?: number;
  /** Maximum number of documents in a batch operation (default: 50) */
  maxBatchSize?: number;
}

/**
 * Error codes for memory limit violations
 */
export const MemoryLimitErrorCodes = {
  PER_DOCUMENT_LIMIT_EXCEEDED: "PER_DOCUMENT_LIMIT_EXCEEDED",
  TOTAL_LIMIT_EXCEEDED: "TOTAL_LIMIT_EXCEEDED",
  BATCH_SIZE_EXCEEDED: "BATCH_SIZE_EXCEEDED",
} as const;

export type MemoryLimitErrorCode =
  (typeof MemoryLimitErrorCodes)[keyof typeof MemoryLimitErrorCodes];

/**
 * Error thrown when memory limits are exceeded
 */
export class MemoryLimitError extends Error {
  constructor(
    message: string,
    public code: MemoryLimitErrorCode
  ) {
    super(message);
    this.name = "MemoryLimitError";
  }
}

/**
 * Memory allocation record
 */
interface Allocation {
  /** Allocation token (UUID) */
  token: string;
  /** Client ID that owns this allocation */
  clientId: string;
  /** Size in bytes */
  size: number;
  /** Allocation timestamp */
  timestamp: number;
}

/**
 * Client memory state
 */
interface ClientState {
  /** Current memory usage in bytes */
  currentUsage: number;
  /** Peak memory usage in bytes */
  peakUsage: number;
  /** Total number of allocations made */
  allocationCount: number;
}

/**
 * Client statistics
 */
export interface ClientStats {
  /** Current memory usage in bytes */
  currentUsage: number;
  /** Peak memory usage in bytes */
  peakUsage: number;
  /** Total number of allocations made */
  allocationCount: number;
}

/**
 * Global statistics
 */
export interface GlobalStats {
  /** Total memory currently in use across all clients (bytes) */
  totalUsage: number;
  /** Peak total memory usage (bytes) */
  peakUsage: number;
  /** Number of active clients with allocations */
  activeClients: number;
  /** Total number of allocations made */
  totalAllocations: number;
}

/**
 * Memory Manager - Resource limits and memory tracking
 *
 * Implements comprehensive memory management for PDF operations:
 * - Per-document size limits prevent individual documents from consuming too much memory
 * - Total memory limits prevent system-wide resource exhaustion
 * - Batch size limits prevent processing too many documents at once
 * - Per-client tracking isolates resource usage
 * - Statistics tracking for monitoring and debugging
 */
export class MemoryManager {
  private readonly config: Required<MemoryManagerConfig>;
  private readonly allocations: Map<string, Allocation>;
  private readonly clients: Map<string, ClientState>;
  private totalUsage: number;
  private peakTotalUsage: number;
  private totalAllocationCount: number;

  /**
   * Create a new Memory Manager
   *
   * @param config - Memory manager configuration
   * @throws Error if configuration is invalid
   */
  constructor(config: MemoryManagerConfig = {}) {
    // Apply defaults
    this.config = {
      maxPerDocument: config.maxPerDocument ?? 100 * 1024 * 1024, // 100MB
      maxTotal: config.maxTotal ?? 500 * 1024 * 1024, // 500MB
      maxBatchSize: config.maxBatchSize ?? 50,
    };

    // Validate configuration
    this.validateConfig();

    // Initialize tracking structures
    this.allocations = new Map();
    this.clients = new Map();
    this.totalUsage = 0;
    this.peakTotalUsage = 0;
    this.totalAllocationCount = 0;
  }

  /**
   * Allocate memory for a document
   *
   * Checks both per-document and total memory limits before allocating.
   * Returns a unique token that must be used to release the memory.
   *
   * @param clientId - Unique client identifier
   * @param size - Memory size in bytes to allocate
   * @returns Allocation token (UUID)
   * @throws MemoryLimitError if limits exceeded
   *
   * @example
   * ```typescript
   * const manager = new MemoryManager();
   * const token = manager.allocate('client-id', 50 * 1024 * 1024);
   * // ... process document ...
   * manager.release(token);
   * ```
   */
  allocate(clientId: string, size: number): string {
    // Check per-document limit
    if (size > this.config.maxPerDocument) {
      const sizeMB = Math.round(size / 1024 / 1024);
      const limitMB = Math.round(this.config.maxPerDocument / 1024 / 1024);
      throw new MemoryLimitError(
        `Document size ${sizeMB}MB exceeds per-document limit of ${limitMB}MB`,
        MemoryLimitErrorCodes.PER_DOCUMENT_LIMIT_EXCEEDED
      );
    }

    // Check total memory limit
    if (this.totalUsage + size > this.config.maxTotal) {
      const availableMB = Math.round((this.config.maxTotal - this.totalUsage) / 1024 / 1024);
      const requestedMB = Math.round(size / 1024 / 1024);
      throw new MemoryLimitError(
        `Insufficient memory: requested ${requestedMB}MB, only ${availableMB}MB available`,
        MemoryLimitErrorCodes.TOTAL_LIMIT_EXCEEDED
      );
    }

    // Create allocation
    const token = randomUUID();
    const allocation: Allocation = {
      token,
      clientId,
      size,
      timestamp: Date.now(),
    };

    // Record allocation
    this.allocations.set(token, allocation);
    this.totalUsage += size;
    this.totalAllocationCount++;

    // Update peak total usage
    if (this.totalUsage > this.peakTotalUsage) {
      this.peakTotalUsage = this.totalUsage;
    }

    // Update client state
    const clientState = this.getOrCreateClientState(clientId);
    clientState.currentUsage += size;
    clientState.allocationCount++;

    // Update client peak usage
    if (clientState.currentUsage > clientState.peakUsage) {
      clientState.peakUsage = clientState.currentUsage;
    }

    return token;
  }

  /**
   * Allocate memory for a batch of documents
   *
   * Checks batch size limit, per-document limits, and total memory limit
   * before allocating. Returns an array of tokens for batch operations.
   *
   * @param clientId - Unique client identifier
   * @param count - Number of documents in batch
   * @param sizePerDocument - Memory size per document in bytes
   * @returns Array of allocation tokens
   * @throws MemoryLimitError if limits exceeded
   *
   * @example
   * ```typescript
   * const manager = new MemoryManager();
   * const tokens = manager.allocateBatch('client-id', 10, 5 * 1024 * 1024);
   * // ... process batch ...
   * manager.releaseBatch(tokens);
   * ```
   */
  allocateBatch(clientId: string, count: number, sizePerDocument: number): string[] {
    // Check batch size limit
    if (count > this.config.maxBatchSize) {
      throw new MemoryLimitError(
        `Batch size ${count} exceeds maximum of ${this.config.maxBatchSize}`,
        MemoryLimitErrorCodes.BATCH_SIZE_EXCEEDED
      );
    }

    // Check if total batch memory would exceed limits
    const totalBatchSize = count * sizePerDocument;
    if (this.totalUsage + totalBatchSize > this.config.maxTotal) {
      const availableMB = Math.round((this.config.maxTotal - this.totalUsage) / 1024 / 1024);
      const requestedMB = Math.round(totalBatchSize / 1024 / 1024);
      throw new MemoryLimitError(
        `Insufficient memory for batch: requested ${requestedMB}MB, only ${availableMB}MB available`,
        MemoryLimitErrorCodes.TOTAL_LIMIT_EXCEEDED
      );
    }

    // Allocate each document in the batch
    const tokens: string[] = [];
    for (let i = 0; i < count; i++) {
      const token = this.allocate(clientId, sizePerDocument);
      tokens.push(token);
    }

    return tokens;
  }

  /**
   * Release allocated memory
   *
   * Frees memory associated with the given token.
   * Silently ignores invalid or already-released tokens.
   *
   * @param token - Allocation token from allocate()
   */
  release(token: string): void {
    const allocation = this.allocations.get(token);

    if (!allocation) {
      // Token not found - already released or invalid
      return;
    }

    // Update total usage
    this.totalUsage -= allocation.size;

    // Update client state
    const clientState = this.clients.get(allocation.clientId);
    if (clientState) {
      clientState.currentUsage -= allocation.size;
    }

    // Remove allocation
    this.allocations.delete(token);
  }

  /**
   * Release a batch of allocated memory
   *
   * Convenience method for releasing multiple allocations at once.
   *
   * @param tokens - Array of allocation tokens
   */
  releaseBatch(tokens: string[]): void {
    for (const token of tokens) {
      this.release(token);
    }
  }

  /**
   * Get memory statistics for a specific client
   *
   * @param clientId - Unique client identifier
   * @returns Client memory statistics
   */
  getClientStats(clientId: string): ClientStats {
    const state = this.getOrCreateClientState(clientId);

    return {
      currentUsage: state.currentUsage,
      peakUsage: state.peakUsage,
      allocationCount: state.allocationCount,
    };
  }

  /**
   * Get global memory statistics
   *
   * @returns Global memory statistics across all clients
   */
  getGlobalStats(): GlobalStats {
    // Count clients with active allocations
    let activeClients = 0;
    for (const state of this.clients.values()) {
      if (state.currentUsage > 0) {
        activeClients++;
      }
    }

    return {
      totalUsage: this.totalUsage,
      peakUsage: this.peakTotalUsage,
      activeClients,
      totalAllocations: this.totalAllocationCount,
    };
  }

  /**
   * Reset memory tracking for a specific client
   *
   * Releases all allocations for the client and clears statistics.
   *
   * @param clientId - Unique client identifier
   */
  resetClient(clientId: string): void {
    // Find and release all allocations for this client
    const tokensToRelease: string[] = [];
    for (const [token, allocation] of this.allocations.entries()) {
      if (allocation.clientId === clientId) {
        tokensToRelease.push(token);
      }
    }

    // Release allocations
    this.releaseBatch(tokensToRelease);

    // Reset client state
    this.clients.delete(clientId);
  }

  /**
   * Reset all memory tracking
   *
   * Releases all allocations and clears all statistics.
   * Use with caution - this will clear all memory tracking.
   */
  resetAll(): void {
    this.allocations.clear();
    this.clients.clear();
    this.totalUsage = 0;
    this.peakTotalUsage = 0;
    this.totalAllocationCount = 0;
  }

  /**
   * Force garbage collection
   *
   * Triggers cleanup of released allocations.
   * In practice, this is a no-op since release() already cleans up,
   * but provided for API completeness and future optimizations.
   */
  forceGC(): void {
    // In current implementation, memory is released immediately
    // This method is provided for API completeness and future use
    // (e.g., deferred cleanup, pooling, etc.)
  }

  /**
   * Validate configuration values
   *
   * @throws Error if configuration is invalid
   */
  private validateConfig(): void {
    if (this.config.maxPerDocument <= 0) {
      throw new Error("maxPerDocument must be greater than 0");
    }

    if (this.config.maxTotal <= 0) {
      throw new Error("maxTotal must be greater than 0");
    }

    if (this.config.maxBatchSize <= 0) {
      throw new Error("maxBatchSize must be greater than 0");
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
        currentUsage: 0,
        peakUsage: 0,
        allocationCount: 0,
      };
      this.clients.set(clientId, state);
    }

    return state;
  }
}
