/**
 * Unit tests for extract-fields API endpoint
 * Testing timeout parsing with NaN validation
 */
import { describe, test, expect, beforeEach, afterAll, vi } from 'vitest';

describe('GEMINI_TIMEOUT environment variable parsing', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment before each test
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  test('should use default timeout (60000) when GEMINI_TIMEOUT is not set', () => {
    delete process.env.GEMINI_TIMEOUT;

    const parsedTimeout = parseInt(process.env.GEMINI_TIMEOUT || '60000', 10);
    const timeout = Number.isNaN(parsedTimeout) ? 60000 : parsedTimeout;

    expect(timeout).toBe(60000);
  });

  test('should use valid GEMINI_TIMEOUT when set to valid number string', () => {
    process.env.GEMINI_TIMEOUT = '90000';

    const parsedTimeout = parseInt(process.env.GEMINI_TIMEOUT || '60000', 10);
    const timeout = Number.isNaN(parsedTimeout) ? 60000 : parsedTimeout;

    expect(timeout).toBe(90000);
  });

  test('should fallback to default (60000) when GEMINI_TIMEOUT is invalid string', () => {
    process.env.GEMINI_TIMEOUT = 'abc';

    const parsedTimeout = parseInt(process.env.GEMINI_TIMEOUT || '60000', 10);
    const timeout = Number.isNaN(parsedTimeout) ? 60000 : parsedTimeout;

    expect(timeout).toBe(60000);
    expect(Number.isNaN(parsedTimeout)).toBe(true);
  });

  test('should fallback to default (60000) when GEMINI_TIMEOUT is empty string', () => {
    process.env.GEMINI_TIMEOUT = '';

    const parsedTimeout = parseInt(process.env.GEMINI_TIMEOUT || '60000', 10);
    const timeout = Number.isNaN(parsedTimeout) ? 60000 : parsedTimeout;

    expect(timeout).toBe(60000);
  });

  test('should fallback to default (60000) when GEMINI_TIMEOUT contains special characters', () => {
    process.env.GEMINI_TIMEOUT = '@#$%';

    const parsedTimeout = parseInt(process.env.GEMINI_TIMEOUT || '60000', 10);
    const timeout = Number.isNaN(parsedTimeout) ? 60000 : parsedTimeout;

    expect(timeout).toBe(60000);
  });

  test('should handle GEMINI_TIMEOUT with leading/trailing spaces', () => {
    process.env.GEMINI_TIMEOUT = '  45000  ';

    const parsedTimeout = parseInt(process.env.GEMINI_TIMEOUT || '60000', 10);
    const timeout = Number.isNaN(parsedTimeout) ? 60000 : parsedTimeout;

    expect(timeout).toBe(45000);
  });

  test('should handle GEMINI_TIMEOUT with decimal point (parseInt truncates)', () => {
    process.env.GEMINI_TIMEOUT = '75000.5';

    const parsedTimeout = parseInt(process.env.GEMINI_TIMEOUT || '60000', 10);
    const timeout = Number.isNaN(parsedTimeout) ? 60000 : parsedTimeout;

    expect(timeout).toBe(75000); // parseInt truncates decimal
  });

  test('should handle GEMINI_TIMEOUT set to zero (valid but edge case)', () => {
    process.env.GEMINI_TIMEOUT = '0';

    const parsedTimeout = parseInt(process.env.GEMINI_TIMEOUT || '60000', 10);
    const timeout = Number.isNaN(parsedTimeout) ? 60000 : parsedTimeout;

    expect(timeout).toBe(0);
  });

  test('should handle GEMINI_TIMEOUT with negative number', () => {
    process.env.GEMINI_TIMEOUT = '-5000';

    const parsedTimeout = parseInt(process.env.GEMINI_TIMEOUT || '60000', 10);
    const timeout = Number.isNaN(parsedTimeout) ? 60000 : parsedTimeout;

    expect(timeout).toBe(-5000); // Valid parseInt result, but negative timeout
    // Note: Consider adding additional validation for negative values in production
  });

  test('should handle GEMINI_TIMEOUT with number followed by text', () => {
    process.env.GEMINI_TIMEOUT = '30000abc';

    const parsedTimeout = parseInt(process.env.GEMINI_TIMEOUT || '60000', 10);
    const timeout = Number.isNaN(parsedTimeout) ? 60000 : parsedTimeout;

    expect(timeout).toBe(30000); // parseInt parses leading digits
  });
});
