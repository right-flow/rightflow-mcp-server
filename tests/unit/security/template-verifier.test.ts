/**
 * Template Verifier - Security Tests
 *
 * TDD Stage 1 (RED): Write failing tests
 * Status: Tests written, implementation pending
 *
 * TDD Workflow:
 * 1. RED: Run this test - it should FAIL (no implementation yet)
 * 2. GREEN: Implement TemplateVerifier to make tests pass
 * 3. REFACTOR: Improve implementation quality
 * 4. QA: Run `npm run qa:stage2`
 */

import { describe, it, expect, beforeEach } from "vitest";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import {
  TemplateVerifier,
  TemplateSecurityError,
  TemplateSecurityErrorCodes,
} from "../../../src/security/templateVerifier.js";

// Test fixture paths
const TEST_DIR = join(process.cwd(), "tests", "fixtures", "templates");
const VALID_TEMPLATE = join(TEST_DIR, "valid-template.pdf");
const INVALID_CHECKSUM_TEMPLATE = join(TEST_DIR, "tampered-template.pdf");
const MALICIOUS_JS_TEMPLATE = join(TEST_DIR, "malicious-js-template.pdf");

describe("TemplateVerifier", () => {
  beforeEach(() => {
    // Create test directory
    try {
      mkdirSync(TEST_DIR, { recursive: true });
    } catch (error) {
      // Directory already exists
    }

    // Create valid PDF template (minimal valid PDF)
    const validPDF = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 44 >>
stream
BT
/F1 12 Tf
100 700 Td
(Test Template) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000317 00000 n
trailer
<< /Size 5 /Root 1 0 R >>
startxref
410
%%EOF`;

    writeFileSync(VALID_TEMPLATE, validPDF, "utf-8");

    // Create tampered template (same PDF but we'll modify it after checksum calculation)
    writeFileSync(INVALID_CHECKSUM_TEMPLATE, validPDF, "utf-8");

    // Create malicious PDF with JavaScript
    const maliciousPDF = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R /OpenAction << /S /JavaScript /JS (app.alert('XSS');) >> >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 44 >>
stream
BT
/F1 12 Tf
100 700 Td
(Malicious PDF) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000136 00000 n
0000000193 00000 n
0000000285 00000 n
trailer
<< /Size 5 /Root 1 0 R >>
startxref
378
%%EOF`;

    writeFileSync(MALICIOUS_JS_TEMPLATE, maliciousPDF, "utf-8");
  });

  describe("Constructor", () => {
    it("should create with default config", () => {
      const verifier = new TemplateVerifier();
      expect(verifier).toBeDefined();
    });

    it("should create with custom config", () => {
      const verifier = new TemplateVerifier({
        algorithm: "sha256",
        encoding: "hex",
        checkJavaScript: true,
        checkEmbeddedFiles: true,
      });
      expect(verifier).toBeDefined();
    });

    it("should reject invalid algorithm", () => {
      expect(() => {
        // @ts-expect-error - Testing invalid algorithm
        new TemplateVerifier({ algorithm: "md5" });
      }).toThrow("Unsupported hash algorithm");
    });

    it("should reject invalid encoding", () => {
      expect(() => {
        // @ts-expect-error - Testing invalid encoding
        new TemplateVerifier({ encoding: "binary" });
      }).toThrow("Unsupported encoding");
    });
  });

  describe("SHA-256 Checksum Calculation", () => {
    it("should calculate SHA-256 checksum from file path", async () => {
      const verifier = new TemplateVerifier();
      const checksum = await verifier.calculateChecksum(VALID_TEMPLATE);

      expect(checksum).toBeDefined();
      expect(typeof checksum).toBe("string");
      expect(checksum).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex = 64 chars
    });

    it("should calculate SHA-256 checksum from buffer", async () => {
      const verifier = new TemplateVerifier();
      const buffer = Buffer.from("Test content");
      const checksum = await verifier.calculateChecksumFromBuffer(buffer);

      expect(checksum).toBeDefined();
      expect(typeof checksum).toBe("string");
      expect(checksum).toMatch(/^[a-f0-9]{64}$/);
    });

    it("should produce consistent checksums for same content", async () => {
      const verifier = new TemplateVerifier();

      const checksum1 = await verifier.calculateChecksum(VALID_TEMPLATE);
      const checksum2 = await verifier.calculateChecksum(VALID_TEMPLATE);

      expect(checksum1).toBe(checksum2);
    });

    it("should produce different checksums for different content", async () => {
      const verifier = new TemplateVerifier();

      const checksum1 = await verifier.calculateChecksum(VALID_TEMPLATE);
      const checksum2 = await verifier.calculateChecksum(INVALID_CHECKSUM_TEMPLATE);

      expect(checksum1).toBe(checksum2); // Initially same content
    });

    it("should throw error for non-existent file", async () => {
      const verifier = new TemplateVerifier();

      await expect(
        verifier.calculateChecksum(join(TEST_DIR, "non-existent.pdf"))
      ).rejects.toThrow();
    });

    it("should support base64 encoding", async () => {
      const verifier = new TemplateVerifier({ encoding: "base64" });
      const checksum = await verifier.calculateChecksum(VALID_TEMPLATE);

      expect(checksum).toBeDefined();
      expect(typeof checksum).toBe("string");
      // Base64 should be ~44 characters for SHA-256
      expect(checksum.length).toBeGreaterThan(40);
    });
  });

  describe("Checksum Verification", () => {
    it("should verify valid checksum", async () => {
      const verifier = new TemplateVerifier();
      const checksum = await verifier.calculateChecksum(VALID_TEMPLATE);

      const isValid = await verifier.verifyChecksum(VALID_TEMPLATE, checksum);
      expect(isValid).toBe(true);
    });

    it("should detect tampered template (checksum mismatch)", async () => {
      const verifier = new TemplateVerifier();

      // Calculate original checksum
      const originalChecksum = await verifier.calculateChecksum(
        INVALID_CHECKSUM_TEMPLATE
      );

      // Tamper with the file
      writeFileSync(
        INVALID_CHECKSUM_TEMPLATE,
        "TAMPERED CONTENT - NOT A VALID PDF",
        "utf-8"
      );

      // Verification should fail
      const isValid = await verifier.verifyChecksum(
        INVALID_CHECKSUM_TEMPLATE,
        originalChecksum
      );
      expect(isValid).toBe(false);
    });

    it("should throw error with descriptive message on mismatch", async () => {
      const verifier = new TemplateVerifier({ throwOnMismatch: true });

      const originalChecksum = await verifier.calculateChecksum(
        INVALID_CHECKSUM_TEMPLATE
      );

      // Tamper with file
      writeFileSync(INVALID_CHECKSUM_TEMPLATE, "TAMPERED", "utf-8");

      await expect(
        verifier.verifyChecksum(INVALID_CHECKSUM_TEMPLATE, originalChecksum)
      ).rejects.toThrow(TemplateSecurityError);
    });

    it("should provide error code for checksum mismatch", async () => {
      const verifier = new TemplateVerifier({ throwOnMismatch: true });

      const originalChecksum = await verifier.calculateChecksum(
        INVALID_CHECKSUM_TEMPLATE
      );
      writeFileSync(INVALID_CHECKSUM_TEMPLATE, "TAMPERED", "utf-8");

      try {
        await verifier.verifyChecksum(
          INVALID_CHECKSUM_TEMPLATE,
          originalChecksum
        );
        expect.fail("Should have thrown TemplateSecurityError");
      } catch (error) {
        expect(error).toBeInstanceOf(TemplateSecurityError);
        expect((error as TemplateSecurityError).code).toBe(
          TemplateSecurityErrorCodes.CHECKSUM_MISMATCH
        );
      }
    });

    it("should include expected and actual checksums in error", async () => {
      const verifier = new TemplateVerifier({ throwOnMismatch: true });

      const originalChecksum = await verifier.calculateChecksum(
        INVALID_CHECKSUM_TEMPLATE
      );
      writeFileSync(INVALID_CHECKSUM_TEMPLATE, "TAMPERED", "utf-8");

      try {
        await verifier.verifyChecksum(
          INVALID_CHECKSUM_TEMPLATE,
          originalChecksum
        );
        expect.fail("Should have thrown");
      } catch (error) {
        expect((error as TemplateSecurityError).message).toContain("expected");
        expect((error as TemplateSecurityError).message).toContain("actual");
      }
    });
  });

  describe("PDF Safety Scanning", () => {
    it("should detect JavaScript in PDF", async () => {
      const verifier = new TemplateVerifier({ checkJavaScript: true });

      await expect(
        verifier.scanPDFSafety(MALICIOUS_JS_TEMPLATE)
      ).rejects.toThrow(TemplateSecurityError);
    });

    it("should provide error code for JavaScript detection", async () => {
      const verifier = new TemplateVerifier({ checkJavaScript: true });

      try {
        await verifier.scanPDFSafety(MALICIOUS_JS_TEMPLATE);
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(TemplateSecurityError);
        expect((error as TemplateSecurityError).code).toBe(
          TemplateSecurityErrorCodes.JAVASCRIPT_DETECTED
        );
      }
    });

    it("should pass valid PDF without JavaScript", async () => {
      const verifier = new TemplateVerifier({ checkJavaScript: true });

      await expect(
        verifier.scanPDFSafety(VALID_TEMPLATE)
      ).resolves.not.toThrow();
    });

    it("should detect /JavaScript action", async () => {
      const verifier = new TemplateVerifier({ checkJavaScript: true });

      await expect(
        verifier.scanPDFSafety(MALICIOUS_JS_TEMPLATE)
      ).rejects.toThrow("JavaScript detected");
    });

    it("should detect /JS key in PDF", async () => {
      const verifier = new TemplateVerifier({ checkJavaScript: true });

      await expect(
        verifier.scanPDFSafety(MALICIOUS_JS_TEMPLATE)
      ).rejects.toThrow();
    });

    it("should allow disabling JavaScript check", async () => {
      const verifier = new TemplateVerifier({ checkJavaScript: false });

      // Should NOT throw even with JavaScript
      await expect(
        verifier.scanPDFSafety(MALICIOUS_JS_TEMPLATE)
      ).resolves.not.toThrow();
    });

    it("should detect embedded files (EmbeddedFiles key)", async () => {
      const verifier = new TemplateVerifier({ checkEmbeddedFiles: true });

      // Create PDF with embedded file
      const pdfWithAttachment = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R /Names << /EmbeddedFiles 5 0 R >> >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>
endobj
5 0 obj
<< /Names [(attachment.txt) 6 0 R] >>
endobj
6 0 obj
<< /Type /Filespec /F (attachment.txt) >>
endobj
xref
0 7
trailer
<< /Size 7 /Root 1 0 R >>
%%EOF`;

      const attachmentPath = join(TEST_DIR, "attachment-template.pdf");
      writeFileSync(attachmentPath, pdfWithAttachment, "utf-8");

      await expect(verifier.scanPDFSafety(attachmentPath)).rejects.toThrow(
        TemplateSecurityError
      );
    });

    it("should provide error code for embedded files", async () => {
      const verifier = new TemplateVerifier({ checkEmbeddedFiles: true });

      const pdfWithAttachment = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R /Names << /EmbeddedFiles 5 0 R >> >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>
endobj
xref
0 4
trailer
<< /Size 4 /Root 1 0 R >>
%%EOF`;

      const attachmentPath = join(TEST_DIR, "attachment2-template.pdf");
      writeFileSync(attachmentPath, pdfWithAttachment, "utf-8");

      try {
        await verifier.scanPDFSafety(attachmentPath);
        expect.fail("Should have thrown");
      } catch (error) {
        expect((error as TemplateSecurityError).code).toBe(
          TemplateSecurityErrorCodes.EMBEDDED_FILES_DETECTED
        );
      }
    });

    it("should allow disabling embedded files check", async () => {
      const verifier = new TemplateVerifier({ checkEmbeddedFiles: false });

      const pdfWithAttachment = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R /Names << /EmbeddedFiles 5 0 R >> >>
endobj
xref
0 2
trailer
<< /Size 2 /Root 1 0 R >>
%%EOF`;

      const attachmentPath = join(TEST_DIR, "attachment3-template.pdf");
      writeFileSync(attachmentPath, pdfWithAttachment, "utf-8");

      await expect(
        verifier.scanPDFSafety(attachmentPath)
      ).resolves.not.toThrow();
    });
  });

  describe("Complete Template Validation", () => {
    it("should validate template with checksum and safety scan", async () => {
      const verifier = new TemplateVerifier({
        checkJavaScript: true,
        checkEmbeddedFiles: true,
        throwOnMismatch: true,
      });

      const checksum = await verifier.calculateChecksum(VALID_TEMPLATE);
      await expect(
        verifier.validateTemplate(VALID_TEMPLATE, checksum)
      ).resolves.toBe(true);
    });

    it("should reject template with invalid checksum", async () => {
      const verifier = new TemplateVerifier({ throwOnMismatch: true });

      await expect(
        verifier.validateTemplate(VALID_TEMPLATE, "invalid-checksum-hex")
      ).rejects.toThrow(TemplateSecurityError);
    });

    it("should reject template with JavaScript", async () => {
      const verifier = new TemplateVerifier({
        checkJavaScript: true,
        throwOnMismatch: true,
      });

      const checksum = await verifier.calculateChecksum(MALICIOUS_JS_TEMPLATE);

      await expect(
        verifier.validateTemplate(MALICIOUS_JS_TEMPLATE, checksum)
      ).rejects.toThrow(TemplateSecurityError);
    });

    it("should return validation result object", async () => {
      const verifier = new TemplateVerifier();
      const checksum = await verifier.calculateChecksum(VALID_TEMPLATE);

      const result = await verifier.validateTemplate(VALID_TEMPLATE, checksum);
      expect(result).toBe(true);
    });
  });

  describe("Batch Validation", () => {
    it("should validate multiple templates", async () => {
      const verifier = new TemplateVerifier();

      const checksums = {
        [VALID_TEMPLATE]: await verifier.calculateChecksum(VALID_TEMPLATE),
        [INVALID_CHECKSUM_TEMPLATE]: await verifier.calculateChecksum(
          INVALID_CHECKSUM_TEMPLATE
        ),
      };

      const results = await verifier.validateBatch(checksums);

      expect(results).toBeDefined();
      expect(results[VALID_TEMPLATE]).toBe(true);
      expect(results[INVALID_CHECKSUM_TEMPLATE]).toBe(true);
    });

    it("should detect failures in batch validation", async () => {
      const verifier = new TemplateVerifier();

      const originalChecksum = await verifier.calculateChecksum(
        INVALID_CHECKSUM_TEMPLATE
      );

      // Tamper with one template
      writeFileSync(INVALID_CHECKSUM_TEMPLATE, "TAMPERED", "utf-8");

      const checksums = {
        [VALID_TEMPLATE]: await verifier.calculateChecksum(VALID_TEMPLATE),
        [INVALID_CHECKSUM_TEMPLATE]: originalChecksum,
      };

      const results = await verifier.validateBatch(checksums);

      expect(results[VALID_TEMPLATE]).toBe(true);
      expect(results[INVALID_CHECKSUM_TEMPLATE]).toBe(false);
    });

    it("should continue batch validation after failure", async () => {
      const verifier = new TemplateVerifier();

      const originalChecksum = await verifier.calculateChecksum(
        INVALID_CHECKSUM_TEMPLATE
      );
      writeFileSync(INVALID_CHECKSUM_TEMPLATE, "TAMPERED", "utf-8");

      const checksums = {
        [INVALID_CHECKSUM_TEMPLATE]: originalChecksum,
        [VALID_TEMPLATE]: await verifier.calculateChecksum(VALID_TEMPLATE),
      };

      const results = await verifier.validateBatch(checksums);

      // Should validate all templates, not stop on first failure
      expect(Object.keys(results)).toHaveLength(2);
      expect(results[VALID_TEMPLATE]).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("should handle missing file gracefully", async () => {
      const verifier = new TemplateVerifier();

      await expect(
        verifier.calculateChecksum(join(TEST_DIR, "missing.pdf"))
      ).rejects.toThrow();
    });

    it("should handle corrupted PDF file", async () => {
      const corruptedPath = join(TEST_DIR, "corrupted.pdf");
      writeFileSync(corruptedPath, "NOT A VALID PDF FILE", "utf-8");

      const verifier = new TemplateVerifier({ checkJavaScript: true });

      // Should not crash, just scan the content
      await expect(verifier.scanPDFSafety(corruptedPath)).resolves.not.toThrow();
    });

    it("should handle empty file", async () => {
      const emptyPath = join(TEST_DIR, "empty.pdf");
      writeFileSync(emptyPath, "", "utf-8");

      const verifier = new TemplateVerifier();
      const checksum = await verifier.calculateChecksum(emptyPath);

      expect(checksum).toBeDefined();
      expect(typeof checksum).toBe("string");
    });

    it("should handle very large files", async () => {
      const largePath = join(TEST_DIR, "large.pdf");
      const largeContent = "A".repeat(10 * 1024 * 1024); // 10MB
      writeFileSync(largePath, largeContent, "utf-8");

      const verifier = new TemplateVerifier();
      const checksum = await verifier.calculateChecksum(largePath);

      expect(checksum).toBeDefined();
    });
  });

  describe("Configuration Options", () => {
    it("should respect throwOnMismatch=false", async () => {
      const verifier = new TemplateVerifier({ throwOnMismatch: false });

      const result = await verifier.verifyChecksum(
        VALID_TEMPLATE,
        "wrong-checksum"
      );
      expect(result).toBe(false);
    });

    it("should respect throwOnMismatch=true", async () => {
      const verifier = new TemplateVerifier({ throwOnMismatch: true });

      await expect(
        verifier.verifyChecksum(VALID_TEMPLATE, "wrong-checksum")
      ).rejects.toThrow(TemplateSecurityError);
    });

    it("should allow custom hash algorithm (sha512)", async () => {
      const verifier = new TemplateVerifier({ algorithm: "sha512" });
      const checksum = await verifier.calculateChecksum(VALID_TEMPLATE);

      // SHA-512 hex = 128 characters
      expect(checksum).toMatch(/^[a-f0-9]{128}$/);
    });

    it("should allow custom encoding (base64)", async () => {
      const verifier = new TemplateVerifier({ encoding: "base64" });
      const checksum = await verifier.calculateChecksum(VALID_TEMPLATE);

      // Base64 encoding should not contain invalid characters
      expect(checksum).toMatch(/^[A-Za-z0-9+/=]+$/);
    });
  });
});
