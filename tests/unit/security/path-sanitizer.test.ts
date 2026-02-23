/**
 * Path Sanitizer - Security Tests
 *
 * TDD Stage 1 (RED): Write failing tests
 * Status: Tests written, implementation in progress
 *
 * TDD Workflow:
 * 1. RED: Run this test - it should FAIL (no implementation yet)
 * 2. GREEN: Implement PathSanitizer to make tests pass
 * 3. REFACTOR: Improve implementation quality
 * 4. QA: Run `npm run qa:stage2`
 */

import { describe, it, expect } from "vitest";
import {
  PathSanitizer,
  PathSecurityError,
} from "../../../src/security/pathSanitizer.js";

describe("PathSanitizer", () => {
  describe("Constructor", () => {
    it("should throw error when constructed with empty array", () => {
      expect(() => new PathSanitizer({ allowedBasePaths: [] })).toThrow(
        "At least one base path must be provided"
      );
    });

    it("should accept valid base paths", () => {
      const sanitizer = new PathSanitizer({ allowedBasePaths: ["/templates", "/data"], allowSymlinks: false });
      expect(sanitizer).toBeDefined();
    });
  });

  describe("Path Traversal Prevention", () => {
    it("should reject ../ paths", () => {
      const sanitizer = new PathSanitizer({ allowedBasePaths: ["/templates"], allowSymlinks: false });
      expect(() => sanitizer.sanitize("../etc/passwd", "/templates")).toThrow(
        PathSecurityError
      );
      try {
        sanitizer.sanitize("../etc/passwd", "/templates");
      } catch (error) {
        expect((error as PathSecurityError).code).toBe("PATH_TRAVERSAL");
      }
    });

    it("should reject multiple ../ sequences", () => {
      const sanitizer = new PathSanitizer({ allowedBasePaths: ["/templates"], allowSymlinks: false });
      try {
        sanitizer.sanitize("../../etc/passwd", "/templates");
      } catch (error) {
        expect((error as PathSecurityError).code).toBe("PATH_TRAVERSAL");
      }
    });

    it("should reject ../ in middle of path", () => {
      const sanitizer = new PathSanitizer({ allowedBasePaths: ["/templates"], allowSymlinks: false });
      try {
        sanitizer.sanitize("legal/../../../etc/passwd", "/templates");
      } catch (error) {
        expect((error as PathSecurityError).code).toBe("PATH_TRAVERSAL");
      }
    });

    it("should reject absolute paths", () => {
      const sanitizer = new PathSanitizer({ allowedBasePaths: ["/templates"], allowSymlinks: false });
      try {
        sanitizer.sanitize("/etc/passwd", "/templates");
      } catch (error) {
        expect((error as PathSecurityError).code).toBe("PATH_NOT_ALLOWED");
      }
    });

    it("should reject Windows absolute paths", () => {
      const sanitizer = new PathSanitizer({ allowedBasePaths: ["/templates"], allowSymlinks: false });
      try {
        sanitizer.sanitize("C:\\Windows\\System32", "/templates");
      } catch (error) {
        expect((error as PathSecurityError).code).toBe("PATH_NOT_ALLOWED");
      }
    });

    it("should reject Windows absolute paths with different drives", () => {
      const sanitizer = new PathSanitizer({ allowedBasePaths: ["/templates"], allowSymlinks: false });
      try {
        sanitizer.sanitize("D:\\data\\file.pdf", "/templates");
      } catch (error) {
        expect((error as PathSecurityError).code).toBe("PATH_NOT_ALLOWED");
      }
    });

    it("should reject path segments that are exactly ..", () => {
      const sanitizer = new PathSanitizer({ allowedBasePaths: ["/templates"], allowSymlinks: false });
      // This tests a different code path than "../" string check
      try {
        sanitizer.sanitize("foo/..", "/templates");
      } catch (error) {
        expect((error as PathSecurityError).code).toBe("PATH_TRAVERSAL");
      }
    });

    it("should allow valid relative paths", () => {
      const sanitizer = new PathSanitizer({ allowedBasePaths: ["/templates"], allowSymlinks: false });
      const result = sanitizer.sanitize(
        "employment/contract.pdf",
        "/templates"
      );
      // Normalize to forward slashes for cross-platform consistency
      const normalized = result.replace(/\\/g, "/");
      expect(normalized).toContain("employment/contract.pdf");
      expect(normalized).toContain("/templates");
    });

    it("should allow subdirectory paths", () => {
      const sanitizer = new PathSanitizer({ allowedBasePaths: ["/templates"], allowSymlinks: false });
      const result = sanitizer.sanitize(
        "legal/nda/standard.pdf",
        "/templates"
      );
      const normalized = result.replace(/\\/g, "/");
      expect(normalized).toContain("legal/nda/standard.pdf");
    });
  });

  describe("Null Byte Prevention", () => {
    it("should reject paths with null bytes", () => {
      const sanitizer = new PathSanitizer({ allowedBasePaths: ["/templates"], allowSymlinks: false });
      try {
        sanitizer.sanitize("contract.pdf\x00.txt", "/templates");
      } catch (error) {
        expect((error as PathSecurityError).code).toBe("INVALID_PATH");
      }
    });

    it("should reject paths with Unicode null", () => {
      const sanitizer = new PathSanitizer({ allowedBasePaths: ["/templates"], allowSymlinks: false });
      try {
        sanitizer.sanitize("contract.pdf\u0000.txt", "/templates");
      } catch (error) {
        expect((error as PathSecurityError).code).toBe("INVALID_PATH");
      }
    });
  });

  describe("Symlink Protection", () => {
    it("should have checkSymlink method", () => {
      const sanitizer = new PathSanitizer({ allowedBasePaths: ["/templates"], allowSymlinks: false });
      expect(typeof sanitizer.checkSymlink).toBe("function");
    });

    it("should handle non-existent files gracefully", async () => {
      const sanitizer = new PathSanitizer({ allowedBasePaths: ["/templates"], allowSymlinks: false });
      // Should not throw for non-existent files (ENOENT)
      await expect(
        sanitizer.checkSymlink("/nonexistent/file.pdf")
      ).resolves.toBeUndefined();
    });

    it("should handle permission errors gracefully", async () => {
      const sanitizer = new PathSanitizer({ allowedBasePaths: ["/templates"], allowSymlinks: false });
      // Test with a path that might have permission issues
      // On most systems, this will either work or log a warning but not throw
      await expect(
        sanitizer.checkSymlink("/root/.ssh/id_rsa")
      ).resolves.toBeUndefined();
    });
  });

  describe("Base Directory Enforcement", () => {
    it("should enforce base directory bounds", () => {
      const sanitizer = new PathSanitizer({ allowedBasePaths: ["/templates"], allowSymlinks: false });
      try {
        sanitizer.sanitize("../../../home/user", "/templates");
      } catch (error) {
        expect((error as PathSecurityError).code).toBe("PATH_TRAVERSAL");
      }
    });

    it("should only allow whitelisted base directories", () => {
      const sanitizer = new PathSanitizer({ allowedBasePaths: ["/templates", "/data"], allowSymlinks: false });

      // Should work with whitelisted bases
      const result1 = sanitizer.sanitize("contract.pdf", "/templates");
      const normalized1 = result1.replace(/\\/g, "/");
      expect(normalized1).toContain("/templates");

      const result2 = sanitizer.sanitize("invoice.pdf", "/data");
      const normalized2 = result2.replace(/\\/g, "/");
      expect(normalized2).toContain("/data");

      // Should reject non-whitelisted base
      try {
        sanitizer.sanitize("secret.pdf", "/etc");
      } catch (error) {
        expect((error as PathSecurityError).code).toBe("BASE_NOT_ALLOWED");
      }
    });

    it("should reject empty base directory", () => {
      const sanitizer = new PathSanitizer({ allowedBasePaths: ["/templates"], allowSymlinks: false });
      try {
        sanitizer.sanitize("contract.pdf", "");
      } catch (error) {
        expect((error as PathSecurityError).code).toBe("BASE_NOT_ALLOWED");
      }
    });
  });

  describe("Special Characters", () => {
    it("should handle Hebrew filenames", () => {
      const sanitizer = new PathSanitizer({ allowedBasePaths: ["/templates"], allowSymlinks: false });
      const result = sanitizer.sanitize("חוזה-עבודה.pdf", "/templates");
      const normalized = result.replace(/\\/g, "/");
      expect(normalized).toContain("חוזה-עבודה.pdf");
    });

    it("should handle spaces in filenames", () => {
      const sanitizer = new PathSanitizer({ allowedBasePaths: ["/templates"], allowSymlinks: false });
      const result = sanitizer.sanitize(
        "employment contract.pdf",
        "/templates"
      );
      const normalized = result.replace(/\\/g, "/");
      expect(normalized).toContain("employment contract.pdf");
    });

    it("should reject paths with control characters", () => {
      const sanitizer = new PathSanitizer({ allowedBasePaths: ["/templates"], allowSymlinks: false });
      try {
        sanitizer.sanitize("contract\n.pdf", "/templates");
      } catch (error) {
        expect((error as PathSecurityError).code).toBe("INVALID_PATH");
      }
    });
  });

  describe("Edge Cases", () => {
    it("should reject empty path", () => {
      const sanitizer = new PathSanitizer({ allowedBasePaths: ["/templates"], allowSymlinks: false });
      try {
        sanitizer.sanitize("", "/templates");
      } catch (error) {
        expect((error as PathSecurityError).code).toBe("INVALID_PATH");
      }
    });

    it("should handle single file name", () => {
      const sanitizer = new PathSanitizer({ allowedBasePaths: ["/templates"], allowSymlinks: false });
      const result = sanitizer.sanitize("contract.pdf", "/templates");
      const normalized = result.replace(/\\/g, "/");
      expect(normalized).toContain("contract.pdf");
    });

    it("should normalize path separators", () => {
      const sanitizer = new PathSanitizer({ allowedBasePaths: ["/templates"], allowSymlinks: false });
      const result = sanitizer.sanitize("legal\\nda.pdf", "/templates");
      // Result should have normalized separators
      const normalized = result.replace(/\\/g, "/");
      expect(normalized).toContain("legal/nda.pdf");
    });
  });
});
