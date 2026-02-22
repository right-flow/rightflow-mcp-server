/**
 * Audit Logger - Security Component
 *
 * Implements JSONL logging with rotation and retention.
 *
 * Security Features:
 * - JSONL format logging (one JSON object per line)
 * - Anonymous machine ID tracking
 * - Document hash logging (not content)
 * - Log rotation (100MB max file size)
 * - 30-day retention policy
 * - Structured logging with timestamps
 * - Security event tracking
 * - Buffered writes for performance
 *
 * ESLint Security Notes:
 * - File system operations use paths from trusted configuration (constructor logDir)
 * - Metadata uses 'any' type intentionally for flexibility
 * - Console logging is appropriate for logger error handling
 *
 * @example Basic usage
 * ```typescript
 * const logger = new AuditLogger({ logDir: './logs' });
 * logger.info('user_login', 'User logged in successfully');
 * logger.close();
 * ```
 *
 * @example Document access logging
 * ```typescript
 * const logger = new AuditLogger({ logDir: './logs' });
 * logger.logDocumentAccess('user123', documentContent);
 * logger.close();
 * ```
 */

import { createHash, randomUUID } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  writeFileSync,
  appendFileSync,
  readFileSync,
  readdirSync,
  statSync,
  unlinkSync,
} from "node:fs";
import { join } from "node:path";

/**
 * Audit logger configuration options
 */
export interface AuditLoggerConfig {
  /** Log directory path */
  logDir: string;
  /** Maximum log file size in bytes (default: 100MB) */
  maxFileSize?: number;
  /** Log retention in days (default: 30) */
  retentionDays?: number;
  /** Enable console logging (default: false) */
  enableConsole?: boolean;
  /** Buffer size before auto-flush (default: 10) */
  bufferSize?: number;
}

/**
 * Log level enumeration
 */
export enum AuditLogLevel {
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
  SECURITY = "SECURITY",
}

/**
 * Audit log entry structure
 */
export interface AuditLogEntry {
  /** Timestamp in ISO format */
  timestamp?: string;
  /** Log level */
  level: AuditLogLevel;
  /** Action identifier */
  action: string;
  /** Log message */
  message: string;
  /** Anonymous machine ID */
  machineId?: string;
  /** Custom metadata */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>;
  /** Document hash (if logging document access) */
  documentHash?: string;
  /** User ID (if applicable) */
  userId?: string;
  /** IP address (if applicable) */
  ipAddress?: string;
  /** Success flag (for auth/operation logging) */
  success?: boolean;
  /** Client ID (for rate limiting) */
  clientId?: string;
}

/**
 * Log query options
 */
export interface LogQueryOptions {
  /** Start date for query range */
  startDate?: Date;
  /** End date for query range */
  endDate?: Date;
  /** Filter by action */
  action?: string;
  /** Filter by log level */
  level?: AuditLogLevel;
}

/**
 * Audit Logger - JSONL logging with rotation and retention
 *
 * Implements comprehensive audit logging:
 * - JSONL format (newline-delimited JSON) for easy parsing
 * - Anonymous machine ID for tracking instances
 * - Document hashing to prevent logging sensitive content
 * - Automatic log rotation based on file size
 * - Retention policy to delete old logs
 * - Buffered writes for performance
 * - Structured logging with timestamps
 * - Security event tracking (auth, rate limits, violations)
 * - Query interface for log analysis
 *
 * Common use cases:
 * - Audit trails for compliance
 * - Security event monitoring
 * - User activity tracking
 * - Document access logging
 * - Rate limit violation detection
 */
export class AuditLogger {
  private readonly config: Required<AuditLoggerConfig>;
  private readonly machineId: string;
  private currentLogFile: string;
  private buffer: AuditLogEntry[];
  private closed: boolean;

  /**
   * Create a new Audit Logger
   *
   * @param config - Logger configuration
   * @throws Error if log directory cannot be created
   */
  constructor(config: AuditLoggerConfig) {
    this.config = {
      logDir: config.logDir,
      maxFileSize: config.maxFileSize ?? 100 * 1024 * 1024, // 100MB
      retentionDays: config.retentionDays ?? 30,
      enableConsole: config.enableConsole ?? false,
      bufferSize: config.bufferSize ?? 10,
    };

    this.buffer = [];
    this.closed = false;

    // Create log directory
    this.createLogDirectory();

    // Get or create machine ID
    this.machineId = this.getOrCreateMachineId();

    // Initialize current log file
    this.currentLogFile = this.getCurrentLogFile();

    // Clean up old logs
    this.cleanup();
  }

  /**
   * Get anonymous machine ID
   *
   * Returns consistent machine ID for this instance.
   *
   * @returns Machine ID string
   */
  getMachineId(): string {
    return this.machineId;
  }

