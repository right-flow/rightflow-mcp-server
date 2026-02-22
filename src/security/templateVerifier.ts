/**
 * Template Verifier - Security Component
 *
 * Implements template integrity verification and PDF safety scanning.
 *
 * Security Features:
 * - SHA-256/SHA-512 checksum verification
 * - Template tampering detection
 * - JavaScript injection detection
 * - Embedded file detection
 * - Batch validation support
 * - Configurable safety checks
 *
 * @example Basic usage
 * ```typescript
 * const verifier = new TemplateVerifier();
 * const checksum = await verifier.calculateChecksum('template.pdf');
 * const isValid = await verifier.verifyChecksum('template.pdf', checksum);
 * ```
 *
 * @example Safety scanning
 * ```typescript
 * const verifier = new TemplateVerifier({
 *   checkJavaScript: true,
 *   checkEmbeddedFiles: true
 * });
 * await verifier.scanPDFSafety('template.pdf'); // Throws if unsafe
 * ```
 */

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

/**
 * Template verifier configuration options
 */
export interface TemplateVerifierConfig {
  /** Hash algorithm (default: 'sha256') */
  algorithm?: "sha256" | "sha512";
  /** Output encoding (default: 'hex') */
  encoding?: "hex" | "base64";
  /** Check for JavaScript in PDFs (default: false) */
  checkJavaScript?: boolean;
  /** Check for embedded files in PDFs (default: false) */
  checkEmbeddedFiles?: boolean;
  /** Throw error on checksum mismatch (default: false) */
  throwOnMismatch?: boolean;
}

/**
 * Error codes for template security violations
 */
export const TemplateSecurityErrorCodes = {
  CHECKSUM_MISMATCH: "CHECKSUM_MISMATCH",
  JAVASCRIPT_DETECTED: "JAVASCRIPT_DETECTED",
  EMBEDDED_FILES_DETECTED: "EMBEDDED_FILES_DETECTED",
  INVALID_ALGORITHM: "INVALID_ALGORITHM",
  INVALID_ENCODING: "INVALID_ENCODING",
} as const;

export type TemplateSecurityErrorCode =
  (typeof TemplateSecurityErrorCodes)[keyof typeof TemplateSecurityErrorCodes];

/**
 * Error thrown when template security violations are detected
 */
export class TemplateSecurityError extends Error {
  constructor(
    message: string,
    public code: TemplateSecurityErrorCode,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "TemplateSecurityError";
  }
}

/**
 * Validation result for batch operations
 */
export type ValidationResults = Record<string, boolean>;

/**
 * Template Verifier - Integrity verification and PDF safety scanning
 *
 * Implements comprehensive template security:
 * - SHA-256/SHA-512 checksum calculation and verification
 * - Detects template tampering via checksum mismatch
 * - Scans PDFs for JavaScript injection attacks
 * - Detects embedded files that could contain malware
 * - Batch validation for multiple templates
 * - Configurable safety checks and error handling
 *
 * Common attack scenarios prevented:
 * - Template modification/tampering (checksum verification)
 * - JavaScript injection in PDFs (malicious code execution)
 * - Embedded malware files (hidden attachments)
 * - PDF-based phishing attacks
 */
export class TemplateVerifier {
  private readonly config: Required<TemplateVerifierConfig>;

  /**
   * Create a new Template Verifier
   *
   * @param config - Verifier configuration
   * @throws Error if configuration is invalid
   *
   * @example
   * ```typescript
   * const verifier = new TemplateVerifier({
   *   algorithm: 'sha256',
   *   encoding: 'hex',
   *   checkJavaScript: true,
   *   checkEmbeddedFiles: true,
   *   throwOnMismatch: true,
   * });
   * ```
   */
  constructor(config: TemplateVerifierConfig = {}) {
    this.config = {
      algorithm: config.algorithm ?? "sha256",
      encoding: config.encoding ?? "hex",
      checkJavaScript: config.checkJavaScript ?? false,
      checkEmbeddedFiles: config.checkEmbeddedFiles ?? false,
      throwOnMismatch: config.throwOnMismatch ?? false,
    };

    this.validateConfig();
  }

