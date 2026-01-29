/**
 * Test Utilities for Hybrid Field Extraction Tests
 *
 * This file provides mock functions, assertions, and helpers for testing.
 */

import { describe, it, expect, vi } from 'vitest';
import type { Mock } from 'vitest';

// ============================================================
// Mock Azure DI Client
// ============================================================

export function createMockAzureClient() {
  const mockPoller = {
    pollUntilDone: vi.fn(),
  };

  const mockClient = {
    path: vi.fn().mockReturnValue({
      post: vi.fn().mockResolvedValue({
        status: '202',
        headers: {
          get: vi.fn().mockReturnValue('operation-location-url'),
        },
      }),
    }),
  };

  return { mockClient, mockPoller };
}

// ============================================================
// Mock Gemini AI Client
// ============================================================

export function createMockGeminiClient() {
  const mockModel = {
    generateContent: vi.fn(),
  };

  const mockGenAI = {
    getGenerativeModel: vi.fn().mockReturnValue(mockModel),
  };

  return { mockGenAI, mockModel };
}

// ============================================================
// Mock Environment Variables
// ============================================================

export function setupMockEnv() {
  const originalEnv = { ...process.env };

  process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT = 'https://test.cognitiveservices.azure.com/';
  process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY = 'test-azure-key';
  process.env.GEMINI_API_KEY = 'test-gemini-key';
  process.env.GEMINI_CHAT_MODEL = 'gemini-1.5-pro';

  return () => {
    process.env = originalEnv;
  };
}

// ============================================================
// Custom Assertions
// ============================================================

/**
 * Assert that two boxes are approximately equal (within tolerance)
 */
export function expectBoxToBeCloseTo(
  actual: { x: number; y: number; width: number; height: number },
  expected: { x: number; y: number; width: number; height: number },
  tolerance: number = 2
) {
  expect(actual.x).toBeCloseTo(expected.x, tolerance);
  expect(actual.y).toBeCloseTo(expected.y, tolerance);
  expect(actual.width).toBeCloseTo(expected.width, tolerance);
  expect(actual.height).toBeCloseTo(expected.height, tolerance);
}

/**
 * Assert that a field has valid coordinates within page bounds
 */
export function expectFieldWithinPageBounds(
  field: { x: number; y: number; width: number; height: number },
  pageDims: { width: number; height: number }
) {
  expect(field.x).toBeGreaterThanOrEqual(0);
  expect(field.y).toBeGreaterThanOrEqual(0);
  expect(field.x + field.width).toBeLessThanOrEqual(pageDims.width);
  expect(field.y + field.height).toBeLessThanOrEqual(pageDims.height);
}

/**
 * Assert that field dimensions meet minimum requirements
 */
export function expectValidFieldDimensions(
  field: { width: number; height: number; type?: string }
) {
  const minDimensions: Record<string, { width: number; height: number }> = {
    text: { width: 20, height: 10 },
    checkbox: { width: 8, height: 8 },
    radio: { width: 8, height: 8 },
    dropdown: { width: 30, height: 12 },
    signature: { width: 40, height: 20 },
  };

  const min = field.type ? minDimensions[field.type] : { width: 10, height: 10 };
  expect(field.width).toBeGreaterThanOrEqual(min.width);
  expect(field.height).toBeGreaterThanOrEqual(min.height);
}

// ============================================================
// Test Data Generators
// ============================================================

/**
 * Generate mock OCR text lines for testing
 */
export function generateMockOcrLines(count: number, startY: number = 700, yGap: number = 50) {
  const labels = [
    'שם:', 'כתובת:', 'עיר:', 'טלפון:', 'תאריך:', 'חתימה:',
    'מספר:', 'ת.ז:', 'דוא"ל:', 'הערות:',
  ];

  return Array.from({ length: count }, (_, i) => ({
    content: labels[i % labels.length],
    box: {
      x: 450,
      y: startY - i * yGap,
      width: 60,
      height: 20,
    },
  }));
}

/**
 * Generate mock Gemini fields matching OCR lines
 */
export function generateMockGeminiFields(ocrLines: Array<{ content: string }>) {
  return ocrLines.map((line, i) => ({
    labelText: line.content,
    fieldType: 'underline' as const,
    inputType: 'text' as const,
    section: 'פרטים כלליים',
    required: i % 2 === 0,
    rowGroup: `row_${i + 1}`,
    relatedFields: [],
    hasVisibleBoundary: true,
  }));
}

// ============================================================
// Confidence Score Helpers
// ============================================================

/**
 * Create a mock confidence score object
 */
export function createMockConfidence(
  labelMatch: number = 1.0,
  positionCertainty: number = 0.8,
  typeCertainty: number = 0.85
) {
  const overall =
    labelMatch * 0.3 +
    positionCertainty * 0.5 +
    typeCertainty * 0.2;

  return {
    labelMatch,
    positionCertainty,
    typeCertainty,
    overall,
  };
}

// ============================================================
// Mock Vercel Request/Response
// ============================================================

export interface MockVercelRequest {
  method: string;
  body: any;
  headers?: Record<string, string>;
}

export interface MockVercelResponse {
  status: Mock<any, any>;
  json: Mock<any, any>;
  setHeader: Mock<any, any>;
  end: Mock<any, any>;
}

export function createMockVercelRequest(method: string, body: any): MockVercelRequest {
  return {
    method,
    body,
    headers: {},
  };
}

export function createMockVercelResponse(): MockVercelResponse {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
    end: vi.fn().mockReturnThis(),
  };
}

// ============================================================
// Timeout Helpers
// ============================================================

/**
 * Wait for a promise with timeout
 */
export async function waitForCondition(
  condition: () => boolean,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> {
  const startTime = Date.now();
  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error('Condition not met within timeout');
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
}

// ============================================================
// Snapshot Testing Helpers
// ============================================================

/**
 * Normalize field object for snapshot testing (remove dynamic values)
 */
export function normalizeFieldForSnapshot(field: any) {
  const { _source, confidence, ...rest } = field;
  return {
    ...rest,
    // Round coordinates for consistent snapshots
    x: Math.round(rest.x * 10) / 10,
    y: Math.round(rest.y * 10) / 10,
    width: Math.round(rest.width * 10) / 10,
    height: Math.round(rest.height * 10) / 10,
  };
}