  /**
   * Log an entry
   *
   * Adds entry to buffer and flushes if buffer is full.
   *
   * @param entry - Log entry to write
   *
   * @example
   * ```typescript
   * logger.log({
   *   level: AuditLogLevel.INFO,
   *   action: 'user_login',
   *   message: 'User logged in',
   *   metadata: { userId: 'user123' }
   * });
   * ```
   */
  log(entry: AuditLogEntry): void {
    if (this.closed) {
      throw new Error("Logger is closed");
    }

    // Add timestamp and machine ID
    const fullEntry: AuditLogEntry = {
      timestamp: new Date().toISOString(),
      machineId: this.machineId,
      ...entry,
    };

    // Handle circular references in metadata
    if (fullEntry.metadata) {
      try {
        JSON.stringify(fullEntry.metadata);
      } catch (error) {
        fullEntry.metadata = { error: "Circular reference detected" };
      }
    }

    // Add to buffer
    this.buffer.push(fullEntry);

    // Console logging if enabled
    if (this.config.enableConsole) {
      // eslint-disable-next-line no-console
      console.log(JSON.stringify(fullEntry));
    }

    // Auto-flush if buffer is full
    if (this.buffer.length >= this.config.bufferSize) {
      this.flush();
    }
  }

  /**
   * Log INFO level entry
   *
   * @param action - Action identifier
   * @param message - Log message
   * @param metadata - Optional metadata
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  info(action: string, message: string, metadata?: Record<string, any>): void {
    this.log({
      level: AuditLogLevel.INFO,
      action,
      message,
      metadata,
    });
  }

  /**
   * Log WARN level entry
   *
   * @param action - Action identifier
   * @param message - Log message
   * @param metadata - Optional metadata
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  warn(action: string, message: string, metadata?: Record<string, any>): void {
    this.log({
      level: AuditLogLevel.WARN,
      action,
      message,
      metadata,
    });
  }

  /**
   * Log ERROR level entry
   *
   * @param action - Action identifier
   * @param message - Log message
   * @param metadata - Optional metadata
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  error(action: string, message: string, metadata?: Record<string, any>): void {
    this.log({
      level: AuditLogLevel.ERROR,
      action,
      message,
      metadata,
    });
  }

  /**
   * Log SECURITY level entry
   *
   * @param action - Action identifier
   * @param message - Log message
   * @param metadata - Optional metadata
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  security(action: string, message: string, metadata?: Record<string, any>): void {
    this.log({
      level: AuditLogLevel.SECURITY,
      action,
      message,
      metadata,
    });
  }

  /**
   * Log document access
   *
   * Logs document hash instead of actual content for security.
   *
   * @param userId - User accessing document
   * @param documentContent - Document content (will be hashed)
   *
   * @example
   * ```typescript
   * logger.logDocumentAccess('user123', sensitiveDocumentContent);
   * ```
   */
  logDocumentAccess(userId: string, documentContent: string): void {
    const documentHash = this.hashDocument(documentContent);

    this.log({
      level: AuditLogLevel.INFO,
      action: "document_access",
      message: "Document accessed",
      userId,
      documentHash,
    });
  }

  /**
   * Log authentication attempt
   *
   * @param userId - User ID attempting authentication
   * @param success - Whether authentication succeeded
   * @param ipAddress - IP address of attempt
   */
  logAuthAttempt(userId: string, success: boolean, ipAddress: string): void {
    this.log({
      level: AuditLogLevel.SECURITY,
      action: "auth_attempt",
      message: success ? "Authentication succeeded" : "Authentication failed",
      userId,
      success,
      ipAddress,
    });
  }

  /**
   * Log rate limit violation
   *
   * @param clientId - Client ID that violated rate limit
   * @param ipAddress - IP address of client
   */
  logRateLimitViolation(clientId: string, ipAddress: string): void {
    this.log({
      level: AuditLogLevel.SECURITY,
      action: "rate_limit_violation",
      message: "Rate limit exceeded",
      clientId,
      ipAddress,
    });
  }

  /**
   * Log security violation
   *
   * @param message - Violation description
   * @param metadata - Additional context
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  logSecurityViolation(message: string, metadata?: Record<string, any>): void {
    this.log({
      level: AuditLogLevel.SECURITY,
      action: "security_violation",
      message,
      metadata,
    });
  }

  /**
   * Flush buffered entries to disk
   *
   * Writes all buffered entries to current log file.
   */
  flush(): void {
    if (this.buffer.length === 0) {
      return;
    }

    // Check if rotation needed before writing
    this.rotateIfNeeded();

    // Write buffered entries as JSONL
    const jsonl = this.buffer
      .map((entry) => JSON.stringify(entry))
      .join("\n") + "\n";

    try {
      appendFileSync(this.currentLogFile, jsonl, "utf-8");
      this.buffer = [];
    } catch (error) {
      // If write fails, keep entries in buffer
      console.error("Failed to write log file:", error);
    }
  }

