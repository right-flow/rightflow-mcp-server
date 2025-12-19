import { describe, it, expect, beforeEach } from 'vitest';

/**
 * Unit Tests for AI Field Extraction Module
 *
 * Tests cover:
 * - Cache key generation
 * - ArrayBuffer to base64 conversion
 * - Field conversion from Gemini response to FieldDefinition
 * - Page batch processing logic
 * - Error handling
 */

// ============================================
// Test Helper Functions (extracted from module)
// ============================================

/**
 * Generate cache key for a PDF page
 */
function getCacheKey(pdfName: string, pageNumber: number): string {
  return `${pdfName}_page_${pageNumber}`;
}

/**
 * Convert ArrayBuffer to base64 string in chunks to avoid stack overflow
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 8192;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

// ============================================
// Cache Key Generation Tests
// ============================================

describe('getCacheKey', () => {
  it('generates correct cache key format', () => {
    expect(getCacheKey('document.pdf', 1)).toBe('document.pdf_page_1');
    expect(getCacheKey('test.pdf', 5)).toBe('test.pdf_page_5');
  });

  it('handles special characters in filename', () => {
    expect(getCacheKey('my document (1).pdf', 3)).toBe('my document (1).pdf_page_3');
    expect(getCacheKey('טופס_עברי.pdf', 2)).toBe('טופס_עברי.pdf_page_2');
  });

  it('handles page numbers correctly', () => {
    expect(getCacheKey('doc.pdf', 0)).toBe('doc.pdf_page_0');
    expect(getCacheKey('doc.pdf', 100)).toBe('doc.pdf_page_100');
    expect(getCacheKey('doc.pdf', 999)).toBe('doc.pdf_page_999');
  });

  it('generates unique keys for different pages', () => {
    const key1 = getCacheKey('doc.pdf', 1);
    const key2 = getCacheKey('doc.pdf', 2);
    const key3 = getCacheKey('doc.pdf', 3);

    expect(key1).not.toBe(key2);
    expect(key2).not.toBe(key3);
    expect(key1).not.toBe(key3);
  });

  it('generates unique keys for different documents', () => {
    const key1 = getCacheKey('doc1.pdf', 1);
    const key2 = getCacheKey('doc2.pdf', 1);

    expect(key1).not.toBe(key2);
  });
});

// ============================================
// ArrayBuffer to Base64 Conversion Tests
// ============================================

describe('arrayBufferToBase64', () => {
  it('converts empty buffer to empty base64', () => {
    const buffer = new ArrayBuffer(0);
    expect(arrayBufferToBase64(buffer)).toBe('');
  });

  it('converts small buffer correctly', () => {
    // Create a buffer with known content: "Hello"
    const encoder = new TextEncoder();
    const data = encoder.encode('Hello');
    const buffer = data.buffer;

    const result = arrayBufferToBase64(buffer.slice(0, data.length));
    expect(result).toBe(btoa('Hello'));
  });

  it('converts buffer with special characters', () => {
    const encoder = new TextEncoder();
    const data = encoder.encode('שלום');
    const result = arrayBufferToBase64(data.buffer.slice(0, data.length));

    // Verify it decodes back correctly
    const decoded = atob(result);
    const bytes = new Uint8Array(decoded.length);
    for (let i = 0; i < decoded.length; i++) {
      bytes[i] = decoded.charCodeAt(i);
    }
    const decodedText = new TextDecoder().decode(bytes);
    expect(decodedText).toBe('שלום');
  });

  it('handles buffer larger than chunk size (8192)', () => {
    // Create a large buffer (16KB)
    const size = 16384;
    const buffer = new ArrayBuffer(size);
    const view = new Uint8Array(buffer);
    for (let i = 0; i < size; i++) {
      view[i] = i % 256;
    }

    const result = arrayBufferToBase64(buffer);

    // Verify the result is valid base64
    expect(() => atob(result)).not.toThrow();

    // Verify length is approximately 4/3 of original (base64 expansion)
    expect(result.length).toBeGreaterThan(size);
  });

  it('produces consistent results for same input', () => {
    const encoder = new TextEncoder();
    const data = encoder.encode('Test data for consistency');
    const buffer = data.buffer.slice(0, data.length);

    const result1 = arrayBufferToBase64(buffer);
    const result2 = arrayBufferToBase64(buffer);

    expect(result1).toBe(result2);
  });
});

// ============================================
// Field Conversion Tests
// ============================================

interface GeminiFieldResponse {
  type: 'text' | 'checkbox' | 'radio' | 'dropdown' | 'signature';
  x: number;
  y: number;
  width: number;
  height: number;
  pageNumber: number;
  label?: string;
  name: string;
  required: boolean;
  direction: 'ltr' | 'rtl';
}

/**
 * Convert Gemini field response to FieldDefinition format
 * (Extracted conversion logic for testing)
 */
