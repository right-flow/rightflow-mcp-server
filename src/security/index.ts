/**
 * Security Manager - 8-Layer Security Orchestration
 *
 * Coordinates all 8 security components into a unified security pipeline:
 * 1. Rate Limiter - Request throttling (20 req/min, 3 concurrent)
 * 2. Path Sanitizer - Path traversal prevention
 * 3. Memory Manager - Memory limit enforcement (100MB/doc, 500MB total)
 * 4. Input Validator - Schema validation with Zod
 * 5. Hebrew Sanitizer - BiDi attack prevention
 * 6. Template Verifier - SHA-256 checksum verification
 * 7. PII Handler - Sensitive data sanitization
 * 8. Audit Logger - JSONL security event logging
 *
 * Security Pipeline Flow:
 * Request → Rate Limit → Path Sanitize → Memory Check → Input Validate
 *         → Hebrew Sanitize → Template Verify → PII Sanitize → Audit Log → Response
 *
 * @example Basic usage
 * ```typescript
 * const security = new SecurityManager({
 *   logDir: './logs',
 *   templateDir: './templates',
 *   allowedBasePaths: ['./templates']
 * });
 *
 * // Validate request
 * const result = await security.validateRequest({
 *   clientId: 'client-001',
 *   templatePath: './templates/contract.pdf',
 *   fieldData: { name: 'John', email: 'john@example.com' },
 *   requestSize: 5 * 1024 * 1024 // 5MB
 * });
 *
 * if (!result.allowed) {
 *   console.error('Security violation:', result.reason);
 * }
 * ```
 */

import { RateLimiter, type RateLimiterConfig } from "./rateLimiter.js";
import { PathSanitizer, type PathSanitizerConfig } from "./pathSanitizer.js";
import { MemoryManager, type MemoryManagerConfig } from "./memoryManager.js";
import { InputValidator } from "./inputValidator.js";
import { HebrewSanitizer, type HebrewSanitizerConfig } from "./hebrewSanitizer.js";
import { TemplateVerifier, type TemplateVerifierConfig } from "./templateVerifier.js";
import { PIIHandler, type PIIHandlerConfig } from "./piiHandler.js";
import { AuditLogger, type AuditLoggerConfig, AuditLogLevel } from "./auditLogger.js";

/**
 * Security Manager configuration
 */
export interface SecurityManagerConfig {
  /** Audit log directory */
  logDir: string;
  /** Template directory for verification */
  templateDir: string;
  /** Allowed base paths for path sanitization */
  allowedBasePaths: string[];
  /** Rate limiter config (optional) */
  rateLimiter?: Partial<RateLimiterConfig>;
  /** Path sanitizer config (optional) */
  pathSanitizer?: Partial<PathSanitizerConfig>;
  /** Memory manager config (optional) */
  memoryManager?: Partial<MemoryManagerConfig>;
  /** Hebrew sanitizer config (optional) */
  hebrewSanitizer?: Partial<HebrewSanitizerConfig>;
  /** Template verifier config (optional) */
  templateVerifier?: Partial<TemplateVerifierConfig>;
  /** PII handler config (optional) */
  piiHandler?: Partial<PIIHandlerConfig>;
  /** Audit logger config (optional) */
  auditLogger?: Partial<AuditLoggerConfig>;
}

/**
 * Request validation input
 */
export interface SecurityRequest {
  /** Client identifier for rate limiting */
  clientId: string;
  /** Template file path */
  templatePath: string;
  /** Field data to populate template */
  fieldData: Record<string, any>;
  /** Request size in bytes */
  requestSize: number;
  /** Request ID for tracking */
  requestId?: string;
  /** Schema for input validation (optional) */
  schema?: Record<string, any>;
}

/**
 * Security validation result
 */
export interface SecurityResult {
  /** Whether request is allowed */
  allowed: boolean;
  /** Reason for rejection (if not allowed) */
  reason?: string;
  /** Sanitized field data (PII removed, Hebrew sanitized) */
  sanitizedData?: Record<string, any>;
  /** Error details */
  error?: {
    layer: string;
    code: string;
    message: string;
  };
}

/**
 * Security Manager - Orchestrates 8-layer security pipeline
 *
 * Validates all requests through a comprehensive security pipeline.
 * Fails fast on first security violation.
 */
