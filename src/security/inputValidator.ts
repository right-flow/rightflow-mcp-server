/**
 * Input Validator - Security Component
 *
 * Implements Zod-based schema validation with security-focused features.
 *
 * Security Features:
 * - Type validation (string, number, boolean, email, URL, array, object)
 * - Required field enforcement
 * - Length and value constraints
 * - Pattern matching (regex)
 * - Hebrew text support with BiDi sanitization
 * - Custom validators and transformations
 * - Unknown field stripping
 * - Detailed error messages
 *
 * @example Basic usage
 * ```typescript
 * const schema = createSchema({
 *   name: { type: 'string', required: true, minLength: 2 },
 *   age: { type: 'number', required: true, min: 0, max: 120 },
 * });
 *
 * const validator = new InputValidator(schema);
 * const validated = validator.validate({ name: 'John', age: 30 });
 * ```
 *
 * @example Hebrew text with BiDi sanitization
 * ```typescript
 * const schema = createSchema({
 *   text: { type: 'string', required: true, sanitizeBiDi: true },
 * });
 *
 * const validator = new InputValidator(schema);
 * const validated = validator.validate({ text: 'שלום' });
 * ```
 */

import { z, ZodSchema, ZodError } from "zod";

/**
 * Field definition types
 */
export type FieldType =
  | "string"
  | "number"
  | "boolean"
  | "email"
  | "url"
  | "array"
  | "object";

/**
 * Field definition for schema creation
 */
export interface FieldDefinition {
  /** Field type */
  type: FieldType;
  /** Whether field is required */
  required: boolean;
  /** Minimum length (string/array) */
  minLength?: number;
  /** Maximum length (string/array) */
  maxLength?: number;
  /** Minimum value (number) */
  min?: number;
  /** Maximum value (number) */
  max?: number;
  /** Must be integer (number) */
  integer?: boolean;
  /** Regex pattern (string) */
  pattern?: RegExp;
  /** Allow Hebrew characters (string) */
  allowHebrew?: boolean;
  /** Sanitize BiDi control characters (string) */
  sanitizeBiDi?: boolean;
  /** Trim whitespace (string) */
  trim?: boolean;
  /** Custom validation function */
  custom?: (value: any) => any;
  /** Transformation function */
  transform?: (value: any) => any;
  /** Nested object properties */
  properties?: Record<string, FieldDefinition>;
}

/**
 * Schema definition
 */
export type SchemaDefinition = Record<string, FieldDefinition>;

/**
 * Validation error details
 */
export interface ValidationErrorDetail {
  /** Field path (e.g., "user.email") */
  path: string;
  /** Error message */
  message: string;
  /** Error code */
  code: string;
}

/**
 * Validation error thrown when validation fails
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public errors: ValidationErrorDetail[]
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

/**
 * BiDi control characters to sanitize
 */
const BIDI_CONTROL_CHARS =
  /[\u202A-\u202E\u2066-\u2069\u200E\u200F\u061C]/g;

/**
 * Create a Zod schema from field definitions
 *
 * @param definition - Schema definition
 * @returns Zod schema
 */
export function createSchema(definition: SchemaDefinition): ZodSchema {
  const shape: Record<string, any> = {};

  for (const [fieldName, fieldDef] of Object.entries(definition)) {
    shape[fieldName] = createFieldSchema(fieldDef);
  }

  return z.object(shape).strip(); // Strip unknown fields silently
}

/**
 * Create Zod schema for a single field
 *
 * @param fieldDef - Field definition
 * @returns Zod schema for the field
 */
function createFieldSchema(fieldDef: FieldDefinition): any {
  let schema: any;

  // Create base schema by type
  switch (fieldDef.type) {
    case "string":
      schema = z.string();
      break;
    case "number":
      schema = z.number();
      break;
    case "boolean":
      schema = z.boolean();
      break;
    case "email":
      // Start with string, apply transformations, then validate email
      schema = z.string();
      break;
    case "url":
      // Start with string, apply transformations, then validate URL
      schema = z.string();
      break;
    case "array":
      schema = z.array(z.any());
      break;
    case "object":
      if (fieldDef.properties) {
        // Nested object with defined properties
        const nestedShape: Record<string, any> = {};
        for (const [propName, propDef] of Object.entries(fieldDef.properties)) {
          nestedShape[propName] = createFieldSchema(propDef);
        }
        schema = z.object(nestedShape);
      } else {
        // Generic object
        schema = z.object({}).passthrough();
      }
      break;
    default:
      throw new Error(`Unsupported field type: ${fieldDef.type}`);
  }

  // Apply string constraints (BEFORE type-specific validation)
  if (fieldDef.type === "string" || fieldDef.type === "email" || fieldDef.type === "url") {
    // Trim FIRST (before email/URL validation)
    if (fieldDef.trim !== false) {
      schema = schema.trim();
    }

    // Required strings should not be empty
    if (fieldDef.required) {
      schema = schema.min(1);
    }

    if (fieldDef.minLength !== undefined) {
      schema = schema.min(fieldDef.minLength);
    }

    if (fieldDef.maxLength !== undefined) {
      schema = schema.max(fieldDef.maxLength);
    }

    if (fieldDef.pattern) {
      schema = schema.regex(fieldDef.pattern);
    }

    // NOW apply email/URL validation (after trimming)
    if (fieldDef.type === "email") {
      schema = schema.email();
    } else if (fieldDef.type === "url") {
      schema = schema.url();
    }

    // BiDi sanitization
    if (fieldDef.sanitizeBiDi) {
      schema = schema.transform((val: string) => {
        return val.replace(BIDI_CONTROL_CHARS, "");
      });
    }
  }

  // Apply number constraints
  if (fieldDef.type === "number") {
    if (fieldDef.min !== undefined) {
      schema = schema.min(fieldDef.min);
    }

    if (fieldDef.max !== undefined) {
      schema = schema.max(fieldDef.max);
    }

    if (fieldDef.integer) {
      schema = schema.int();
    }
  }

  // Apply array constraints
  if (fieldDef.type === "array") {
    if (fieldDef.minLength !== undefined) {
      schema = schema.min(fieldDef.minLength);
    }

    if (fieldDef.maxLength !== undefined) {
      schema = schema.max(fieldDef.maxLength);
    }
  }

  // Apply custom transformation (after validation)
  if (fieldDef.transform) {
    schema = schema.transform(fieldDef.transform);
  }

  // Apply custom validation
  if (fieldDef.custom) {
    schema = schema.refine(
      (val: any) => {
        try {
          fieldDef.custom!(val);
          return true;
        } catch {
          return false;
        }
      },
      { message: "Custom validation failed" }
    );

    // Apply transformation after validation
    schema = schema.transform(fieldDef.custom);
  }

  // Handle required/optional
  if (!fieldDef.required) {
    // Optional fields: allow undefined and convert null to undefined
    schema = schema.nullable().transform((val: any) => val === null ? undefined : val).optional();
  }

  return schema;
}