  /**
   * Calculate SHA-256/SHA-512 checksum from file path
   *
   * Reads the file and computes cryptographic hash for integrity verification.
   *
   * @param filePath - Path to template file
   * @returns Checksum string (hex or base64)
   * @throws Error if file cannot be read
   *
   * @example
   * ```typescript
   * const verifier = new TemplateVerifier();
   * const checksum = await verifier.calculateChecksum('template.pdf');
   * console.log(checksum); // "a1b2c3d4..."
   * ```
   */
  async calculateChecksum(filePath: string): Promise<string> {
    const fileContent = await readFile(filePath);
    return this.calculateChecksumFromBuffer(fileContent);
  }

  /**
   * Calculate SHA-256/SHA-512 checksum from buffer
   *
   * Computes cryptographic hash of buffer content.
   *
   * @param buffer - File content as buffer
   * @returns Checksum string (hex or base64)
   *
   * @example
   * ```typescript
   * const verifier = new TemplateVerifier();
   * const buffer = Buffer.from('content');
   * const checksum = await verifier.calculateChecksumFromBuffer(buffer);
   * ```
   */
  async calculateChecksumFromBuffer(buffer: Buffer): Promise<string> {
    const hash = createHash(this.config.algorithm);
    hash.update(buffer);
    return hash.digest(this.config.encoding);
  }

  /**
   * Verify template checksum matches expected value
   *
   * Compares calculated checksum with expected value to detect tampering.
   *
   * @param filePath - Path to template file
   * @param expectedChecksum - Expected checksum value
   * @returns True if checksums match, false otherwise
   * @throws TemplateSecurityError if throwOnMismatch enabled and checksums don't match
   *
   * @example
   * ```typescript
   * const verifier = new TemplateVerifier();
   * const isValid = await verifier.verifyChecksum('template.pdf', storedChecksum);
   * if (!isValid) {
   *   console.error('Template has been tampered with!');
   * }
   * ```
   */
  async verifyChecksum(
    filePath: string,
    expectedChecksum: string
  ): Promise<boolean> {
    const actualChecksum = await this.calculateChecksum(filePath);

    if (actualChecksum !== expectedChecksum) {
      if (this.config.throwOnMismatch) {
        throw new TemplateSecurityError(
          `Checksum mismatch: expected ${expectedChecksum}, actual ${actualChecksum}`,
          TemplateSecurityErrorCodes.CHECKSUM_MISMATCH,
          {
            expected: expectedChecksum,
            actual: actualChecksum,
            filePath,
          }
        );
      }
      return false;
    }

    return true;
  }

  /**
   * Scan PDF for security threats
   *
   * Scans PDF content for:
   * - JavaScript code (if checkJavaScript enabled)
   * - Embedded files (if checkEmbeddedFiles enabled)
   *
   * @param filePath - Path to PDF file
   * @throws TemplateSecurityError if threats detected
   *
   * @example
   * ```typescript
   * const verifier = new TemplateVerifier({
   *   checkJavaScript: true,
   *   checkEmbeddedFiles: true
   * });
   *
   * try {
   *   await verifier.scanPDFSafety('template.pdf');
   *   console.log('PDF is safe');
   * } catch (error) {
   *   console.error('Security threat detected:', error.message);
   * }
   * ```
   */
  async scanPDFSafety(filePath: string): Promise<void> {
    const content = await readFile(filePath, "utf-8");

    // Check for JavaScript injection
    if (this.config.checkJavaScript) {
      this.checkForJavaScript(content);
    }

    // Check for embedded files
    if (this.config.checkEmbeddedFiles) {
      this.checkForEmbeddedFiles(content);
    }
  }