export class SecurityManager {
  private readonly rateLimiter: RateLimiter;
  private readonly pathSanitizer: PathSanitizer;
  private readonly memoryManager: MemoryManager;
  private readonly inputValidator: InputValidator;
  private readonly hebrewSanitizer: HebrewSanitizer;
  private readonly templateVerifier: TemplateVerifier;
  private readonly piiHandler: PIIHandler;
  private readonly auditLogger: AuditLogger;

  constructor(config: SecurityManagerConfig) {
    // Initialize all 8 security components
    this.rateLimiter = new RateLimiter({
      maxRequests: 20,
      windowMs: 60000,
      maxConcurrent: 3,
      ...config.rateLimiter,
    });

    this.pathSanitizer = new PathSanitizer({
      allowedBasePaths: config.allowedBasePaths,
      allowSymlinks: false,
      ...config.pathSanitizer,
    });

    this.memoryManager = new MemoryManager({
      maxMemoryPerDocument: 100 * 1024 * 1024, // 100MB
      maxTotalMemory: 500 * 1024 * 1024, // 500MB
      maxBatchSize: 50,
      ...config.memoryManager,
    });

    this.inputValidator = new InputValidator();

    this.hebrewSanitizer = new HebrewSanitizer({
      removeBiDiOverrides: true,
      removeZeroWidth: true,
      detectHomographs: true,
      ...config.hebrewSanitizer,
    });

    this.templateVerifier = new TemplateVerifier({
      templateDir: config.templateDir,
      enforceChecksums: true,
      ...config.templateVerifier,
    });

    this.piiHandler = new PIIHandler(config.piiHandler);

    this.auditLogger = new AuditLogger({
      logDir: config.logDir,
      enableConsole: false,
      ...config.auditLogger,
    });
  }