function convertGeminiFieldToDefinition(
  gf: GeminiFieldResponse,
  index: number
) {
  return {
    id: 'test-uuid',
    type: gf.type,
    pageNumber: gf.pageNumber,
    x: gf.x,
    y: gf.y,
    width: gf.width,
    height: gf.height,
    name: gf.name || `field_${index + 1}`,
    label: gf.label,
    required: gf.required,
    direction: gf.direction,
    sectionName: 'כללי',
    autoFill: false,
    index: index,
    ...(gf.type === 'text' && {
      font: 'NotoSansHebrew',
      fontSize: 12,
    }),
    ...(gf.type === 'dropdown' && {
      options: ['אפשרות 1', 'אפשרות 2', 'אפשרות 3'],
    }),
    ...(gf.type === 'radio' && {
      options: ['אפשרות 1', 'אפשרות 2'],
      radioGroup: gf.name || `radio_group_${index + 1}`,
      spacing: 25,
      orientation: 'vertical' as const,
    }),
  };
}

describe('convertGeminiFieldToDefinition', () => {
  describe('text fields', () => {
    it('converts text field with all properties', () => {
      const geminiField: GeminiFieldResponse = {
        type: 'text',
        x: 100,
        y: 200,
        width: 150,
        height: 20,
        pageNumber: 1,
        label: 'שם פרטי',
        name: 'first_name',
        required: true,
        direction: 'rtl',
      };

      const result = convertGeminiFieldToDefinition(geminiField, 0);

      expect(result.type).toBe('text');
      expect(result.x).toBe(100);
      expect(result.y).toBe(200);
      expect(result.width).toBe(150);
      expect(result.height).toBe(20);
      expect(result.pageNumber).toBe(1);
      expect(result.label).toBe('שם פרטי');
      expect(result.name).toBe('first_name');
      expect(result.required).toBe(true);
      expect(result.direction).toBe('rtl');
      expect(result.font).toBe('NotoSansHebrew');
      expect(result.fontSize).toBe(12);
      expect(result.sectionName).toBe('כללי');
      expect(result.autoFill).toBe(false);
    });

    it('assigns default name when missing', () => {
      const geminiField: GeminiFieldResponse = {
        type: 'text',
        x: 100,
        y: 200,
        width: 150,
        height: 20,
        pageNumber: 1,
        name: '',
        required: false,
        direction: 'ltr',
      };

      const result = convertGeminiFieldToDefinition(geminiField, 5);
      expect(result.name).toBe('field_6'); // index + 1
    });
  });

  describe('checkbox fields', () => {
    it('converts checkbox field without extra properties', () => {
      const geminiField: GeminiFieldResponse = {
        type: 'checkbox',
        x: 50,
        y: 100,
        width: 15,
        height: 15,
        pageNumber: 2,
        name: 'agree_terms',
        required: true,
        direction: 'ltr',
      };

      const result = convertGeminiFieldToDefinition(geminiField, 1);

      expect(result.type).toBe('checkbox');
      expect(result.font).toBeUndefined();
      expect(result.fontSize).toBeUndefined();
      expect(result.options).toBeUndefined();
      expect(result.radioGroup).toBeUndefined();
    });
  });

  describe('dropdown fields', () => {
    it('adds default options to dropdown field', () => {
      const geminiField: GeminiFieldResponse = {
        type: 'dropdown',
        x: 200,
        y: 300,
        width: 100,
        height: 25,
        pageNumber: 1,
        name: 'country',
        required: false,
        direction: 'rtl',
      };

      const result = convertGeminiFieldToDefinition(geminiField, 2);

      expect(result.type).toBe('dropdown');
      expect(result.options).toEqual(['אפשרות 1', 'אפשרות 2', 'אפשרות 3']);
      expect(result.font).toBeUndefined();
    });
  });

  describe('radio fields', () => {
    it('adds radio-specific properties', () => {
      const geminiField: GeminiFieldResponse = {
        type: 'radio',
        x: 100,
        y: 400,
        width: 20,
        height: 20,
        pageNumber: 1,
        label: 'מגדר',
        name: 'gender',
        required: true,
        direction: 'rtl',
      };

      const result = convertGeminiFieldToDefinition(geminiField, 3);

      expect(result.type).toBe('radio');
      expect(result.options).toEqual(['אפשרות 1', 'אפשרות 2']);
      expect(result.radioGroup).toBe('gender');
      expect(result.spacing).toBe(25);
      expect(result.orientation).toBe('vertical');
    });

    it('generates radioGroup from index when name is missing', () => {
      const geminiField: GeminiFieldResponse = {
        type: 'radio',
        x: 100,
        y: 400,
        width: 20,
        height: 20,
        pageNumber: 1,
        name: '',
        required: false,
        direction: 'ltr',
      };

      const result = convertGeminiFieldToDefinition(geminiField, 7);
      expect(result.radioGroup).toBe('radio_group_8');
    });
  });

  describe('signature fields', () => {
    it('converts signature field without extra properties', () => {
      const geminiField: GeminiFieldResponse = {
        type: 'signature',
        x: 300,
        y: 700,
        width: 200,
        height: 50,
        pageNumber: 3,
        label: 'חתימה',
        name: 'signature_1',
        required: true,
        direction: 'rtl',
      };

      const result = convertGeminiFieldToDefinition(geminiField, 10);

      expect(result.type).toBe('signature');
      expect(result.font).toBeUndefined();
      expect(result.options).toBeUndefined();
    });
  });

  describe('index tracking', () => {
    it('correctly assigns index to each field', () => {
      const field: GeminiFieldResponse = {
        type: 'text',
        x: 0,
        y: 0,
        width: 100,
        height: 20,
        pageNumber: 1,
        name: 'test',
        required: false,
        direction: 'ltr',
      };

      expect(convertGeminiFieldToDefinition(field, 0).index).toBe(0);
      expect(convertGeminiFieldToDefinition(field, 5).index).toBe(5);
      expect(convertGeminiFieldToDefinition(field, 99).index).toBe(99);
    });
  });
});

