/**
 * Structured Logger for Event Trigger System
 * Includes P0 mitigations for log flooding and PII protection
 */

import winston from 'winston';
import path from 'path';
import fs from 'fs';

/**
 * Log Schema Interface
 */
export interface EventTriggerLogMeta {
  component: string;
  organization_id?: string;
  event_id?: string;
  trigger_id?: string;
  action_id?: string;
  duration_ms?: number;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
  [key: string]: any;
}

/**
 * P1 Mitigation: PII Redaction Utility
 * Redacts emails, phone numbers, and other sensitive data
 */
export function redactPII(data: any): any {
  if (typeof data !== 'object' || data === null) return data;

  const redacted = Array.isArray(data) ? [...data] : { ...data };

  // Email redaction pattern: user@example.com → u***@e***.com
  // Also matches single-part domains: user@localhost → u***@***.localhost
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\b/g;

  // Phone number redaction pattern: +972501234567 → +972***4567
  const phoneRegex = /\+?\d{1,4}[\s-]?\(?\d{1,5}\)?[\s-]?\d{1,5}[\s-]?\d{1,9}/g;

  // Recursive redaction for nested objects
  for (const key in redacted) {
    if (typeof redacted[key] === 'string') {
      // Redact emails
      redacted[key] = redacted[key].replace(emailRegex, (email: string) => {
        const [user, domain] = email.split('@');
        const domainParts = domain.split('.');
        const tld = domainParts.pop() || '';

        // Handle single-part domains (e.g., user@localhost, user@com)
        if (domainParts.length === 0) {
          return `${user[0]}***@***.${tld}`;
        }

        return `${user[0]}***@${domainParts[0][0]}***.${tld}`;
      });

      // Redact phone numbers
      redacted[key] = redacted[key].replace(phoneRegex, (match: string) => {
        const firstFour = match.slice(0, Math.min(4, match.length));
        const lastFour = match.slice(-4);
        return `${firstFour}***${lastFour}`;
      });
    } else if (typeof redacted[key] === 'object' && redacted[key] !== null) {
      // Recursively redact nested objects
      redacted[key] = redactPII(redacted[key]);
    }
  }

  return redacted;
}

/**
 * Create logs directory if it doesn't exist
 */
function ensureLogsDirectory(): void {
  const logsDir = path.join(process.cwd(), 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
}

ensureLogsDirectory();

/**
 * Custom Winston Format for Event Trigger Logs
 */
const eventTriggerFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
  winston.format.errors({ stack: true }),
  winston.format((info) => {
    // Add service identifier
    info.service = 'event-trigger';

    // Redact PII from entire log entry
    const redacted = redactPII(info);

    return redacted;
  })(),
  winston.format.json(),
);

/**
 * Base Event Trigger Logger (without rate limiting)
 */
export const eventLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: eventTriggerFormat,
  defaultMeta: {
    service: 'event-trigger',
    environment: process.env.NODE_ENV || 'development',
  },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
      ),
    }),
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'event-trigger-combined.log'),
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true,
    }),
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'event-trigger-error.log'),
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 10,
      tailable: true,
    }),
  ],
  exitOnError: false,
});

/**
 * P0 Mitigation: Rate-Limited Logger
 * Prevents log flooding and disk exhaustion under high load
 */
export class RateLimitedLogger {
  private logger: winston.Logger;
  private maxLogsPerSecond: number;
  private windowMs: number;
  private adaptiveLevel: boolean;

  private logCount = 0;
  private windowStart = Date.now();
  private droppedCount = 0;
  private lastWarningTime = 0;

  private currentLevel: string;
  private originalLevel: string;

  constructor(
    logger: winston.Logger,
    options: {
      maxLogsPerSecond?: number;
      windowMs?: number;
      adaptiveLevel?: boolean;
    } = {},
  ) {
    this.logger = logger;
    this.maxLogsPerSecond = options.maxLogsPerSecond || 1000;
    this.windowMs = options.windowMs || 1000;
    this.adaptiveLevel = options.adaptiveLevel || false;

    this.currentLevel = logger.level;
    this.originalLevel = logger.level;
  }

  /**
   * Check if we're within rate limit
   */
  private checkRateLimit(): boolean {
    const now = Date.now();

    // Reset window if expired
    if (now - this.windowStart >= this.windowMs) {
      this.logCount = 0;
      this.windowStart = now;

      // Restore original log level if adaptive
      if (this.adaptiveLevel && this.droppedCount === 0) {
        this.currentLevel = this.originalLevel;
        this.logger.level = this.originalLevel;
      }

      this.droppedCount = 0;
    }

    // Check if under limit
    if (this.logCount < this.maxLogsPerSecond) {
      this.logCount++;
      return true;
    }

    // Over limit - drop log
    this.droppedCount++;

    // Emit warning (but rate-limit warnings too!)
    if (now - this.lastWarningTime > 60000) { // Max 1 warning per minute
      this.logger.warn('Rate limit exceeded, dropping logs', {
        component: 'RateLimitedLogger',
        dropped_count: this.droppedCount,
        max_logs_per_second: this.maxLogsPerSecond,
      });
      this.lastWarningTime = now;
    }

    // Adaptive log level: increase severity threshold during high load
    if (this.adaptiveLevel && this.droppedCount > this.maxLogsPerSecond * 10) {
      this.currentLevel = 'warn'; // Only log WARN and ERROR
      this.logger.level = 'warn';
    }

    return false;
  }

  /**
   * Log at INFO level (with rate limiting)
   */
  info(message: string, meta: EventTriggerLogMeta): boolean {
    if (!this.checkRateLimit()) {
      return false;
    }

    this.logger.info(message, meta);
    return true;
  }

  /**
   * Log at WARN level (with rate limiting)
   */
  warn(message: string, meta: EventTriggerLogMeta): boolean {
    if (!this.checkRateLimit()) {
      return false;
    }

    this.logger.warn(message, meta);
    return true;
  }

  /**
   * Log at ERROR level (always logged, no rate limiting for errors)
   */
  error(message: string, meta: EventTriggerLogMeta): boolean {
    this.logger.error(message, meta);
    return true;
  }

  /**
   * Get current log level
   */
  getCurrentLevel(): string {
    return this.currentLevel;
  }
}

/**
 * Global rate-limited logger instance
 */
export const rateLimitedLogger = new RateLimitedLogger(eventLogger, {
  maxLogsPerSecond: 1000, // Max 1000 logs/second
  windowMs: 1000, // 1 second window
  adaptiveLevel: true, // Increase severity threshold during high load
});

/**
 * Helper: Log event emission
 */
export function logEventEmit(meta: EventTriggerLogMeta): void {
  rateLimitedLogger.info('Event emitted to EventBus', meta);
}

/**
 * Helper: Log action execution
 */
export function logActionExecution(meta: EventTriggerLogMeta): void {
  rateLimitedLogger.info('Action executed', meta);
}

/**
 * Helper: Log error with full context (always logged)
 */
export function logError(
  message: string,
  error: Error,
  meta: EventTriggerLogMeta,
): void {
  rateLimitedLogger.error(message, {
    ...meta,
    error: {
      message: error.message,
      stack: error.stack,
      code: (error as any).code,
    },
  });
}

/**
 * Helper: Log Circuit Breaker state change (WARN level)
 */
export function logCircuitBreakerStateChange(
  fromState: string,
  toState: string,
  meta?: Partial<EventTriggerLogMeta>,
): void {
  rateLimitedLogger.warn('Circuit Breaker state changed', {
    component: 'CircuitBreaker',
    from_state: fromState,
    to_state: toState,
    ...meta,
  });
}
