/**
 * Path Sanitizer - Security Component
 *
 * Prevents path traversal attacks and enforces base directory restrictions.
 *
 * Security Features:
 * - Path traversal prevention (../ sequences)
 * - Absolute path blocking
 * - Null byte injection prevention
 * - Symlink detection
 * - Base directory whitelist enforcement
 * - Control character sanitization
 * - Hebrew/Unicode filename support
 *
 * @example Basic usage
 * ```typescript
 * const sanitizer = new PathSanitizer(['/templates']);
 * const safePath = sanitizer.sanitize('employment/contract.pdf', '/templates');
 * // Returns: '/templates/employment/contract.pdf'
 * ```
 *
 * @example Hebrew filenames
 * ```typescript
 * const sanitizer = new PathSanitizer(['/templates']);
 * const safePath = sanitizer.sanitize('חוזה-עבודה.pdf', '/templates');
 * // Returns: '/templates/חוזה-עבודה.pdf'
 * ```
 *
 * @example Attack prevention
 * ```typescript
 * const sanitizer = new PathSanitizer(['/templates']);
 * sanitizer.sanitize('../../../etc/passwd', '/templates'); // Throws PathSecurityError
 * ```
 */

import path from "node:path";
import fs from "node:fs";

/**
 * Error codes for path security violations
 */
export const PathSecurityErrorCodes = {
  PATH_TRAVERSAL: "PATH_TRAVERSAL",
  PATH_NOT_ALLOWED: "PATH_NOT_ALLOWED",
  BASE_NOT_ALLOWED: "BASE_NOT_ALLOWED",
  INVALID_PATH: "INVALID_PATH",
  SYMLINK_NOT_ALLOWED: "SYMLINK_NOT_ALLOWED",
} as const;

export type PathSecurityErrorCode =
  (typeof PathSecurityErrorCodes)[keyof typeof PathSecurityErrorCodes];

/**
 * Security error thrown when path validation fails
 */
export class PathSecurityError extends Error {
  constructor(
    message: string,
    public code: PathSecurityErrorCode
  ) {
    super(message);
    this.name = "PathSecurityError";
  }
}

/**
 * Regular expressions for security checks
 */
const SECURITY_PATTERNS = {
  /** Matches control characters (0x00-0x1F, 0x7F) */
  // eslint-disable-next-line no-control-regex
  CONTROL_CHARS: /[\x00-\x1F\x7F]/,
  /** Matches Windows drive letter (C:, D:, etc.) */
  WINDOWS_DRIVE: /^[a-zA-Z]:/,
  /** Matches path traversal patterns */
  TRAVERSAL: /\.\.[/\\]/,
} as const;

/**
 * Path Sanitizer - Prevents path traversal and enforces security policies
 *
 * This class implements multiple layers of security checks to prevent
 * directory traversal attacks and unauthorized file access.
 *
 * Security Layers:
 * 1. Base directory whitelist validation
 * 2. Empty path rejection
 * 3. Null byte injection prevention
 * 4. Control character sanitization
 * 5. Absolute path blocking
 * 6. Path traversal detection (multiple strategies)
 * 7. Final boundary check after resolution
 * 8. Symlink detection (optional, async)
 */
export class PathSanitizer {
  private readonly allowedBasePaths: Set<string>;

  /**
   * Create a new PathSanitizer
   *
   * @param allowedBasePaths - Whitelist of allowed base directories
   * @throws Error if no base paths provided
   *
   * @example
   * ```typescript
   * const sanitizer = new PathSanitizer(['/templates', '/data']);
   * ```
   */
  constructor(allowedBasePaths: string[]) {
    if (!allowedBasePaths || allowedBasePaths.length === 0) {
      throw new Error("At least one base path must be provided");
    }

    // Normalize and store base paths in a Set for O(1) lookup
    this.allowedBasePaths = new Set(
      allowedBasePaths.map((p) => path.normalize(p))
    );
  }