// ============================================
// Batch Processing Logic Tests
// ============================================

describe('batch processing logic', () => {
  const PAGE_THRESHOLD = 3;
  const BATCH_SIZE = 3;

  function shouldProcessPageByPage(pageCount: number): boolean {
    return pageCount > PAGE_THRESHOLD;
  }

  function calculateBatches(totalPages: number, batchSize: number): number[][] {
    const batches: number[][] = [];
    for (let start = 0; start < totalPages; start += batchSize) {
      const end = Math.min(start + batchSize, totalPages);
      batches.push(Array.from({ length: end - start }, (_, i) => start + i));
    }
    return batches;
  }

  describe('page threshold decision', () => {
    it('processes small documents as whole (3 pages or less)', () => {
      expect(shouldProcessPageByPage(1)).toBe(false);
      expect(shouldProcessPageByPage(2)).toBe(false);
      expect(shouldProcessPageByPage(3)).toBe(false);
    });

    it('processes large documents page by page (more than 3 pages)', () => {
      expect(shouldProcessPageByPage(4)).toBe(true);
      expect(shouldProcessPageByPage(10)).toBe(true);
      expect(shouldProcessPageByPage(100)).toBe(true);
    });
  });

  describe('batch calculation', () => {
    it('creates single batch for small documents', () => {
      const batches = calculateBatches(3, BATCH_SIZE);
      expect(batches).toEqual([[0, 1, 2]]);
    });

    it('creates multiple batches for larger documents', () => {
      const batches = calculateBatches(7, BATCH_SIZE);
      expect(batches).toEqual([
        [0, 1, 2],
        [3, 4, 5],
        [6],
      ]);
    });

    it('handles exact batch size multiples', () => {
      const batches = calculateBatches(9, BATCH_SIZE);
      expect(batches).toEqual([
        [0, 1, 2],
        [3, 4, 5],
        [6, 7, 8],
      ]);
    });

    it('handles single page', () => {
      const batches = calculateBatches(1, BATCH_SIZE);
      expect(batches).toEqual([[0]]);
    });

    it('handles large documents efficiently', () => {
      const batches = calculateBatches(25, BATCH_SIZE);
      expect(batches.length).toBe(9); // ceil(25/3) = 9
      expect(batches[0]).toEqual([0, 1, 2]);
      expect(batches[8]).toEqual([24]); // Last batch with single page
    });
  });
});

// ============================================
// Error Aggregation Tests
// ============================================