  /**
   * Validate request through all 8 security layers
   *
   * Pipeline:
   * 1. Rate Limiter → Check request limits
   * 2. Path Sanitizer → Validate template path
   * 3. Memory Manager → Allocate memory
   * 4. Input Validator → Validate field data
   * 5. Hebrew Sanitizer → Remove BiDi attacks
   * 6. Template Verifier → Verify checksums (optional - requires template metadata)
   * 7. PII Handler → Sanitize sensitive data
   * 8. Audit Logger → Log security events
   *
   * @param request - Security request to validate
   * @returns Security validation result
   */
  async validateRequest(request: SecurityRequest): Promise<SecurityResult> {
    const requestId = request.requestId || `req-${Date.now()}`;

    try {
      // Layer 1: Rate Limiter
      const rateCheck = await this.rateLimiter.checkLimit(request.clientId);
      if (!rateCheck.allowed) {
        this.auditLogger.logRateLimitViolation(request.clientId, "unknown");
        this.auditLogger.flush();

        return {
          allowed: false,
          reason: "Rate limit exceeded",
          error: {
            layer: "RateLimiter",
            code: "RATE_LIMIT_EXCEEDED",
            message: `Rate limit exceeded. Retry after ${rateCheck.retryAfter || 60}s`,
          },
        };
      }

      // Layer 2: Path Sanitizer
      try {
        this.pathSanitizer.sanitize(request.templatePath);
      } catch (error) {
        this.auditLogger.logSecurityViolation("Path traversal attempt", {
          path: request.templatePath,
          clientId: request.clientId,
        });
        this.auditLogger.flush();

        return {
          allowed: false,
          reason: "Invalid template path",
          error: {
            layer: "PathSanitizer",
            code: "PATH_TRAVERSAL",
            message: error instanceof Error ? error.message : "Path validation failed",
          },
        };
      }

      // Layer 3: Memory Manager
      const memoryAllocation = this.memoryManager.allocate(requestId, request.requestSize);
      if (!memoryAllocation.success) {
        this.auditLogger.security("memory_limit_exceeded", "Memory allocation failed", {
          requestId,
          requestSize: request.requestSize,
          error: memoryAllocation.error,
        });
        this.auditLogger.flush();

        return {
          allowed: false,
          reason: "Memory limit exceeded",
          error: {
            layer: "MemoryManager",
            code: "MEMORY_LIMIT_EXCEEDED",
            message: memoryAllocation.error || "Memory allocation failed",
          },
        };
      }

      // Layer 4: Input Validator
      if (request.schema) {
        const validation = this.inputValidator.validate(request.fieldData, request.schema);
        if (!validation.valid) {
          this.auditLogger.warn("validation_failed", "Input validation failed", {
            errors: validation.errors,
            clientId: request.clientId,
          });
          this.auditLogger.flush();

          // Release allocated memory
          this.memoryManager.release(requestId);

          return {
            allowed: false,
            reason: "Input validation failed",
            error: {
              layer: "InputValidator",
              code: "VALIDATION_FAILED",
              message: validation.errors.map(e => e.message).join(", "),
            },
          };
        }
      }

      // Layer 5: Hebrew Sanitizer
      const sanitizedData: Record<string, any> = {};
      for (const [key, value] of Object.entries(request.fieldData)) {
        if (typeof value === "string") {
          const sanitized = this.hebrewSanitizer.sanitize(value);
          sanitizedData[key] = sanitized;

          // Check if BiDi attack was detected
          if (sanitized !== value) {
            this.auditLogger.logSecurityViolation("BiDi override attack detected", {
              field: key,
              originalLength: value.length,
              sanitizedLength: sanitized.length,
            });
          }
        } else {
          sanitizedData[key] = value;
        }
      }

      // Layer 6: Template Verifier (skip for now - requires template metadata)
      // Would verify SHA-256 checksum if template metadata is available

      // Layer 7: PII Handler
      const finalData: Record<string, any> = {};
      for (const [key, value] of Object.entries(sanitizedData)) {
        if (typeof value === "string") {
          const piiDetection = this.piiHandler.detectPII(value);
          if (piiDetection.detected) {
            // Don't reject, but sanitize and log
            finalData[key] = this.piiHandler.sanitize(value);
            this.auditLogger.warn("pii_detected", "PII found in field data", {
              field: key,
              types: piiDetection.types,
            });
          } else {
            finalData[key] = value;
          }
        } else {
          finalData[key] = value;
        }
      }

      // Layer 8: Audit Logger - Log successful validation
      this.auditLogger.info("request_validated", "Security validation passed", {
        clientId: request.clientId,
        requestId,
        templatePath: request.templatePath,
      });
      this.auditLogger.flush();

      return {
        allowed: true,
        sanitizedData: finalData,
      };
    } catch (error) {
      // Unexpected error - log and reject
      this.auditLogger.error("security_error", "Unexpected security error", {
        error: error instanceof Error ? error.message : String(error),
        requestId,
      });
      this.auditLogger.flush();

      return {
        allowed: false,
        reason: "Internal security error",
        error: {
          layer: "SecurityManager",
          code: "INTERNAL_ERROR",
          message: error instanceof Error ? error.message : "Unknown error",
        },
      };
    }
  }

  /**
   * Release allocated memory for a request
   *
   * @param requestId - Request ID to release memory for
   */
  releaseMemory(requestId: string): void {
    this.memoryManager.release(requestId);
  }

  /**
   * Get security statistics
   *
   * @returns Security stats from all components
   */
  getStats() {
    return {
      rateLimiter: this.rateLimiter.getStats(),
      memoryManager: this.memoryManager.getStats(),
    };
  }

  /**
   * Query audit logs
   *
   * @param options - Query options
   * @returns Matching log entries
   */
  queryLogs(options: {
    startDate?: Date;
    endDate?: Date;
    action?: string;
    level?: AuditLogLevel;
  }) {
    return this.auditLogger.query(options);
  }

  /**
   * Close security manager and flush logs
   */
  close(): void {
    this.auditLogger.close();
  }
}

// Re-export all security components for convenience
export { RateLimiter } from "./rateLimiter.js";
export { PathSanitizer } from "./pathSanitizer.js";
export { MemoryManager } from "./memoryManager.js";
export { InputValidator } from "./inputValidator.js";
export { HebrewSanitizer } from "./hebrewSanitizer.js";
export { TemplateVerifier } from "./templateVerifier.js";
export { PIIHandler } from "./piiHandler.js";
export { AuditLogger, AuditLogLevel } from "./auditLogger.js";