  /**
   * Sanitize and validate a user-provided path
   *
   * Performs comprehensive security validation and returns a safe absolute path.
   * All validation failures throw PathSecurityError with specific error codes.
   *
   * @param userPath - User-provided path (must be relative)
   * @param basePath - Base directory to resolve against (must be whitelisted)
   * @returns Safe absolute path within the base directory
   * @throws PathSecurityError if any security check fails
   *
   * @example Safe usage
   * ```typescript
   * const sanitizer = new PathSanitizer(['/var/templates']);
   * const safe = sanitizer.sanitize('legal/nda.pdf', '/var/templates');
   * // Returns: '/var/templates/legal/nda.pdf'
   * ```
   *
   * @example Attack blocked
   * ```typescript
   * const sanitizer = new PathSanitizer(['/var/templates']);
   * sanitizer.sanitize('../../../etc/passwd', '/var/templates');
   * // Throws: PathSecurityError with code PATH_TRAVERSAL
   * ```
   */
  sanitize(userPath: string, basePath: string): string {
    // Layer 1: Validate base directory
    this.validateBaseDirectory(basePath);

    // Layer 2: Validate user path is not empty
    this.validateNotEmpty(userPath);

    // Layer 3: Check for null byte injection
    this.validateNoNullBytes(userPath);

    // Layer 4: Check for control characters
    this.validateNoControlCharacters(userPath);

    // Normalize path separators for consistent processing
    const normalizedUserPath = this.normalizeSeparators(userPath);

    // Layer 5: Block absolute paths
    this.validateNotAbsolute(normalizedUserPath);

    // Layer 6: Detect path traversal attempts
    this.validateNoTraversal(normalizedUserPath);

    // Resolve the path (join base + user path)
    const normalizedBase = path.normalize(basePath);
    const resolvedPath = path.join(normalizedBase, normalizedUserPath);

    // Layer 7: Final boundary check - ensure path didn't escape
    this.validateWithinBounds(resolvedPath, normalizedBase);

    return resolvedPath;
  }

