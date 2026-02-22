/**
 * PII Handler - Security Component
 *
 * Implements PII detection, hashing, and secure memory cleanup.
 *
 * Security Features:
 * - Israeli ID number detection (Luhn algorithm validation)
 * - Credit card number detection (Luhn algorithm)
 * - Email address detection
 * - Israeli phone number detection
 * - PII hashing for logging (SHA-256/SHA-512)
 * - Text sanitization (replace PII with hashes)
 * - Secure buffer cleanup (zero out memory)
 * - Error message sanitization
 * - Field-level PII detection
 *
 * @example Basic usage
 * ```typescript
 * const handler = new PIIHandler();
 * const result = handler.detectPII('ID: 039606451');
 * console.log(result.detected); // true
 * console.log(result.types); // [PIIType.ISRAELI_ID]
 * ```
 *
 * @example Sanitization
 * ```typescript
 * const handler = new PIIHandler();
 * const sanitized = handler.sanitize('Email: user@example.com');
 * // Returns: "Email: [EMAIL:a1b2c3...]"
 * ```
 */

import { createHash } from "node:crypto";

/**
 * PII Handler configuration options
 */
export interface PIIHandlerConfig {
  /** Hash algorithm for PII values (default: 'sha256') */
  hashAlgorithm?: "sha256" | "sha512";
  /** Hash output encoding (default: 'hex') */
  hashEncoding?: "hex" | "base64";
  /** Enable secure buffer erasure (default: true) */
  secureErase?: boolean;
  /** Enable logging of PII detection (default: false) */
  enableLogging?: boolean;
  /** Replacement pattern for sanitized PII (default: '[{type}:{hash}]') */
  replacement?: string;
}

/**
 * PII type enumeration
 */
export enum PIIType {
  ISRAELI_ID = "ISRAELI_ID",
  CREDIT_CARD = "CREDIT_CARD",
  EMAIL = "EMAIL",
  PHONE = "PHONE",
}

/**
 * PII detection result
 */
export interface PIIDetectionResult {
  /** Whether PII was detected */
  detected: boolean;
  /** Types of PII found */
  types: PIIType[];
  /** Detected PII values (for internal use, DO NOT log) */
  values?: string[];
}

/**
 * PII Handler - Detection, hashing, and secure cleanup
 *
 * Implements comprehensive PII protection:
 * - Detects Israeli ID numbers with Luhn checksum validation
 * - Detects credit card numbers (Visa, Mastercard, Amex, etc.)
 * - Detects email addresses (including Hebrew domains)
 * - Detects Israeli phone numbers (mobile and landline)
 * - Hashes PII values for safe logging
 * - Sanitizes text by replacing PII with hash placeholders
 * - Securely erases buffers containing PII
 * - Sanitizes error messages to prevent PII leakage
 * - Detects PII field names (israeliId, email, phone, etc.)
 * - Handles nested objects and arrays
 *
 * Common scenarios:
 * - Logging user activity without exposing PII
 * - Error reporting without leaking sensitive data
 * - Audit trails with anonymized identifiers
 * - Data export with PII redaction
 */
export class PIIHandler {
  private readonly config: Required<PIIHandlerConfig>;

  // Regular expressions for PII detection
  private static readonly PATTERNS = {
    // Israeli ID: Exactly 9 digits with Luhn checksum (not followed by more digits)
    ISRAELI_ID: /\b\d{3}-?\d{3}-?\d{3}(?!\d)/g,

    // Credit card: 13-19 digits with Luhn checksum
    CREDIT_CARD: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4,7}\b/g,

    // Email: RFC 5322 simplified + Hebrew domains
    EMAIL:
      /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|[a-zA-Z0-9._%+-]+@[\u0590-\u05FF.-]+\.[a-zA-Z]{2,}\b/g,