  /**
   * Validate template (checksum + safety scan)
   *
   * Performs complete validation:
   * 1. Verifies checksum matches expected value
   * 2. Scans PDF for security threats
   *
   * @param filePath - Path to template file
   * @param expectedChecksum - Expected checksum value
   * @returns True if valid, false otherwise
   * @throws TemplateSecurityError if security threats detected
   *
   * @example
   * ```typescript
   * const verifier = new TemplateVerifier({
   *   checkJavaScript: true,
   *   throwOnMismatch: true
   * });
   *
   * const isValid = await verifier.validateTemplate('template.pdf', checksum);
   * ```
   */
  async validateTemplate(
    filePath: string,
    expectedChecksum: string
  ): Promise<boolean> {
    // 1. Verify checksum
    const checksumValid = await this.verifyChecksum(filePath, expectedChecksum);

    if (!checksumValid) {
      return false;
    }

    // 2. Scan for security threats
    await this.scanPDFSafety(filePath);

    return true;
  }

  /**
   * Validate multiple templates in batch
   *
   * Validates each template and returns results map.
   * Continues validation even if some templates fail.
   *
   * @param checksums - Map of file paths to expected checksums
   * @returns Map of file paths to validation results (true/false)
   *
   * @example
   * ```typescript
   * const verifier = new TemplateVerifier();
   * const checksums = {
   *   'template1.pdf': 'checksum1',
   *   'template2.pdf': 'checksum2',
   * };
   *
   * const results = await verifier.validateBatch(checksums);
   * console.log(results); // { 'template1.pdf': true, 'template2.pdf': false }
   * ```
   */
  async validateBatch(checksums: Record<string, string>): Promise<ValidationResults> {
    const results: ValidationResults = {};

    // Validate each template (don't stop on first failure)
    for (const [filePath, expectedChecksum] of Object.entries(checksums)) {
      try {
        // Use non-throwing mode for batch operations
        const originalThrowOnMismatch = this.config.throwOnMismatch;
        this.config.throwOnMismatch = false;

        results[filePath] = await this.validateTemplate(filePath, expectedChecksum);

        // Restore original setting
        this.config.throwOnMismatch = originalThrowOnMismatch;
      } catch (error) {
        // Security errors (JavaScript, embedded files) should still fail
        results[filePath] = false;
      }
    }

    return results;
  }

  /**
   * Check PDF content for JavaScript code
   *
   * Detects common JavaScript patterns in PDFs:
   * - /JavaScript action
   * - /JS key
   *
   * @param content - PDF file content
   * @throws TemplateSecurityError if JavaScript detected
   */
  private checkForJavaScript(content: string): void {
    // Check for /JavaScript action
    if (content.includes("/JavaScript") || content.includes("/JS")) {
      throw new TemplateSecurityError(
        "JavaScript detected in PDF template",
        TemplateSecurityErrorCodes.JAVASCRIPT_DETECTED
      );
    }
  }

  /**
   * Check PDF content for embedded files
   *
   * Detects embedded file indicators:
   * - /EmbeddedFiles key in Names dictionary
   *
   * @param content - PDF file content
   * @throws TemplateSecurityError if embedded files detected
   */
  private checkForEmbeddedFiles(content: string): void {
    if (content.includes("/EmbeddedFiles")) {
      throw new TemplateSecurityError(
        "Embedded files detected in PDF template",
        TemplateSecurityErrorCodes.EMBEDDED_FILES_DETECTED
      );
    }
  }

  /**
   * Validate configuration values
   *
   * @throws Error if configuration is invalid
   */
  private validateConfig(): void {
    const validAlgorithms = ["sha256", "sha512"];
    if (!validAlgorithms.includes(this.config.algorithm)) {
      throw new Error(
        `Unsupported hash algorithm: ${this.config.algorithm}. Valid: ${validAlgorithms.join(", ")}`
      );
    }

    const validEncodings = ["hex", "base64"];
    if (!validEncodings.includes(this.config.encoding)) {
      throw new Error(
        `Unsupported encoding: ${this.config.encoding}. Valid: ${validEncodings.join(", ")}`
      );
    }
  }
}