  /**
   * Clean up old log files based on retention policy
   */
  cleanup(): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);

    const files = readdirSync(this.config.logDir);

    for (const file of files) {
      if (!file.startsWith("audit-") || file === "audit.jsonl") {
        continue; // Skip current log file
      }

      const filePath = join(this.config.logDir, file);
      const stats = statSync(filePath);

      if (stats.mtime < cutoffDate) {
        try {
          unlinkSync(filePath);
        } catch (error) {
          console.error(`Failed to delete old log file ${file}:`, error);
        }
      }
    }
  }

  /**
   * Query log entries
   *
   * Searches log files for entries matching query criteria.
   *
   * @param options - Query options
   * @returns Matching log entries
   *
   * @example
   * ```typescript
   * const logs = logger.query({
   *   action: 'user_login',
   *   level: AuditLogLevel.SECURITY
   * });
   * ```
   */
  query(options: LogQueryOptions): AuditLogEntry[] {
    // Flush buffer first
    this.flush();

    const results: AuditLogEntry[] = [];
    const files = readdirSync(this.config.logDir);

    for (const file of files) {
      if (!file.endsWith(".jsonl")) {
        continue;
      }

      const filePath = join(this.config.logDir, file);
      const content = readFileSync(filePath, "utf-8");
      const lines = content.trim().split("\n").filter((l) => l.length > 0);

      for (const line of lines) {
        try {
          const entry = JSON.parse(line) as AuditLogEntry;

          // Apply filters
          if (options.startDate && entry.timestamp) {
            if (new Date(entry.timestamp) < options.startDate) {
              continue;
            }
          }

          if (options.endDate && entry.timestamp) {
            if (new Date(entry.timestamp) > options.endDate) {
              continue;
            }
          }

          if (options.action && entry.action !== options.action) {
            continue;
          }

          if (options.level && entry.level !== options.level) {
            continue;
          }

          results.push(entry);
        } catch (error) {
          // Skip invalid JSON lines
          continue;
        }
      }
    }

    return results;
  }

  /**
   * Close logger and flush remaining entries
   */
  close(): void {
    if (this.closed) {
      return;
    }

    this.flush();
    this.closed = true;
  }

  /**
   * Hash document content with SHA-256
   *
   * @param content - Document content to hash
   * @returns SHA-256 hash (hex)
   */
  private hashDocument(content: string): string {
    const hash = createHash("sha256");
    hash.update(content);
    return hash.digest("hex");
  }

  /**
   * Create log directory if not exists
   *
   * @throws Error if directory cannot be created
   */
  private createLogDirectory(): void {
    if (!existsSync(this.config.logDir)) {
      try {
        mkdirSync(this.config.logDir, { recursive: true });
      } catch (error) {
        throw new Error(
          `Failed to create log directory: ${this.config.logDir}`
        );
      }
    }
  }

  /**
   * Get or create anonymous machine ID
   *
   * Stores machine ID in log directory for consistency.
   *
   * @returns Machine ID string
   */
  private getOrCreateMachineId(): string {
    const machineIdFile = join(this.config.logDir, ".machine-id");

    if (existsSync(machineIdFile)) {
      return readFileSync(machineIdFile, "utf-8").trim();
    }

    const newMachineId = randomUUID();
    writeFileSync(machineIdFile, newMachineId, "utf-8");
    return newMachineId;
  }

  /**
   * Get current log file path
   *
   * @returns Path to current log file
   */
  private getCurrentLogFile(): string {
    return join(this.config.logDir, "audit.jsonl");
  }

  /**
   * Rotate log file if size exceeds limit
   */
  private rotateIfNeeded(): void {
    if (!existsSync(this.currentLogFile)) {
      return;
    }

    const stats = statSync(this.currentLogFile);

    if (stats.size >= this.config.maxFileSize) {
      this.rotate();
    }
  }

  /**
   * Rotate current log file
   *
   * Renames current file with timestamp and creates new file.
   */
  private rotate(): void {
    const timestamp = new Date().toISOString().replace(/:/g, "-");
    const rotatedFile = join(
      this.config.logDir,
      `audit-${timestamp}.jsonl`
    );

    try {
      const content = readFileSync(this.currentLogFile, "utf-8");
      writeFileSync(rotatedFile, content, "utf-8");
      unlinkSync(this.currentLogFile);
    } catch (error) {
      console.error("Failed to rotate log file:", error);
    }
  }
}
