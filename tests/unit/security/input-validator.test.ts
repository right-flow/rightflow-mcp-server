/**
 * Input Validator - Security Tests
 *
 * TDD Stage 1 (RED): Write failing tests
 * Status: Tests written, implementation pending
 *
 * TDD Workflow:
 * 1. RED: Run this test - it should FAIL (no implementation yet)
 * 2. GREEN: Implement InputValidator to make tests pass
 * 3. REFACTOR: Improve implementation quality
 * 4. QA: Run `npm run qa:stage2`
 */

import { describe, it, expect } from "vitest";
import {
  InputValidator,
  ValidationError,
  createSchema,
} from "../../../src/security/inputValidator.js";

describe("InputValidator", () => {
  describe("Basic Validation", () => {
    it("should validate required fields", () => {
      const schema = createSchema({
        name: { type: "string", required: true },
        age: { type: "number", required: true },
      });

      const validator = new InputValidator(schema);

      expect(() =>
        validator.validate({ name: "John" })
      ).toThrow(ValidationError);
    });

    it("should validate optional fields", () => {
      const schema = createSchema({
        name: { type: "string", required: true },
        age: { type: "number", required: false },
      });

      const validator = new InputValidator(schema);
      const result = validator.validate({ name: "John" });

      expect(result.name).toBe("John");
      expect(result.age).toBeUndefined();
    });

    it("should validate field types", () => {
      const schema = createSchema({
        name: { type: "string", required: true },
        age: { type: "number", required: true },
      });

      const validator = new InputValidator(schema);

      expect(() =>
        validator.validate({ name: "John", age: "25" })
      ).toThrow(ValidationError);
    });

    it("should allow valid data", () => {
      const schema = createSchema({
        name: { type: "string", required: true },
        age: { type: "number", required: true },
      });

      const validator = new InputValidator(schema);
      const result = validator.validate({ name: "John", age: 25 });

      expect(result.name).toBe("John");
      expect(result.age).toBe(25);
    });
  });

  describe("String Validation", () => {
    it("should validate minimum length", () => {
      const schema = createSchema({
        password: { type: "string", required: true, minLength: 8 },
      });

      const validator = new InputValidator(schema);

      expect(() =>
        validator.validate({ password: "short" })
      ).toThrow(ValidationError);
    });

    it("should validate maximum length", () => {
      const schema = createSchema({
        username: { type: "string", required: true, maxLength: 20 },
      });

      const validator = new InputValidator(schema);

      expect(() =>
        validator.validate({ username: "a".repeat(30) })
      ).toThrow(ValidationError);
    });

    it("should validate string pattern", () => {
      const schema = createSchema({
        code: { type: "string", required: true, pattern: /^[A-Z]{3}\d{3}$/ },
      });

      const validator = new InputValidator(schema);

      expect(() =>
        validator.validate({ code: "abc123" })
      ).toThrow(ValidationError);

      const result = validator.validate({ code: "ABC123" });
      expect(result.code).toBe("ABC123");
    });

    it("should allow empty strings when not required", () => {
      const schema = createSchema({
        notes: { type: "string", required: false },
      });

      const validator = new InputValidator(schema);
      const result = validator.validate({ notes: "" });

      expect(result.notes).toBe("");
    });
  });

  describe("Number Validation", () => {
    it("should validate minimum value", () => {
      const schema = createSchema({
        age: { type: "number", required: true, min: 0 },
      });

      const validator = new InputValidator(schema);

      expect(() =>
        validator.validate({ age: -5 })
      ).toThrow(ValidationError);
    });

    it("should validate maximum value", () => {
      const schema = createSchema({
        percentage: { type: "number", required: true, max: 100 },
      });

      const validator = new InputValidator(schema);

      expect(() =>
        validator.validate({ percentage: 150 })
      ).toThrow(ValidationError);
    });

    it("should validate integer type", () => {
      const schema = createSchema({
        count: { type: "number", required: true, integer: true },
      });

      const validator = new InputValidator(schema);

      expect(() =>
        validator.validate({ count: 5.5 })
      ).toThrow(ValidationError);

      const result = validator.validate({ count: 5 });
      expect(result.count).toBe(5);
    });

    it("should allow floats when integer not specified", () => {
      const schema = createSchema({
        price: { type: "number", required: true },
      });

      const validator = new InputValidator(schema);
      const result = validator.validate({ price: 19.99 });

      expect(result.price).toBe(19.99);
    });
  });

  describe("Boolean Validation", () => {
    it("should validate boolean type", () => {
      const schema = createSchema({
        active: { type: "boolean", required: true },
      });

      const validator = new InputValidator(schema);

      expect(() =>
        validator.validate({ active: "true" })
      ).toThrow(ValidationError);

      const result = validator.validate({ active: true });
      expect(result.active).toBe(true);
    });

    it("should allow optional boolean", () => {
      const schema = createSchema({
        verified: { type: "boolean", required: false },
      });

      const validator = new InputValidator(schema);
      const result = validator.validate({});

      expect(result.verified).toBeUndefined();
    });
  });

  describe("Email Validation", () => {
    it("should validate email format", () => {
      const schema = createSchema({
        email: { type: "email", required: true },
      });

      const validator = new InputValidator(schema);

      expect(() =>
        validator.validate({ email: "invalid-email" })
      ).toThrow(ValidationError);

      expect(() =>
        validator.validate({ email: "missing@domain" })
      ).toThrow(ValidationError);
    });

    it("should allow valid email addresses", () => {
      const schema = createSchema({
        email: { type: "email", required: true },
      });

      const validator = new InputValidator(schema);

      const result1 = validator.validate({ email: "user@example.com" });
      expect(result1.email).toBe("user@example.com");

      const result2 = validator.validate({ email: "user+tag@example.co.uk" });
      expect(result2.email).toBe("user+tag@example.co.uk");
    });
  });

  describe("URL Validation", () => {
    it("should validate URL format", () => {
      const schema = createSchema({
        website: { type: "url", required: true },
      });

      const validator = new InputValidator(schema);

      expect(() =>
        validator.validate({ website: "not-a-url" })
      ).toThrow(ValidationError);

      expect(() =>
        validator.validate({ website: "just some text" })
      ).toThrow(ValidationError);
    });

    it("should allow valid URLs", () => {
      const schema = createSchema({
        website: { type: "url", required: true },
      });

      const validator = new InputValidator(schema);

      const result1 = validator.validate({ website: "https://example.com" });
      expect(result1.website).toBe("https://example.com");

      const result2 = validator.validate({ website: "http://example.com/path?query=value" });
      expect(result2.website).toBe("http://example.com/path?query=value");
    });
  });

  describe("Array Validation", () => {
    it("should validate array type", () => {
      const schema = createSchema({
        tags: { type: "array", required: true },
      });

      const validator = new InputValidator(schema);

      expect(() =>
        validator.validate({ tags: "not-an-array" })
      ).toThrow(ValidationError);
    });

    it("should validate array minimum length", () => {
      const schema = createSchema({
        items: { type: "array", required: true, minLength: 2 },
      });

      const validator = new InputValidator(schema);

      expect(() =>
        validator.validate({ items: [1] })
      ).toThrow(ValidationError);
    });

    it("should validate array maximum length", () => {
      const schema = createSchema({
        items: { type: "array", required: true, maxLength: 5 },
      });

      const validator = new InputValidator(schema);

      expect(() =>
        validator.validate({ items: [1, 2, 3, 4, 5, 6] })
      ).toThrow(ValidationError);
    });

    it("should allow valid arrays", () => {
      const schema = createSchema({
        tags: { type: "array", required: true },
      });

      const validator = new InputValidator(schema);
      const result = validator.validate({ tags: ["javascript", "typescript"] });

      expect(result.tags).toEqual(["javascript", "typescript"]);
    });
  });

  describe("Object Validation", () => {
    it("should validate nested objects", () => {
      const schema = createSchema({
        user: {
          type: "object",
          required: true,
          properties: {
            name: { type: "string", required: true },
            age: { type: "number", required: true },
          },
        },
      });

      const validator = new InputValidator(schema);

      expect(() =>
        validator.validate({ user: { name: "John" } })
      ).toThrow(ValidationError);

      const result = validator.validate({ user: { name: "John", age: 30 } });
      expect(result.user.name).toBe("John");
      expect(result.user.age).toBe(30);
    });

    it("should reject non-object values for object type", () => {
      const schema = createSchema({
        config: { type: "object", required: true },
      });

      const validator = new InputValidator(schema);

      expect(() =>
        validator.validate({ config: "not-an-object" })
      ).toThrow(ValidationError);
    });
  });

  describe("Hebrew Text Validation", () => {
    it("should allow Hebrew characters", () => {
      const schema = createSchema({
        name: { type: "string", required: true, allowHebrew: true },
      });

      const validator = new InputValidator(schema);
      const result = validator.validate({ name: "שלום" });

      expect(result.name).toBe("שלום");
    });

    it("should allow mixed Hebrew and English", () => {
      const schema = createSchema({
        title: { type: "string", required: true, allowHebrew: true },
      });

      const validator = new InputValidator(schema);
      const result = validator.validate({ title: "טקסט Mixed Text" });

      expect(result.title).toBe("טקסט Mixed Text");
    });

    it("should sanitize BiDi control characters", () => {
      const schema = createSchema({
        text: { type: "string", required: true, sanitizeBiDi: true },
      });

      const validator = new InputValidator(schema);
      const result = validator.validate({ text: "text\u202Emalicious\u202C" });

      // BiDi overrides should be removed
      expect(result.text).not.toContain("\u202E");
      expect(result.text).not.toContain("\u202C");
    });
  });

  describe("Custom Validators", () => {
    it("should support custom validation functions", () => {
      const schema = createSchema({
        username: {
          type: "string",
          required: true,
          custom: (value: string) => {
            if (value.includes(" ")) {
              throw new Error("Username cannot contain spaces");
            }
            return value;
          },
        },
      });

      const validator = new InputValidator(schema);

      expect(() =>
        validator.validate({ username: "user name" })
      ).toThrow(ValidationError);

      const result = validator.validate({ username: "username" });
      expect(result.username).toBe("username");
    });

    it("should allow custom transformation", () => {
      const schema = createSchema({
        email: {
          type: "email",
          required: true,
          transform: (value: string) => value.toLowerCase().trim(),
        },
      });

      const validator = new InputValidator(schema);
      const result = validator.validate({ email: "  USER@EXAMPLE.COM  " });

      expect(result.email).toBe("user@example.com");
    });
  });

  describe("Error Messages", () => {
    it("should provide detailed error messages", () => {
      const schema = createSchema({
        age: { type: "number", required: true, min: 0, max: 120 },
      });

      const validator = new InputValidator(schema);

      try {
        validator.validate({ age: -5 });
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).message).toContain("age");
        expect((error as ValidationError).errors).toBeDefined();
      }
    });

    it("should include field path in nested errors", () => {
      const schema = createSchema({
        user: {
          type: "object",
          required: true,
          properties: {
            email: { type: "email", required: true },
          },
        },
      });

      const validator = new InputValidator(schema);

      try {
        validator.validate({ user: { email: "invalid" } });
        expect.fail("Should have thrown");
      } catch (error) {
        expect((error as ValidationError).message).toContain("user.email");
      }
    });

    it("should report multiple errors", () => {
      const schema = createSchema({
        name: { type: "string", required: true },
        age: { type: "number", required: true },
        email: { type: "email", required: true },
      });

      const validator = new InputValidator(schema);

      try {
        validator.validate({ name: "John" });
        expect.fail("Should have thrown");
      } catch (error) {
        expect((error as ValidationError).errors).toBeDefined();
        expect((error as ValidationError).errors.length).toBeGreaterThan(1);
      }
    });
  });

  describe("Sanitization", () => {
    it("should trim whitespace by default", () => {
      const schema = createSchema({
        name: { type: "string", required: true, trim: true },
      });

      const validator = new InputValidator(schema);
      const result = validator.validate({ name: "  John  " });

      expect(result.name).toBe("John");
    });

    it("should not trim when disabled", () => {
      const schema = createSchema({
        text: { type: "string", required: true, trim: false },
      });

      const validator = new InputValidator(schema);
      const result = validator.validate({ text: "  text  " });

      expect(result.text).toBe("  text  ");
    });

    it("should strip unknown fields by default", () => {
      const schema = createSchema({
        name: { type: "string", required: true },
      });

      const validator = new InputValidator(schema);
      const result = validator.validate({ name: "John", extra: "field" });

      expect(result.name).toBe("John");
      expect(result.extra).toBeUndefined();
    });
  });

  describe("Edge Cases", () => {
    it("should handle null values", () => {
      const schema = createSchema({
        optional: { type: "string", required: false },
      });

      const validator = new InputValidator(schema);
      const result = validator.validate({ optional: null });

      expect(result.optional).toBeUndefined();
    });

    it("should handle undefined values", () => {
      const schema = createSchema({
        optional: { type: "string", required: false },
      });

      const validator = new InputValidator(schema);
      const result = validator.validate({ optional: undefined });

      expect(result.optional).toBeUndefined();
    });

    it("should reject empty required fields", () => {
      const schema = createSchema({
        name: { type: "string", required: true },
      });

      const validator = new InputValidator(schema);

      expect(() =>
        validator.validate({ name: "" })
      ).toThrow(ValidationError);
    });

    it("should handle very large objects", () => {
      const schema = createSchema({
        data: { type: "object", required: true },
      });

      const validator = new InputValidator(schema);
      const largeObject = {};
      for (let i = 0; i < 1000; i++) {
        largeObject[`field${i}`] = i;
      }

      const result = validator.validate({ data: largeObject });
      expect(result.data).toBeDefined();
    });
  });
});