    // Israeli phone: 05X-XXXXXXX (10 digits) or 0X-XXXXXXX (9 digits)
    // Mobile: 05X-XXXXXXX, Landline: 0[2-9]-XXXXXXX
    PHONE:
      /\+?972[\s-]?5[0-9][\s-]?\d{7}|\b05[0-9][\s-]?\d{7}\b|\+?972[\s-]?[2-9][\s-]?\d{7}|\b0[2-9][\s-]?\d{7}\b/g,
  };

  // PII field name patterns (case-insensitive)
  private static readonly PII_FIELD_NAMES = [
    /israeli[_-]?id/i,
    /תעודת[_-]?זהות/i, // Hebrew: ID card
    /credit[_-]?card/i,
    /card[_-]?number/i,
    /email/i,
    /e[_-]?mail/i,
    /phone/i,
    /טלפון/i, // Hebrew: phone
    /mobile/i,
    /cell/i,
  ];

  /**
   * Create a new PII Handler
   *
   * @param config - Handler configuration
   * @throws Error if configuration is invalid
   */
  constructor(config: PIIHandlerConfig = {}) {
    this.config = {
      hashAlgorithm: config.hashAlgorithm ?? "sha256",
      hashEncoding: config.hashEncoding ?? "hex",
      secureErase: config.secureErase ?? true,
      enableLogging: config.enableLogging ?? false,
      replacement: config.replacement ?? "[{type}:{hash}]",
    };

    this.validateConfig();
  }

  /**
   * Detect PII in text
   *
   * Scans text for Israeli IDs, credit cards, emails, and phone numbers.
   *
   * @param text - Text to scan
   * @returns Detection result with PII types found
   *
   * @example
   * ```typescript
   * const handler = new PIIHandler();
   * const result = handler.detectPII('ID: 039606451, Email: user@example.com');
   * console.log(result.detected); // true
   * console.log(result.types); // [PIIType.ISRAELI_ID, PIIType.EMAIL]
   * ```
   */
  detectPII(text: string): PIIDetectionResult {
    // Handle null/undefined
    if (text == null) {
      return { detected: false, types: [] };
    }

    const types: PIIType[] = [];
    const values: string[] = [];
    const detectedValues = new Set<string>(); // Track detected values to avoid duplicates

    // Check for Israeli ID (priority: check first to avoid phone false positive)
    const israeliIdMatches = text.match(PIIHandler.PATTERNS.ISRAELI_ID);
    if (israeliIdMatches) {
      for (const match of israeliIdMatches) {
        const cleaned = match.replace(/[-\s]/g, "");
        if (this.validateIsraeliID(cleaned)) {
          types.push(PIIType.ISRAELI_ID);
          values.push(match);
          detectedValues.add(match);
        }
      }
    }

    // Check for credit card
    const creditCardMatches = text.match(PIIHandler.PATTERNS.CREDIT_CARD);
    if (creditCardMatches) {
      for (const match of creditCardMatches) {
        if (detectedValues.has(match)) continue; // Skip if already detected
        const cleaned = match.replace(/[\s-]/g, "");
        if (this.validateCreditCard(cleaned)) {
          types.push(PIIType.CREDIT_CARD);
          values.push(match);
          detectedValues.add(match);
        }
      }
    }

    // Check for email
    const emailMatches = text.match(PIIHandler.PATTERNS.EMAIL);
    if (emailMatches) {
      for (const match of emailMatches) {
        if (detectedValues.has(match)) continue; // Skip if already detected
        types.push(PIIType.EMAIL);
        values.push(match);
        detectedValues.add(match);
      }
    }

    // Check for phone (checked last to avoid false positives with Israeli IDs)
    const phoneMatches = text.match(PIIHandler.PATTERNS.PHONE);
    if (phoneMatches) {
      for (const match of phoneMatches) {
        if (detectedValues.has(match)) continue; // Skip if already detected as ID/card
        types.push(PIIType.PHONE);
        values.push(match);
        detectedValues.add(match);
      }
    }

    return {
      detected: types.length > 0,
      types,
      values,
    };
  }

  /**
   * Hash PII value for logging
   *
   * Creates cryptographic hash of PII value for safe logging
   * and audit trails without exposing actual value.
   *
   * @param value - PII value to hash
   * @returns Hash string (hex or base64)
   *
   * @example
   * ```typescript
   * const handler = new PIIHandler();
   * const hash = handler.hashPII('039606451');
   * console.log(hash); // "a1b2c3d4..." (64 hex chars)
   * ```
   */
  hashPII(value: string): string {
    const hash = createHash(this.config.hashAlgorithm);
    hash.update(value);
    return hash.digest(this.config.hashEncoding);
  }

  /**
   * Sanitize text by replacing PII with hashed placeholders
   *
   * Replaces all detected PII with format: [TYPE:hash]
   * Preserves text structure while removing sensitive data.
   *
   * @param text - Text to sanitize
   * @returns Sanitized text
   *
   * @example
   * ```typescript
   * const handler = new PIIHandler();
   * const sanitized = handler.sanitize('ID: 039606451');
   * // Returns: "ID: [ISRAELI_ID:a1b2c3...]"
   * ```
   */
  sanitize(text: string): string {
    let result = text;
    const detection = this.detectPII(text);

    if (!detection.detected || !detection.values) {
      return result;
    }

    // Replace each PII value with hashed placeholder
    for (let i = 0; i < detection.values.length; i++) {
      const value = detection.values[i];
      const type = detection.types[i];
      const hash = this.hashPII(value).substring(0, 16); // Truncate for readability

      let replacement: string;
      if (this.config.replacement.includes("{type}")) {
        replacement = this.config.replacement
          .replace("{type}", type)
          .replace("{hash}", hash);
      } else {
        replacement = this.config.replacement;
      }

      result = result.replace(value, replacement);
    }

    return result;
  }

  /**
   * Sanitize error message to prevent PII leakage
   *
   * Scans error message for PII and replaces with hashes.
   * Prevents accidental logging of sensitive data in errors.
   *
   * @param errorMessage - Error message to sanitize
   * @returns Sanitized error message
   *
   * @example
   * ```typescript
   * const handler = new PIIHandler();
   * const safe = handler.sanitizeErrorMessage('Failed for ID: 039606451');
   * // Returns: "Failed for ID: [ISRAELI_ID:a1b2c3...]"
   * ```
   */
  sanitizeErrorMessage(errorMessage: string): string {
    return this.sanitize(errorMessage);
  }

  /**
   * Securely erase buffer containing PII
   *
   * Overwrites buffer with zeros to prevent memory leakage.
   * Important for sensitive data cleanup.
   *
   * @param buffer - Buffer to erase
   *
   * @example
   * ```typescript
   * const handler = new PIIHandler();
   * const buffer = Buffer.from('ID: 039606451');
   * handler.secureErase(buffer);
   * // Buffer now contains all zeros
   * ```
   */
  secureErase(buffer: Buffer): void {
    if (!this.config.secureErase) {
      return;
    }

    // Overwrite buffer with zeros
    buffer.fill(0);
  }

  /**
   * Detect PII in batch of texts
   *
   * Scans multiple texts for PII.
   *
   * @param texts - Array of texts to scan
   * @returns Array of detection results
   *
   * @example
   * ```typescript
   * const handler = new PIIHandler();
   * const results = handler.detectBatch(['ID: 039606451', 'Safe text']);
   * console.log(results[0].detected); // true
   * console.log(results[1].detected); // false
   * ```
   */
  detectBatch(texts: string[]): PIIDetectionResult[] {
    return texts.map((text) => this.detectPII(text));
  }

  /**
   * Sanitize batch of texts
   *
   * Sanitizes multiple texts by replacing PII.
   *
   * @param texts - Array of texts to sanitize
   * @returns Array of sanitized texts
   */
  sanitizeBatch(texts: string[]): string[] {
    return texts.map((text) => this.sanitize(text));
  }

  /**
   * Check if field name suggests PII
   *
   * Detects field names like 'israeliId', 'email', 'phoneNumber'.
   *
   * @param fieldName - Field name to check
   * @returns True if field name suggests PII
   *
   * @example
   * ```typescript
   * const handler = new PIIHandler();
   * console.log(handler.isPIIField('israeliId')); // true
   * console.log(handler.isPIIField('orderNumber')); // false
   * ```
   */
  isPIIField(fieldName: string): boolean {
    return PIIHandler.PII_FIELD_NAMES.some((pattern) =>
      pattern.test(fieldName)
    );
  }

  /**
   * Sanitize object by replacing PII in fields
   *
   * Recursively sanitizes object properties.
   * Detects PII by field name and content.
   *
   * @param obj - Object to sanitize
   * @returns Sanitized object
   *
   * @example
   * ```typescript
   * const handler = new PIIHandler();
   * const sanitized = handler.sanitizeObject({
   *   name: 'John',
   *   israeliId: '039606451'
   * });
   * console.log(sanitized.name); // "John"
   * console.log(sanitized.israeliId); // "[ISRAELI_ID:a1b2c3...]"
   * ```
   */
  sanitizeObject(obj: any): any {
    if (obj == null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.sanitizeObject(item));
    }

    if (typeof obj !== "object") {
      return obj;
    }

    const sanitized: any = {};

    for (const [key, value] of Object.entries(obj)) {
      if (this.isPIIField(key)) {
        // Field name suggests PII - sanitize value
        if (typeof value === "string") {
          sanitized[key] = this.sanitize(value);
        } else if (Array.isArray(value)) {
          sanitized[key] = value.map((item) =>
            typeof item === "string" ? this.sanitize(item) : item
          );
        } else {
          sanitized[key] = value;
        }
      } else if (typeof value === "string") {
        // Check content for PII
        sanitized[key] = this.sanitize(value);
      } else if (typeof value === "object") {
        // Recursively sanitize nested objects
        sanitized[key] = this.sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Validate Israeli ID using Luhn algorithm
   *
   * @param id - Israeli ID (9 digits)
   * @returns True if valid
   */
  private validateIsraeliID(id: string): boolean {
    if (!/^\d{9}$/.test(id)) {
      return false;
    }

    return this.validateLuhn(id);
  }

  /**
   * Validate credit card using Luhn algorithm
   *
   * @param card - Credit card number (13-19 digits)
   * @returns True if valid
   */
  private validateCreditCard(card: string): boolean {
    if (!/^\d{13,19}$/.test(card)) {
      return false;
    }

    return this.validateLuhn(card);
  }

  /**
   * Luhn algorithm validation (checksum)
   *
   * Used for Israeli ID and credit card validation.
   *
   * @param number - Number string to validate
   * @returns True if Luhn checksum is valid
   */
  private validateLuhn(number: string): boolean {
    let sum = 0;
    let isEven = false;

    // Process digits from right to left
    for (let i = number.length - 1; i >= 0; i--) {
      let digit = parseInt(number[i], 10);

      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }

      sum += digit;
      isEven = !isEven;
    }

    return sum % 10 === 0;
  }

  /**
   * Validate configuration values
   *
   * @throws Error if configuration is invalid
   */
  private validateConfig(): void {
    const validAlgorithms = ["sha256", "sha512"];
    if (!validAlgorithms.includes(this.config.hashAlgorithm)) {
      throw new Error(
        `Unsupported hash algorithm: ${this.config.hashAlgorithm}`
      );
    }

    const validEncodings = ["hex", "base64"];
    if (!validEncodings.includes(this.config.hashEncoding)) {
      throw new Error(`Unsupported encoding: ${this.config.hashEncoding}`);
    }
  }
}
