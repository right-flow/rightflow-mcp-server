/**
 * Path Sanitizer - Security Component
 *
 * Prevents path traversal attacks and enforces base directory restrictions.
 *
 * Security Features:
 * - Path traversal prevention (../ sequences)
 * - Absolute path blocking
 * - Null byte injection prevention
 * - Symlink detection (placeholder)
 * - Base directory whitelist enforcement
 * - Control character sanitization
 *
 * @example
 * ```typescript
 * const sanitizer = new PathSanitizer(['/templates']);
 * const safePath = sanitizer.sanitize('employment/contract.pdf', '/templates');
 * // Returns: '/templates/employment/contract.pdf'
 * ```
 */

import path from "node:path";
import fs from "node:fs";

/**
 * Security errors thrown by PathSanitizer
 */
export class PathSecurityError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message);
    this.name = "PathSecurityError";
  }
}

/**
 * Path Sanitizer - Prevents path traversal and enforces security policies
 */
export class PathSanitizer {
  private allowedBasePaths: Set<string>;

  /**
   * Create a new PathSanitizer
   * @param allowedBasePaths - Whitelist of allowed base directories
   */
  constructor(allowedBasePaths: string[]) {
    if (!allowedBasePaths || allowedBasePaths.length === 0) {
      throw new Error("At least one base path must be provided");
    }

    // Normalize and store base paths
    this.allowedBasePaths = new Set(
      allowedBasePaths.map((p) => path.normalize(p))
    );
  }

  /**
   * Sanitize and validate a user-provided path
   *
   * @param userPath - User-provided path (relative)
   * @param basePath - Base directory to resolve against
   * @returns Safe absolute path
   * @throws PathSecurityError if path is invalid or unsafe
   */
  sanitize(userPath: string, basePath: string): string {
    // Validate base path
    if (!basePath || basePath.trim() === "") {
      throw new PathSecurityError(
        "Base directory cannot be empty",
        "BASE_NOT_ALLOWED"
      );
    }

    const normalizedBase = path.normalize(basePath);

    if (!this.allowedBasePaths.has(normalizedBase)) {
      throw new PathSecurityError(
        `Base directory '${basePath}' is not in whitelist`,
        "BASE_NOT_ALLOWED"
      );
    }

    // Validate user path
    if (!userPath || userPath.trim() === "") {
      throw new PathSecurityError("Path cannot be empty", "INVALID_PATH");
    }

    // Check for null bytes (security vulnerability)
    if (userPath.includes("\x00") || userPath.includes("\u0000")) {
      throw new PathSecurityError(
        "Path contains null bytes",
        "INVALID_PATH"
      );
    }

    // Check for control characters
    // eslint-disable-next-line no-control-regex
    if (/[\x00-\x1F\x7F]/.test(userPath)) {
      throw new PathSecurityError(
        "Path contains control characters",
        "INVALID_PATH"
      );
    }

    // Normalize path separators (convert backslashes to forward slashes)
    const normalizedUserPath = userPath.replace(/\\/g, "/");

    // Check for absolute paths (security risk)
    if (path.isAbsolute(normalizedUserPath)) {
      throw new PathSecurityError(
        "Absolute paths are not allowed",
        "PATH_NOT_ALLOWED"
      );
    }

    // Check for Windows absolute paths (C:\ format)
    if (/^[a-zA-Z]:/.test(normalizedUserPath)) {
      throw new PathSecurityError(
        "Absolute paths are not allowed",
        "PATH_NOT_ALLOWED"
      );
    }

    // Check for path traversal attempts (../)
    if (normalizedUserPath.includes("../") || normalizedUserPath.includes("..\\")) {
      throw new PathSecurityError(
        "Path traversal detected",
        "PATH_TRAVERSAL"
      );
    }

    // Check for path segments that are exactly ".."
    const segments = normalizedUserPath.split("/");
    if (segments.some((segment) => segment === "..")) {
      throw new PathSecurityError(
        "Path traversal detected",
        "PATH_TRAVERSAL"
      );
    }

    // Resolve the path (join base + user path)
    const resolvedPath = path.join(normalizedBase, normalizedUserPath);

    // Final security check: ensure resolved path is still within base directory
    const normalizedResolved = path.normalize(resolvedPath);
    if (!normalizedResolved.startsWith(normalizedBase)) {
      throw new PathSecurityError(
        "Resolved path escapes base directory",
        "PATH_TRAVERSAL"
      );
    }

    return normalizedResolved;
  }

  /**
   * Check if a path is a symlink (async)
   *
   * @param fullPath - Full path to check
   * @throws PathSecurityError if path is a symlink
   */
  async checkSymlink(fullPath: string): Promise<void> {
    try {
      const stats = await fs.promises.lstat(fullPath);
      if (stats.isSymbolicLink()) {
        throw new PathSecurityError(
          "Symlinks are not allowed",
          "SYMLINK_NOT_ALLOWED"
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
      // Other errors (permissions, etc.) - log and continue
      console.warn(`Could not check symlink for ${fullPath}:`, error);
    }
  }
}
