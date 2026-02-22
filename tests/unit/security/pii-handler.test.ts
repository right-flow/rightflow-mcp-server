/**
 * PII Handler - Security Tests
 *
 * TDD Stage 1 (RED): Write failing tests
 * Status: Tests written, implementation pending
 *
 * TDD Workflow:
 * 1. RED: Run this test - it should FAIL (no implementation yet)
 * 2. GREEN: Implement PIIHandler to make tests pass
 * 3. REFACTOR: Improve implementation quality
 * 4. QA: Run `npm run qa:stage2`
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  PIIHandler,
  PIIType,
} from "../../../src/security/piiHandler.js";

describe("PIIHandler", () => {
  let handler: PIIHandler;

  beforeEach(() => {
    handler = new PIIHandler();
  });

  describe("Constructor", () => {
    it("should create with default config", () => {
      const handler = new PIIHandler();
      expect(handler).toBeDefined();
    });

    it("should create with custom config", () => {
      const handler = new PIIHandler({
        hashAlgorithm: "sha256",
        hashEncoding: "hex",
        secureErase: true,
        enableLogging: false,
      });
      expect(handler).toBeDefined();
    });

    it("should reject invalid hash algorithm", () => {
      expect(() => {
        // @ts-expect-error - Testing invalid algorithm
        new PIIHandler({ hashAlgorithm: "md5" });
      }).toThrow("Unsupported hash algorithm");
    });

    it("should reject invalid hash encoding", () => {
      expect(() => {
        // @ts-expect-error - Testing invalid encoding
        new PIIHandler({ hashEncoding: "binary" });
      }).toThrow("Unsupported encoding");
    });
  });

  describe("PII Detection", () => {
    describe("Israeli ID Number", () => {
      it("should detect valid Israeli ID (9 digits)", () => {
        const result = handler.detectPII("000000018"); // Valid Israeli ID
        expect(result.detected).toBe(true);
        expect(result.types).toContain(PIIType.ISRAELI_ID);
      });

      it("should detect Israeli ID with dashes", () => {
        const result = handler.detectPII("000-000-018");
        expect(result.detected).toBe(true);
        expect(result.types).toContain(PIIType.ISRAELI_ID);
      });

      it("should not detect invalid Israeli ID (wrong checksum)", () => {
        const result = handler.detectPII("123456789");
        expect(result.types).not.toContain(PIIType.ISRAELI_ID);
      });

      it("should detect Israeli ID in mixed content", () => {
        const result = handler.detectPII(
          "Customer ID is 000000018, please verify."
        );
        expect(result.detected).toBe(true);
        expect(result.types).toContain(PIIType.ISRAELI_ID);
      });
    });

    describe("Credit Card Numbers", () => {
      it("should detect Visa credit card", () => {
        const result = handler.detectPII("4111111111111111"); // Test Visa
        expect(result.detected).toBe(true);
        expect(result.types).toContain(PIIType.CREDIT_CARD);
      });

      it("should detect Mastercard", () => {
        const result = handler.detectPII("5500000000000004"); // Test Mastercard
        expect(result.detected).toBe(true);
        expect(result.types).toContain(PIIType.CREDIT_CARD);
      });

      it("should detect credit card with spaces", () => {
        const result = handler.detectPII("4111 1111 1111 1111");
        expect(result.detected).toBe(true);
        expect(result.types).toContain(PIIType.CREDIT_CARD);
      });

      it("should detect credit card with dashes", () => {
        const result = handler.detectPII("4111-1111-1111-1111");
        expect(result.detected).toBe(true);
        expect(result.types).toContain(PIIType.CREDIT_CARD);
      });

      it("should not detect invalid credit card (wrong Luhn)", () => {
        const result = handler.detectPII("4111111111111112");
        expect(result.types).not.toContain(PIIType.CREDIT_CARD);
      });
    });

    describe("Email Addresses", () => {
      it("should detect email address", () => {
        const result = handler.detectPII("user@example.com");
        expect(result.detected).toBe(true);
        expect(result.types).toContain(PIIType.EMAIL);
      });

      it("should detect email in mixed content", () => {
        const result = handler.detectPII(
          "Contact us at support@company.com for help"
        );
        expect(result.detected).toBe(true);
        expect(result.types).toContain(PIIType.EMAIL);
      });

      it("should detect multiple emails", () => {
        const result = handler.detectPII(
          "Email: user@example.com or admin@example.com"
        );
        expect(result.detected).toBe(true);
        expect(result.types).toContain(PIIType.EMAIL);
      });

      it("should detect email with Hebrew domain", () => {
        const result = handler.detectPII("user@דוגמה.il");
        expect(result.detected).toBe(true);
        expect(result.types).toContain(PIIType.EMAIL);
      });
    });

    describe("Israeli Phone Numbers", () => {
      it("should detect Israeli mobile number (05X-XXX-XXXX)", () => {
        const result = handler.detectPII("050-1234567");
        expect(result.detected).toBe(true);
        expect(result.types).toContain(PIIType.PHONE);
      });

      it("should detect Israeli mobile without dashes", () => {
        const result = handler.detectPII("0501234567");
        expect(result.detected).toBe(true);
        expect(result.types).toContain(PIIType.PHONE);
      });

      it("should detect Israeli landline (0X-XXX-XXXX)", () => {
        const result = handler.detectPII("03-1234567");
        expect(result.detected).toBe(true);
        expect(result.types).toContain(PIIType.PHONE);
      });

      it("should detect Israeli phone with country code (+972)", () => {
        const result = handler.detectPII("+972-50-1234567");
        expect(result.detected).toBe(true);
        expect(result.types).toContain(PIIType.PHONE);
      });

      it("should detect phone number in mixed content", () => {
        const result = handler.detectPII("Call me at 050-1234567 please");
        expect(result.detected).toBe(true);
        expect(result.types).toContain(PIIType.PHONE);
      });
    });

    describe("Multiple PII Types", () => {
      it("should detect multiple PII types in same text", () => {
        const result = handler.detectPII(
          "ID: 000000018, Email: user@example.com, Phone: 050-1234567"
        );
        expect(result.detected).toBe(true);
        expect(result.types).toContain(PIIType.ISRAELI_ID);
        expect(result.types).toContain(PIIType.EMAIL);
        expect(result.types).toContain(PIIType.PHONE);
        expect(result.types.length).toBeGreaterThanOrEqual(3);
      });

      it("should detect credit card and email", () => {
        const result = handler.detectPII(
          "Card: 4111111111111111, Contact: user@example.com"
        );
        expect(result.types).toContain(PIIType.CREDIT_CARD);
        expect(result.types).toContain(PIIType.EMAIL);
      });
    });

    describe("No PII Detected", () => {
      it("should not detect PII in plain text", () => {
        const result = handler.detectPII("This is a regular sentence");
        expect(result.detected).toBe(false);
        expect(result.types).toHaveLength(0);
      });

      it("should not detect PII in numbers that aren't valid IDs", () => {
        const result = handler.detectPII("Order number: 123456");
        expect(result.detected).toBe(false);
      });
    });
  });

  describe("PII Hashing", () => {
    it("should hash PII value for logging", () => {
      const hash = handler.hashPII("000000018");
      expect(hash).toBeDefined();
      expect(typeof hash).toBe("string");
      expect(hash.length).toBeGreaterThan(0);
      expect(hash).not.toBe("000000018"); // Should not return original value
    });

    it("should produce consistent hashes for same value", () => {
      const hash1 = handler.hashPII("test@example.com");
      const hash2 = handler.hashPII("test@example.com");
      expect(hash1).toBe(hash2);
    });

    it("should produce different hashes for different values", () => {
      const hash1 = handler.hashPII("test1@example.com");
      const hash2 = handler.hashPII("test2@example.com");
      expect(hash1).not.toBe(hash2);
    });

    it("should hash empty string", () => {
      const hash = handler.hashPII("");
      expect(hash).toBeDefined();
      expect(typeof hash).toBe("string");
    });

    it("should hash long text", () => {
      const longText = "A".repeat(10000);
      const hash = handler.hashPII(longText);
      expect(hash).toBeDefined();
      expect(hash.length).toBeGreaterThan(0);
    });

    it("should use SHA-256 by default (64 hex chars)", () => {
      const handler = new PIIHandler({ hashEncoding: "hex" });
      const hash = handler.hashPII("test");
      expect(hash).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex
    });

    it("should support base64 encoding", () => {
      const handler = new PIIHandler({ hashEncoding: "base64" });
      const hash = handler.hashPII("test");
      expect(hash).toMatch(/^[A-Za-z0-9+/=]+$/); // Base64
    });
  });

  describe("PII Sanitization", () => {
    it("should sanitize Israeli ID by replacing with hash", () => {
      const sanitized = handler.sanitize("ID: 000000018");
      expect(sanitized).not.toContain("000000018");
      expect(sanitized).toContain("[ISRAELI_ID:");
      expect(sanitized).toMatch(/\[ISRAELI_ID:[a-f0-9]+\]/);
    });

    it("should sanitize credit card number", () => {
      const sanitized = handler.sanitize("Card: 4111111111111111");
      expect(sanitized).not.toContain("4111111111111111");
      expect(sanitized).toContain("[CREDIT_CARD:");
    });

    it("should sanitize email address", () => {
      const sanitized = handler.sanitize("Email: user@example.com");
      expect(sanitized).not.toContain("user@example.com");
      expect(sanitized).toContain("[EMAIL:");
    });

    it("should sanitize phone number", () => {
      const sanitized = handler.sanitize("Phone: 050-1234567");
      expect(sanitized).not.toContain("050-1234567");
      expect(sanitized).toContain("[PHONE:");
    });

    it("should sanitize multiple PII instances", () => {
      const sanitized = handler.sanitize(
        "ID: 000000018, Email: user@example.com"
      );
      expect(sanitized).not.toContain("000000018");
      expect(sanitized).not.toContain("user@example.com");
      expect(sanitized).toContain("[ISRAELI_ID:");
      expect(sanitized).toContain("[EMAIL:");
    });

    it("should preserve non-PII text", () => {
      const sanitized = handler.sanitize("Order number: 12345 (safe)");
      expect(sanitized).toBe("Order number: 12345 (safe)");
    });

    it("should sanitize PII with custom replacement", () => {
      const handler = new PIIHandler({ replacement: "[REDACTED]" });
      const sanitized = handler.sanitize("ID: 000000018");
      expect(sanitized).toContain("[REDACTED]");
      expect(sanitized).not.toContain("000000018");
    });
  });

  describe("Secure Memory Cleanup", () => {
    it("should securely erase buffer containing PII", () => {
      const buffer = Buffer.from("ID: 000000018", "utf-8");
      const originalContent = buffer.toString("utf-8");

      handler.secureErase(buffer);

      const clearedContent = buffer.toString("utf-8");
      expect(clearedContent).not.toBe(originalContent);
      expect(clearedContent).not.toContain("000000018");
    });

    it("should zero out entire buffer", () => {
      const buffer = Buffer.from("Sensitive data: test@example.com");
      handler.secureErase(buffer);

      for (let i = 0; i < buffer.length; i++) {
        expect(buffer[i]).toBe(0);
      }
    });

    it("should handle empty buffer", () => {
      const buffer = Buffer.from("");
      expect(() => handler.secureErase(buffer)).not.toThrow();
    });

    it("should handle large buffer", () => {
      const largeBuffer = Buffer.alloc(10 * 1024 * 1024); // 10MB
      largeBuffer.write("Sensitive data");

      handler.secureErase(largeBuffer);

      expect(largeBuffer[0]).toBe(0);
      expect(largeBuffer[largeBuffer.length - 1]).toBe(0);
    });

    it("should respect secureErase config option", () => {
      const handler = new PIIHandler({ secureErase: false });
      const buffer = Buffer.from("test");

      // Should not throw even when disabled
      expect(() => handler.secureErase(buffer)).not.toThrow();
    });
  });

  describe("Error Message Sanitization", () => {
    it("should sanitize error messages containing PII", () => {
      const errorMsg = "Failed to process Israeli ID: 000000018";
      const sanitized = handler.sanitizeErrorMessage(errorMsg);

      expect(sanitized).not.toContain("000000018");
      expect(sanitized).toContain("[ISRAELI_ID:");
    });

    it("should sanitize error with credit card", () => {
      const errorMsg = "Invalid card number: 4111111111111111";
      const sanitized = handler.sanitizeErrorMessage(errorMsg);

      expect(sanitized).not.toContain("4111111111111111");
      expect(sanitized).toContain("[CREDIT_CARD:");
    });

    it("should preserve error message structure", () => {
      const errorMsg = "Error at line 42: invalid email user@example.com";
      const sanitized = handler.sanitizeErrorMessage(errorMsg);

      expect(sanitized).toContain("Error at line 42");
      expect(sanitized).not.toContain("user@example.com");
    });

    it("should handle error with no PII", () => {
      const errorMsg = "Connection timeout after 30 seconds";
      const sanitized = handler.sanitizeErrorMessage(errorMsg);

      expect(sanitized).toBe(errorMsg);
    });

    it("should sanitize stack traces", () => {
      const errorMsg = `Error: Invalid user
  at processUser (file.ts:10)
  User ID: 000000018
  at main (file.ts:20)`;

      const sanitized = handler.sanitizeErrorMessage(errorMsg);

      expect(sanitized).not.toContain("000000018");
      expect(sanitized).toContain("at processUser");
      expect(sanitized).toContain("at main");
    });
  });

  describe("Batch Processing", () => {
    it("should detect PII in batch of texts", () => {
      const texts = [
        "ID: 000000018",
        "Email: user@example.com",
        "Safe text",
      ];

      const results = handler.detectBatch(texts);

      expect(results).toHaveLength(3);
      expect(results[0].detected).toBe(true);
      expect(results[1].detected).toBe(true);
      expect(results[2].detected).toBe(false);
    });

    it("should sanitize batch of texts", () => {
      const texts = [
        "ID: 000000018",
        "Card: 4111111111111111",
        "Safe text",
      ];

      const sanitized = handler.sanitizeBatch(texts);

      expect(sanitized).toHaveLength(3);
      expect(sanitized[0]).not.toContain("000000018");
      expect(sanitized[1]).not.toContain("4111111111111111");
      expect(sanitized[2]).toBe("Safe text");
    });

    it("should handle empty batch", () => {
      const results = handler.detectBatch([]);
      expect(results).toHaveLength(0);
    });

    it("should handle large batch", () => {
      const texts = Array(1000).fill("Email: test@example.com");
      const results = handler.detectBatch(texts);

      expect(results).toHaveLength(1000);
      expect(results.every((r) => r.detected)).toBe(true);
    });
  });

  describe("Field-Level Detection", () => {
    it("should check if field name suggests PII", () => {
      expect(handler.isPIIField("israeliId")).toBe(true);
      expect(handler.isPIIField("email")).toBe(true);
      expect(handler.isPIIField("phoneNumber")).toBe(true);
      expect(handler.isPIIField("creditCard")).toBe(true);
    });

    it("should detect PII field with underscore naming", () => {
      expect(handler.isPIIField("israeli_id")).toBe(true);
      expect(handler.isPIIField("phone_number")).toBe(true);
      expect(handler.isPIIField("credit_card")).toBe(true);
    });

    it("should detect PII field in Hebrew", () => {
      expect(handler.isPIIField("תעודתזהות")).toBe(true); // "ID card" in Hebrew
      expect(handler.isPIIField("טלפון")).toBe(true); // "phone" in Hebrew
    });

    it("should not flag non-PII fields", () => {
      expect(handler.isPIIField("username")).toBe(false);
      expect(handler.isPIIField("orderNumber")).toBe(false);
      expect(handler.isPIIField("quantity")).toBe(false);
    });

    it("should sanitize object fields", () => {
      const data = {
        name: "John Doe",
        israeliId: "000000018",
        email: "john@example.com",
        orderNumber: "12345",
      };

      const sanitized = handler.sanitizeObject(data);

      expect(sanitized.name).toBe("John Doe");
      expect(sanitized.orderNumber).toBe("12345");
      expect(sanitized.israeliId).not.toBe("000000018");
      expect(sanitized.email).not.toBe("john@example.com");
    });

    it("should handle nested objects", () => {
      const data = {
        user: {
          name: "John",
          email: "john@example.com",
        },
        contact: {
          phone: "050-1234567",
        },
      };

      const sanitized = handler.sanitizeObject(data);

      expect(sanitized.user.name).toBe("John");
      expect(sanitized.user.email).not.toBe("john@example.com");
      expect(sanitized.contact.phone).not.toBe("050-1234567");
    });

    it("should handle arrays in objects", () => {
      const data = {
        emails: ["user1@example.com", "user2@example.com"],
        orderNumbers: [123, 456],
      };

      const sanitized = handler.sanitizeObject(data);

      expect(sanitized.emails[0]).not.toBe("user1@example.com");
      expect(sanitized.emails[1]).not.toBe("user2@example.com");
      expect(sanitized.orderNumbers[0]).toBe(123);
      expect(sanitized.orderNumbers[1]).toBe(456);
    });
  });

  describe("Configuration Options", () => {
    it("should respect enableLogging option", () => {
      const handler = new PIIHandler({ enableLogging: false });
      expect(handler).toBeDefined();
    });

    it("should use custom hash algorithm", () => {
      const handler = new PIIHandler({ hashAlgorithm: "sha512" });
      const hash = handler.hashPII("test");

      // SHA-512 hex = 128 characters
      expect(hash).toMatch(/^[a-f0-9]{128}$/);
    });

    it("should use custom replacement pattern", () => {
      const handler = new PIIHandler({ replacement: "***MASKED***" });
      const sanitized = handler.sanitize("ID: 000000018");

      expect(sanitized).toContain("***MASKED***");
    });
  });

  describe("Edge Cases", () => {
    it("should handle null input gracefully", () => {
      // @ts-expect-error - Testing null input
      const result = handler.detectPII(null);
      expect(result.detected).toBe(false);
    });

    it("should handle undefined input gracefully", () => {
      // @ts-expect-error - Testing undefined input
      const result = handler.detectPII(undefined);
      expect(result.detected).toBe(false);
    });

    it("should handle empty string", () => {
      const result = handler.detectPII("");
      expect(result.detected).toBe(false);
    });

    it("should handle very long text", () => {
      const longText = "A".repeat(10000) + " Email: test@example.com";
      const result = handler.detectPII(longText);
      expect(result.detected).toBe(true);
    });

    it("should handle special characters", () => {
      const result = handler.detectPII(
        "Email: user+tag@sub.example.co.il"
      );
      expect(result.detected).toBe(true);
      expect(result.types).toContain(PIIType.EMAIL);
    });

    it("should handle Unicode text", () => {
      const result = handler.detectPII("שלום user@example.com");
      expect(result.detected).toBe(true);
    });
  });
});