/**
 * Convert Zod errors to validation error details
 *
 * @param zodError - Zod error
 * @returns Validation error details
 */
function convertZodErrors(zodError: ZodError): ValidationErrorDetail[] {
  return zodError.errors.map((error) => ({
    path: error.path.join("."),
    message: error.message,
    code: error.code,
  }));
}

/**
 * Input Validator - Zod-based schema validation
 *
 * Provides type-safe validation with security-focused features:
 * - Required field enforcement
 * - Type checking
 * - Length and value constraints
 * - Pattern matching
 * - Hebrew text support
 * - BiDi attack prevention
 * - Custom validators
 * - Detailed error messages
 */
export class InputValidator {
  private readonly schema: ZodSchema;

  /**
   * Create a new Input Validator
   *
   * @param schema - Zod schema or schema definition (optional - defaults to passthrough schema)
   *
   * @example
   * ```typescript
   * const schema = createSchema({
   *   name: { type: 'string', required: true },
   *   age: { type: 'number', required: true, min: 0 },
   * });
   *
   * const validator = new InputValidator(schema);
   * ```
   *
   * @example Without schema (validates any object)
   * ```typescript
   * const validator = new InputValidator();
   * validator.validate({ any: 'data' }); // Passes
   * ```
   */
  constructor(schema?: ZodSchema | SchemaDefinition) {
    // If no schema provided, use a permissive passthrough schema
    if (!schema) {
      this.schema = z.object({}).passthrough();
    } else if (schema instanceof z.ZodType) {
      this.schema = schema;
    } else {
      this.schema = createSchema(schema as SchemaDefinition);
    }
  }

  /**
   * Validate input data against the schema
   *
   * @param data - Data to validate
   * @param schema - Optional schema to validate against (overrides constructor schema)
   * @returns Validated data if successful, or validation result object if schema provided
   * @throws ValidationError if validation fails and no schema provided
   *
   * @example Throwing mode
   * ```typescript
   * const validator = new InputValidator(schema);
   * try {
   *   const validated = validator.validate({ name: 'John', age: 30 });
   *   console.log(validated);
   * } catch (error) {
   *   if (error instanceof ValidationError) {
   *     console.error(error.errors);
   *   }
   * }
   * ```
   *
   * @example Result mode (with schema parameter)
   * ```typescript
   * const validator = new InputValidator();
   * const result = validator.validate(data, { name: { type: 'string', required: true } });
   * if (result.valid) {
   *   console.log('Valid!');
   * } else {
   *   console.error(result.errors);
   * }
   * ```
   */
  validate<T = any>(
    data: unknown,
    schema?: SchemaDefinition
  ): T | { valid: boolean; errors?: ValidationErrorDetail[] } {
    // If schema provided, return result object format
    if (schema) {
      const zodSchema = createSchema(schema);
      const result = zodSchema.safeParse(data);

      if (result.success) {
        return { valid: true };
      } else {
        return {
          valid: false,
          errors: convertZodErrors(result.error),
        };
      }
    }

    // Otherwise, throw on error
    try {
      return this.schema.parse(data) as T;
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = convertZodErrors(error);
        const message = `Validation failed: ${errors.map((e) => e.path || "root").join(", ")}`;
        throw new ValidationError(message, errors);
      }
      throw error;
    }
  }

  /**
   * Validate input data and return success/error result
   *
   * @param data - Data to validate
   * @returns Validation result with success flag
   *
   * @example
   * ```typescript
   * const validator = new InputValidator(schema);
   * const result = validator.safeParse({ name: 'John' });
   *
   * if (result.success) {
   *   console.log(result.data);
   * } else {
   *   console.error(result.errors);
   * }
   * ```
   */
  safeParse<T = any>(
    data: unknown
  ):
    | { success: true; data: T }
    | { success: false; errors: ValidationErrorDetail[] } {
    const result = this.schema.safeParse(data);

    if (result.success) {
      return { success: true, data: result.data as T };
    } else {
      return {
        success: false,
        errors: convertZodErrors(result.error),
      };
    }
  }
}
