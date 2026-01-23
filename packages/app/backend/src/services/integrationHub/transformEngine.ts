/**
 * Transform Engine - Integration Hub Phase 2
 * Executes transform pipelines for field mapping
 *
 * Supports 15+ transform types:
 * - String: trim, uppercase, lowercase, replace, truncate
 * - Hebrew: hebrew_reverse, strip_nikud, hebrew_numbers
 * - Date: date_format, date_add, date_now
 * - Number: to_number, round, currency
 * - Lookup: map, conditional
 *
 * Architecture:
 * - Registry pattern for transform functions
 * - Chained pipeline execution
 * - Step-by-step result tracking
 * - Validation before execution
 */

import logger from '../../utils/logger';

// ============================================================================
// Types
// ============================================================================

export interface Transform {
  type: string;
  params?: Record<string, any>;
}

export interface TransformStep {
  transform: string;
  input: any;
  output: any;
  durationMs?: number;
}

export interface TransformResult {
  output: any;
  steps: TransformStep[];
  totalDurationMs?: number;
}

export interface TransformFunction {
  (input: any, params?: Record<string, any>): any;
}

export class TransformValidationError extends Error {
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'TransformValidationError';
  }
}

// ============================================================================
// String Transforms
// ============================================================================

function trimTransform(input: any): string {
  if (typeof input !== 'string') {
    throw new Error('trim transform requires string input');
  }
  return input.trim();
}

function uppercaseTransform(input: any): string {
  if (typeof input !== 'string') {
    throw new Error('uppercase transform requires string input');
  }
  return input.toUpperCase();
}

function lowercaseTransform(input: any): string {
  if (typeof input !== 'string') {
    throw new Error('lowercase transform requires string input');
  }
  return input.toLowerCase();
}

function replaceTransform(input: any, params?: Record<string, any>): string {
  if (typeof input !== 'string') {
    throw new Error('replace transform requires string input');
  }
  if (!params?.pattern || !params?.replacement) {
    throw new TransformValidationError(
      'replace transform requires pattern and replacement parameters',
    );
  }

  // Support regex patterns with useRegex flag
  if (params.useRegex === true) {
    try {
      const flags = params.regexFlags || 'g'; // Default to global flag
      const regex = new RegExp(params.pattern, flags);
      return input.replace(regex, params.replacement);
    } catch (error: any) {
      throw new TransformValidationError(
        `Invalid regex pattern: ${error.message}`,
        { pattern: params.pattern },
      );
    }
  }

  // Default: literal string replacement
  return input.replaceAll(params.pattern, params.replacement);
}

function truncateTransform(input: any, params?: Record<string, any>): string {
  if (typeof input !== 'string') {
    throw new Error('truncate transform requires string input');
  }
  if (typeof params?.maxLength !== 'number' || params.maxLength <= 0) {
    throw new TransformValidationError(
      'truncate transform requires positive maxLength parameter',
    );
  }
  return input.substring(0, params.maxLength);
}

// ============================================================================
// Hebrew Transforms
// ============================================================================

function hebrewReverseTransform(input: any): string {
  if (typeof input !== 'string') {
    throw new Error('hebrew_reverse transform requires string input');
  }
  // Reverse the entire string for legacy ERPs that don't handle RTL properly
  return input.split('').reverse().join('');
}

function stripNikudTransform(input: any): string {
  if (typeof input !== 'string') {
    throw new Error('strip_nikud transform requires string input');
  }
  // Remove Hebrew vowel marks (nikud) - Unicode range U+0591 to U+05C7
  return input.replace(/[\u0591-\u05C7]/g, '');
}

