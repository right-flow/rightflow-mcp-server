import { z } from 'zod';
import { ValidationError } from './errors';

/**
 * Validate request data with Zod schema
 * Throws ValidationError with Hebrew message on failure
 */
export function validateRequest<T>(schema: z.ZodSchema<T>, data: any): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Convert Zod error to our ValidationError format
      const firstError = error.errors[0];
      const field = firstError.path.join('.');
      const message = translateZodError(firstError);

      throw new ValidationError(message, {
        field,
        constraint: firstError.code,
        issues: error.errors,
      });
    }
    throw error;
  }
}

/**
 * Translate Zod error to Hebrew message
 */
function translateZodError(error: z.ZodIssue): string {
  const field = error.path.join('.') || 'שדה';

  switch (error.code) {
    case 'invalid_type':
      return `שדה "${field}" חייב להיות ${translateType(error.expected)}`;

    case 'too_small':
      if (error.type === 'string') {
        return `שדה "${field}" קצר מדי (מינימום ${error.minimum} תווים)`;
      }
      if (error.type === 'array') {
        return `שדה "${field}" חייב להכיל לפחות ${error.minimum} פריטים`;
      }
      return `שדה "${field}" קטן מדי (מינימום ${error.minimum})`;

    case 'too_big':
      if (error.type === 'string') {
        return `שדה "${field}" ארוך מדי (מקסימום ${error.maximum} תווים)`;
      }
      if (error.type === 'array') {
        return `שדה "${field}" יכול להכיל מקסימום ${error.maximum} פריטים`;
      }
      return `שדה "${field}" גדול מדי (מקסימום ${error.maximum})`;

    case 'invalid_string':
      if (error.validation === 'email') {
        return `שדה "${field}" חייב להיות כתובת אימייל תקינה`;
      }
      if (error.validation === 'url') {
        return `שדה "${field}" חייב להיות URL תקין`;
      }
      if (error.validation === 'uuid') {
        return `שדה "${field}" חייב להיות UUID תקין`;
      }
      return `שדה "${field}" לא תקין`;

    default:
      return `שדה "${field}" לא תקין`;
  }
}

/**
 * Translate Zod type to Hebrew
 */
function translateType(type: z.ZodParsedType): string {
  const typeMap: Record<string, string> = {
    string: 'טקסט',
    number: 'מספר',
    boolean: 'אמת/שקר',
    date: 'תאריך',
    array: 'רשימה',
    object: 'אובייקט',
    null: 'null',
    undefined: 'undefined',
  };

  return typeMap[type] || type;
}

/**
 * Common validation schemas
 */
export const commonSchemas = {
  uuid: z.string().uuid(),
  email: z.string().email(),
  url: z.string().url(),
  phoneNumber: z.string().regex(/^05\d{8}$/), // Israeli phone number
  pagination: z.object({
    page: z.number().int().positive().default(1),
    limit: z.number().int().positive().max(100).default(20),
  }),
};