  /**
   * Check if a path is a symlink (async)
   *
   * Symlinks can be used to bypass directory restrictions, so they should
   * be detected and blocked in security-sensitive contexts.
   *
   * @param fullPath - Full path to check
   * @throws PathSecurityError if path is a symlink
   *
   * @example
   * ```typescript
   * const sanitizer = new PathSanitizer(['/templates']);
   * await sanitizer.checkSymlink('/templates/contract.pdf'); // OK
   * await sanitizer.checkSymlink('/templates/link-to-etc'); // Throws
   * ```
   */
  async checkSymlink(fullPath: string): Promise<void> {
    try {
      const stats = await fs.promises.lstat(fullPath);
      if (stats.isSymbolicLink()) {
        throw new PathSecurityError(
          "Symlinks are not allowed",
          PathSecurityErrorCodes.SYMLINK_NOT_ALLOWED
        );
      }
    } catch (error) {
      // If file doesn't exist, that's OK for this check
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return;
      }

      // If it's our security error, re-throw
      if (error instanceof PathSecurityError) {
        throw error;
      }

      // Other errors (permissions, etc.) - log warning and continue
      // This prevents permission errors from breaking the application
      console.warn(`Could not check symlink for ${fullPath}:`, error);
    }
  }

  /**
   * Validate base directory is in whitelist
   *
   * @param basePath - Base directory to validate
   * @throws PathSecurityError if base path is empty or not whitelisted
   */
  private validateBaseDirectory(basePath: string): void {
    if (!basePath || basePath.trim() === "") {
      throw new PathSecurityError(
        "Base directory cannot be empty",
        PathSecurityErrorCodes.BASE_NOT_ALLOWED
      );
    }

    const normalizedBase = path.normalize(basePath);
    if (!this.allowedBasePaths.has(normalizedBase)) {
      throw new PathSecurityError(
        `Base directory '${basePath}' is not in whitelist`,
        PathSecurityErrorCodes.BASE_NOT_ALLOWED
      );
    }
  }

  /**
   * Validate path is not empty
   *
   * @param userPath - Path to validate
   * @throws PathSecurityError if path is empty
   */
  private validateNotEmpty(userPath: string): void {
    if (!userPath || userPath.trim() === "") {
      throw new PathSecurityError(
        "Path cannot be empty",
        PathSecurityErrorCodes.INVALID_PATH
      );
    }
  }

  /**
   * Validate path contains no null bytes
   *
   * Null bytes (\x00, \u0000) can be used to bypass extension checks
   * in some systems (e.g., "malicious.pdf\x00.exe")
   *
   * @param userPath - Path to validate
   * @throws PathSecurityError if null bytes detected
   */
  private validateNoNullBytes(userPath: string): void {
    if (userPath.includes("\x00") || userPath.includes("\u0000")) {
      throw new PathSecurityError(
        "Path contains null bytes",
        PathSecurityErrorCodes.INVALID_PATH
      );
    }
  }

  /**
   * Validate path contains no control characters
   *
   * Control characters (0x00-0x1F, 0x7F) can cause unexpected behavior
   * in file systems and should be rejected.
   *
   * @param userPath - Path to validate
   * @throws PathSecurityError if control characters detected
   */
  private validateNoControlCharacters(userPath: string): void {
    if (SECURITY_PATTERNS.CONTROL_CHARS.test(userPath)) {
      throw new PathSecurityError(
        "Path contains control characters",
        PathSecurityErrorCodes.INVALID_PATH
      );
    }
  }

  /**
   * Normalize path separators to forward slashes
   *
   * This ensures consistent processing on both Windows and Unix systems.
   *
   * @param userPath - Path to normalize
   * @returns Path with forward slashes
   */
  private normalizeSeparators(userPath: string): string {
    return userPath.replace(/\\/g, "/");
  }

  /**
   * Validate path is not absolute
   *
   * Absolute paths (e.g., /etc/passwd, C:\Windows) bypass base directory
   * restrictions and must be rejected.
   *
   * @param normalizedPath - Normalized path to validate
   * @throws PathSecurityError if path is absolute
   */
  private validateNotAbsolute(normalizedPath: string): void {
    // Check Unix-style absolute paths (/etc/passwd)
    if (path.isAbsolute(normalizedPath)) {
      throw new PathSecurityError(
        "Absolute paths are not allowed",
        PathSecurityErrorCodes.PATH_NOT_ALLOWED
      );
    }

    // Check Windows-style drive letters (C:, D:, etc.)
    if (SECURITY_PATTERNS.WINDOWS_DRIVE.test(normalizedPath)) {
      throw new PathSecurityError(
        "Absolute paths are not allowed",
        PathSecurityErrorCodes.PATH_NOT_ALLOWED
      );
    }
  }

  /**
   * Validate path contains no traversal sequences
   *
   * Uses multiple strategies to detect path traversal:
   * 1. String pattern matching (../, ..\)
   * 2. Segment analysis (exact ".." matches)
   *
   * @param normalizedPath - Normalized path to validate
   * @throws PathSecurityError if traversal detected
   */
  private validateNoTraversal(normalizedPath: string): void {
    // Strategy 1: Direct pattern match for ../ or ..\
    if (SECURITY_PATTERNS.TRAVERSAL.test(normalizedPath)) {
      throw new PathSecurityError(
        "Path traversal detected",
        PathSecurityErrorCodes.PATH_TRAVERSAL
      );
    }

    // Strategy 2: Check individual path segments
    // This catches cases like "foo/.." that might bypass string matching
    const segments = normalizedPath.split("/");
    if (segments.some((segment) => segment === "..")) {
      throw new PathSecurityError(
        "Path traversal detected",
        PathSecurityErrorCodes.PATH_TRAVERSAL
      );
    }
  }

  /**
   * Validate resolved path stays within base directory
   *
   * This is a final safety net that ensures the resolved path hasn't
   * escaped the base directory through any means (normalization, etc.)
   *
   * @param resolvedPath - Fully resolved path
   * @param basePath - Base directory
   * @throws PathSecurityError if path escapes bounds
   */
  private validateWithinBounds(resolvedPath: string, basePath: string): void {
    const normalizedResolved = path.normalize(resolvedPath);
    if (!normalizedResolved.startsWith(basePath)) {
      throw new PathSecurityError(
        "Resolved path escapes base directory",
        PathSecurityErrorCodes.PATH_TRAVERSAL
      );
    }
  }
}