function hebrewNumbersTransform(input: any): string {
  if (typeof input !== 'string') {
    throw new Error('hebrew_numbers transform requires string input');
  }

  // Hebrew letter to number mapping (Gematria)
  const hebrewToNumber: Record<string, number> = {
    'א': 1, 'ב': 2, 'ג': 3, 'ד': 4, 'ה': 5, 'ו': 6, 'ז': 7, 'ח': 8, 'ט': 9,
    'י': 10, 'כ': 20, 'ך': 20, 'ל': 30, 'מ': 40, 'ם': 40, 'נ': 50, 'ן': 50,
    'ס': 60, 'ע': 70, 'פ': 80, 'ף': 80, 'צ': 90, 'ץ': 90,
    'ק': 100, 'ר': 200, 'ש': 300, 'ת': 400,
  };

  let sum = 0;
  for (const char of input) {
    if (hebrewToNumber[char]) {
      sum += hebrewToNumber[char];
    }
  }

  return sum.toString();
}

// ============================================================================
// Date Transforms
// ============================================================================

function parseDateString(dateStr: string, format: string): Date {
  if (format === 'ISO8601') {
    return new Date(dateStr);
  }

  if (format === 'DD/MM/YYYY') {
    const parts = dateStr.split('/');
    if (parts.length !== 3) throw new Error('Invalid date format');
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // JS months are 0-indexed
    const year = parseInt(parts[2], 10);
    return new Date(year, month, day);
  }

  if (format === 'MM/DD/YYYY') {
    const parts = dateStr.split('/');
    if (parts.length !== 3) throw new Error('Invalid date format');
    const month = parseInt(parts[0], 10) - 1; // JS months are 0-indexed
    const day = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    return new Date(year, month, day);
  }

  if (format === 'YYYY-MM-DD') {
    const parts = dateStr.split('-');
    if (parts.length !== 3) throw new Error('Invalid date format');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    return new Date(year, month, day);
  }

  if (format === 'DD/MM/YYYY HH:mm') {
    const [datePart, timePart] = dateStr.split(' ');
    const dateParts = datePart.split('/');
    const timeParts = timePart.split(':');
    if (dateParts.length !== 3 || timeParts.length !== 2) throw new Error('Invalid date format');
    const day = parseInt(dateParts[0], 10);
    const month = parseInt(dateParts[1], 10) - 1;
    const year = parseInt(dateParts[2], 10);
    const hours = parseInt(timeParts[0], 10);
    const minutes = parseInt(timeParts[1], 10);
    return new Date(year, month, day, hours, minutes);
  }

  if (format === 'YYYY-MM-DD HH:mm:ss') {
    const [datePart, timePart] = dateStr.split(' ');
    const dateParts = datePart.split('-');
    const timeParts = timePart.split(':');
    if (dateParts.length !== 3 || timeParts.length !== 3) throw new Error('Invalid date format');
    const year = parseInt(dateParts[0], 10);
    const month = parseInt(dateParts[1], 10) - 1;
    const day = parseInt(dateParts[2], 10);
    const hours = parseInt(timeParts[0], 10);
    const minutes = parseInt(timeParts[1], 10);
    const seconds = parseInt(timeParts[2], 10);
    return new Date(year, month, day, hours, minutes, seconds);
  }

  throw new Error(`Unsupported date format: ${format}`);
}

function formatDate(date: Date, format: string): string {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');

  if (format === 'DD/MM/YYYY') {
    return `${day}/${month}/${year}`;
  }

  if (format === 'MM/DD/YYYY') {
    return `${month}/${day}/${year}`;
  }

  if (format === 'YYYY-MM-DD') {
    return `${year}-${month}-${day}`;
  }

  if (format === 'DD/MM/YYYY HH:mm') {
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  }

  if (format === 'YYYY-MM-DD HH:mm:ss') {
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  throw new Error(`Unsupported date format: ${format}`);
}

function dateFormatTransform(input: any, params?: Record<string, any>): string {
  if (typeof input !== 'string') {
    throw new Error('date_format transform requires string input');
  }
  if (!params?.from || !params?.to) {
    throw new TransformValidationError(
      'date_format transform requires from and to parameters',
    );
  }

  try {
    const date = parseDateString(input, params.from);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date');
    }
    return formatDate(date, params.to);
  } catch (error: any) {
    throw new Error(`Date format conversion failed: ${error.message}`);
  }
}