describe('error aggregation', () => {
  interface PageResult {
    pageNumber: number;
    fields: GeminiFieldResponse[];
    error?: string;
  }

  function aggregateResults(results: PageResult[]): {
    allFields: GeminiFieldResponse[];
    errors: string[];
  } {
    const allFields: GeminiFieldResponse[] = [];
    const errors: string[] = [];

    for (const result of results) {
      if (result.error) {
        errors.push(`עמוד ${result.pageNumber}: ${result.error}`);
      } else {
        allFields.push(...result.fields);
      }
    }

    return { allFields, errors };
  }

  it('collects fields from successful pages', () => {
    const results: PageResult[] = [
      {
        pageNumber: 1,
        fields: [
          { type: 'text', x: 0, y: 0, width: 100, height: 20, pageNumber: 1, name: 'f1', required: false, direction: 'ltr' },
        ],
      },
      {
        pageNumber: 2,
        fields: [
          { type: 'checkbox', x: 50, y: 50, width: 15, height: 15, pageNumber: 2, name: 'f2', required: false, direction: 'ltr' },
        ],
      },
    ];

    const { allFields, errors } = aggregateResults(results);

    expect(allFields.length).toBe(2);
    expect(errors.length).toBe(0);
  });

  it('collects errors from failed pages', () => {
    const results: PageResult[] = [
      { pageNumber: 1, fields: [], error: 'Timeout' },
      { pageNumber: 2, fields: [], error: 'Invalid response' },
    ];

    const { allFields, errors } = aggregateResults(results);

    expect(allFields.length).toBe(0);
    expect(errors.length).toBe(2);
    expect(errors[0]).toBe('עמוד 1: Timeout');
    expect(errors[1]).toBe('עמוד 2: Invalid response');
  });

  it('handles mixed success and failure', () => {
    const results: PageResult[] = [
      {
        pageNumber: 1,
        fields: [
          { type: 'text', x: 0, y: 0, width: 100, height: 20, pageNumber: 1, name: 'f1', required: false, direction: 'ltr' },
        ],
      },
      { pageNumber: 2, fields: [], error: 'Network error' },
      {
        pageNumber: 3,
        fields: [
          { type: 'text', x: 0, y: 0, width: 100, height: 20, pageNumber: 3, name: 'f2', required: false, direction: 'ltr' },
        ],
      },
    ];

    const { allFields, errors } = aggregateResults(results);

    expect(allFields.length).toBe(2);
    expect(errors.length).toBe(1);
    expect(errors[0]).toContain('עמוד 2');
  });
});

// ============================================
// Page Cache Tests
// ============================================

describe('page cache behavior', () => {
  let cache: Map<string, string>;

  beforeEach(() => {
    cache = new Map<string, string>();
  });

  it('stores and retrieves cached pages', () => {
    const key = getCacheKey('test.pdf', 1);
    const value = 'base64data';

    cache.set(key, value);

    expect(cache.has(key)).toBe(true);
    expect(cache.get(key)).toBe(value);
  });

  it('returns undefined for uncached pages', () => {
    const key = getCacheKey('test.pdf', 99);
    expect(cache.has(key)).toBe(false);
    expect(cache.get(key)).toBeUndefined();
  });

  it('can clear the cache', () => {
    cache.set(getCacheKey('doc1.pdf', 1), 'data1');
    cache.set(getCacheKey('doc1.pdf', 2), 'data2');
    cache.set(getCacheKey('doc2.pdf', 1), 'data3');

    expect(cache.size).toBe(3);

    cache.clear();

    expect(cache.size).toBe(0);
  });

  it('overwrites existing cache entries', () => {
    const key = getCacheKey('test.pdf', 1);

    cache.set(key, 'old_data');
    cache.set(key, 'new_data');

    expect(cache.get(key)).toBe('new_data');
    expect(cache.size).toBe(1);
  });
});

// ============================================
// Field Statistics Tests
// ============================================

describe('field statistics', () => {
  function calculateFieldsPerPage(fields: { pageNumber: number }[]): Record<number, number> {
    const stats: Record<number, number> = {};
    fields.forEach(f => {
      stats[f.pageNumber] = (stats[f.pageNumber] || 0) + 1;
    });
    return stats;
  }

  it('calculates fields per page correctly', () => {
    const fields = [
      { pageNumber: 1 },
      { pageNumber: 1 },
      { pageNumber: 1 },
      { pageNumber: 2 },
      { pageNumber: 2 },
      { pageNumber: 3 },
    ];

    const stats = calculateFieldsPerPage(fields);

    expect(stats).toEqual({
      1: 3,
      2: 2,
      3: 1,
    });
  });

  it('handles empty fields array', () => {
    const stats = calculateFieldsPerPage([]);
    expect(stats).toEqual({});
  });

  it('handles single page document', () => {
    const fields = [
      { pageNumber: 1 },
      { pageNumber: 1 },
    ];

    const stats = calculateFieldsPerPage(fields);
    expect(stats).toEqual({ 1: 2 });
  });

  it('handles non-sequential page numbers', () => {
    const fields = [
      { pageNumber: 1 },
      { pageNumber: 5 },
      { pageNumber: 10 },
    ];

    const stats = calculateFieldsPerPage(fields);
    expect(stats).toEqual({ 1: 1, 5: 1, 10: 1 });
  });
});