function dateAddTransform(input: any, params?: Record<string, any>): string {
  if (typeof input !== 'string') {
    throw new Error('date_add transform requires string input');
  }
  if (typeof params?.days !== 'number') {
    throw new TransformValidationError(
      'date_add transform requires days parameter',
    );
  }

  try {
    // Parse as YYYY-MM-DD by default
    const date = parseDateString(input, 'YYYY-MM-DD');
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date');
    }

    // Add days
    date.setDate(date.getDate() + params.days);

    return formatDate(date, 'YYYY-MM-DD');
  } catch (error: any) {
    throw new Error(`Date add failed: ${error.message}`);
  }
}

function dateNowTransform(): string {
  const now = new Date();
  return formatDate(now, 'YYYY-MM-DD');
}

// ============================================================================
// Number Transforms
// ============================================================================

function toNumberTransform(input: any): number {
  if (typeof input === 'number') {
    return input; // Already a number
  }

  if (typeof input === 'string') {
    const num = parseFloat(input);
    if (isNaN(num)) {
      throw new Error(`Cannot convert "${input}" to number`);
    }
    return num;
  }

  throw new Error('to_number transform requires string or number input');
}

function roundTransform(input: any, params?: Record<string, any>): number {
  const num = typeof input === 'number' ? input : toNumberTransform(input);

  if (typeof params?.decimals !== 'number') {
    throw new TransformValidationError(
      'round transform requires decimals parameter',
    );
  }

  const multiplier = Math.pow(10, params.decimals);
  return Math.round(num * multiplier) / multiplier;
}

function currencyTransform(input: any, params?: Record<string, any>): string {
  const num = typeof input === 'number' ? input : toNumberTransform(input);
  const symbol = params?.symbol || '$';

  // Format with thousands separator and 2 decimal places
  const formatted = num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${symbol}${formatted}`;
}

// ============================================================================
// Lookup Transforms
// ============================================================================

function mapTransform(input: any, params?: Record<string, any>): any {
  if (!params?.values || typeof params.values !== 'object') {
    throw new TransformValidationError(
      'map transform requires values parameter',
    );
  }

  const inputStr = String(input);
  if (!(inputStr in params.values)) {
    throw new Error(
      `Value "${inputStr}" not found in map. Available: ${Object.keys(params.values).join(', ')}`,
    );
  }

  return params.values[inputStr];
}

function conditionalTransform(input: any, params?: Record<string, any>): any {
  if (!params?.if || params.then === undefined || params.else === undefined) {
    throw new TransformValidationError(
      'conditional transform requires if, then, and else parameters',
    );
  }

  // Support simple equals condition
  if (params.if.equals !== undefined) {
    return input === params.if.equals ? params.then : params.else;
  }

  throw new TransformValidationError(
    'conditional transform only supports "equals" condition',
  );
}

// ============================================================================
// Transform Registry
// ============================================================================

const transformRegistry: Map<string, TransformFunction> = new Map([
  // String transforms
  ['trim', trimTransform],
  ['uppercase', uppercaseTransform],
  ['lowercase', lowercaseTransform],
  ['replace', replaceTransform],
  ['truncate', truncateTransform],

  // Hebrew transforms
  ['hebrew_reverse', hebrewReverseTransform],
  ['strip_nikud', stripNikudTransform],
  ['hebrew_numbers', hebrewNumbersTransform],

  // Date transforms
  ['date_format', dateFormatTransform],
  ['date_add', dateAddTransform],
  ['date_now', dateNowTransform],

  // Number transforms
  ['to_number', toNumberTransform],
  ['round', roundTransform],
  ['currency', currencyTransform],

  // Lookup transforms
  ['map', mapTransform],
  ['conditional', conditionalTransform],
]);

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate transform types and parameters before execution
 * Throws TransformValidationError if validation fails
 */
export function validateTransforms(transforms: Transform[]): void {
  for (let i = 0; i < transforms.length; i++) {
    const transform = transforms[i];

    // Check if transform type exists
    if (!transformRegistry.has(transform.type)) {
      throw new TransformValidationError(
        `Unknown transform type: "${transform.type}" at transform ${i}`,
        {
          transformIndex: i,
          transformType: transform.type,
          availableTypes: Array.from(transformRegistry.keys()),
        },
      );
    }

    // Validate params for transforms that require them
    const paramsRequired: Record<string, string[]> = {
      replace: ['pattern', 'replacement'],
      truncate: ['maxLength'],
      date_format: ['from', 'to'],
      date_add: ['days'],
      round: ['decimals'],
      map: ['values'],
      conditional: ['if', 'then', 'else'],
    };

    if (paramsRequired[transform.type]) {
      const required = paramsRequired[transform.type];
      for (const param of required) {
        if (transform.params?.[param] === undefined) {
          throw new TransformValidationError(
            `Transform "${transform.type}" at transform ${i} requires parameter: ${param}`,
            {
              transformIndex: i,
              transformType: transform.type,
              missingParam: param,
              requiredParams: required,
            },
          );
        }
      }
    }
  }
}

// ============================================================================
// Execution
// ============================================================================

/**
 * Execute transform pipeline
 * Returns output and step-by-step execution trace with performance metrics
 */
export function executeTransforms(
  input: any,
  transforms: Transform[],
): TransformResult {
  // Validate transforms
  validateTransforms(transforms);

  // Validate input (some transforms like date_now don't need input)
  const transformsWithoutInput = ['date_now'];
  const needsInput = !transforms.every(t => transformsWithoutInput.includes(t.type));

  if (needsInput && (input === null || input === undefined)) {
    throw new Error('Transform input cannot be null or undefined');
  }

  // Execute transform chain with performance tracking
  const pipelineStartTime = performance.now();
  let current = input;
  const steps: TransformStep[] = [];

  for (let i = 0; i < transforms.length; i++) {
    const transform = transforms[i];

    try {
      const transformFn = transformRegistry.get(transform.type);
      if (!transformFn) {
        // Should never happen after validation, but TypeScript safety
        throw new TransformValidationError(
          `Unknown transform type: ${transform.type}`,
        );
      }

      // Measure transform execution time
      const startTime = performance.now();
      const output = transformFn(current, transform.params);
      const durationMs = performance.now() - startTime;

      // Log warning for slow transforms (>100ms)
      if (durationMs > 100) {
        logger.warn('Slow transform detected', {
          transformType: transform.type,
          transformIndex: i,
          durationMs: durationMs.toFixed(2),
          threshold: '100ms',
        });
      }

      steps.push({
        transform: transform.type,
        input: current,
        output,
        durationMs: parseFloat(durationMs.toFixed(2)),
      });

      current = output;
    } catch (error: any) {
      logger.error('Transform execution failed', {
        transformType: transform.type,
        transformIndex: i,
        error: error.message,
      });

      // Re-throw with context
      if (error instanceof TransformValidationError) {
        throw error;
      }

      throw new Error(
        `Transform "${transform.type}" at transform ${i} failed: ${error.message}`,
      );
    }
  }

  const totalDurationMs = parseFloat((performance.now() - pipelineStartTime).toFixed(2));

  // Log warning for slow pipelines (>500ms total)
  if (totalDurationMs > 500) {
    logger.warn('Slow transform pipeline detected', {
      totalDurationMs,
      transformCount: transforms.length,
      threshold: '500ms',
    });
  }

  return {
    output: current,
    steps,
    totalDurationMs,
  };
}

// ============================================================================
// Registry Management (for extensibility)
// ============================================================================

/**
 * Register a custom transform function
 * Allows adding new transform types at runtime
 */
export function registerTransform(
  type: string,
  fn: TransformFunction,
): void {
  if (transformRegistry.has(type)) {
    logger.warn('Overwriting existing transform', { type });
  }

  transformRegistry.set(type, fn);
  logger.info('Transform registered', { type });
}

/**
 * Get list of all registered transform types
 */
export function getTransformTypes(): string[] {
  return Array.from(transformRegistry.keys());
}
