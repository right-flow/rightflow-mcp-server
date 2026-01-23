/**
 * Transform Engine Tests - Phase 2
 * TDD RED Phase: Write tests first, then implement
 *
 * Tests 15+ transform types:
 * - String: trim, uppercase, lowercase, replace, truncate
 * - Hebrew: hebrew_reverse, strip_nikud, hebrew_numbers
 * - Date: date_format, date_add, date_now
 * - Number: to_number, round, currency
 * - Lookup: map, conditional
 */

import {
  executeTransforms,
  validateTransforms,
  Transform,
  TransformValidationError,
} from './transformEngine';

describe('Transform Engine - String Transforms', () => {
  describe('trim', () => {
    it('should remove leading and trailing whitespace', () => {
      const result = executeTransforms('  hello world  ', [{ type: 'trim' }]);
      expect(result.output).toBe('hello world');
      expect(result.steps).toHaveLength(1);
      expect(result.steps[0].transform).toBe('trim');
    });

    it('should handle Hebrew text', () => {
      const result = executeTransforms('  שלום עולם  ', [{ type: 'trim' }]);
      expect(result.output).toBe('שלום עולם');
    });

    it('should not modify middle spaces', () => {
      const result = executeTransforms('  hello   world  ', [{ type: 'trim' }]);
      expect(result.output).toBe('hello   world');
    });

    it('should handle empty string', () => {
      const result = executeTransforms('', [{ type: 'trim' }]);
      expect(result.output).toBe('');
    });

    it('should handle string with only whitespace', () => {
      const result = executeTransforms('     ', [{ type: 'trim' }]);
      expect(result.output).toBe('');
    });
  });

  describe('uppercase', () => {
    it('should convert text to uppercase', () => {
      const result = executeTransforms('hello world', [{ type: 'uppercase' }]);
      expect(result.output).toBe('HELLO WORLD');
    });

    it('should handle Hebrew text', () => {
      const result = executeTransforms('שלום', [{ type: 'uppercase' }]);
      expect(result.output).toBe('שלום'); // Hebrew has no case
    });

    it('should handle mixed English and Hebrew', () => {
      const result = executeTransforms('hello שלום', [{ type: 'uppercase' }]);
      expect(result.output).toBe('HELLO שלום');
    });
  });

  describe('lowercase', () => {
    it('should convert text to lowercase', () => {
      const result = executeTransforms('HELLO WORLD', [{ type: 'lowercase' }]);
      expect(result.output).toBe('hello world');
    });

    it('should handle mixed case', () => {
      const result = executeTransforms('HeLLo WoRLd', [{ type: 'lowercase' }]);
      expect(result.output).toBe('hello world');
    });
  });

  describe('replace', () => {
    it('should replace pattern with replacement', () => {
      const result = executeTransforms('Company Ltd', [
        { type: 'replace', params: { pattern: 'Ltd', replacement: 'בע"מ' } },
      ]);
      expect(result.output).toBe('Company בע"מ');
    });

    it('should replace all occurrences', () => {
      const result = executeTransforms('test test test', [
        { type: 'replace', params: { pattern: 'test', replacement: 'בדיקה' } },
      ]);
      expect(result.output).toBe('בדיקה בדיקה בדיקה');
    });

    it('should throw error if pattern missing', () => {
      expect(() => {
        executeTransforms('test', [
          { type: 'replace', params: { replacement: 'new' } },
        ]);
      }).toThrow(TransformValidationError);
    });

    it('should throw error if replacement missing', () => {
      expect(() => {
        executeTransforms('test', [
          { type: 'replace', params: { pattern: 'test' } },
        ]);
      }).toThrow(TransformValidationError);
    });

    it('should support regex patterns with useRegex flag', () => {
      const result = executeTransforms('hello123world456', [
        { type: 'replace', params: { pattern: '\\d+', replacement: 'X', useRegex: true } },
      ]);
      expect(result.output).toBe('helloXworldX');
    });

    it('should support regex capture groups', () => {
      const result = executeTransforms('John Doe', [
        { type: 'replace', params: { pattern: '(\\w+) (\\w+)', replacement: '$2, $1', useRegex: true } },
      ]);
      expect(result.output).toBe('Doe, John');
    });

    it('should support regex flags', () => {
      const result = executeTransforms('Hello HELLO hello', [
        { type: 'replace', params: { pattern: 'hello', replacement: 'hi', useRegex: true, regexFlags: 'gi' } },
      ]);
      expect(result.output).toBe('hi hi hi');
    });

    it('should throw error for invalid regex pattern', () => {
      expect(() => {
        executeTransforms('test', [
          { type: 'replace', params: { pattern: '[invalid(', replacement: 'new', useRegex: true } },
        ]);
      }).toThrow(TransformValidationError);
    });
  });

  describe('truncate', () => {
    it('should truncate string to maxLength', () => {
      const result = executeTransforms('Long company name', [
        { type: 'truncate', params: { maxLength: 10 } },
      ]);
      expect(result.output).toBe('Long compa');
    });

    it('should not modify string shorter than maxLength', () => {
      const result = executeTransforms('Short', [
        { type: 'truncate', params: { maxLength: 10 } },
      ]);
      expect(result.output).toBe('Short');
    });

    it('should handle Hebrew text', () => {
      const result = executeTransforms('חברת דוגמה מאוד ארוכה', [
        { type: 'truncate', params: { maxLength: 10 } },
      ]);
      expect(result.output).toHaveLength(10);
    });

    it('should throw error if maxLength missing', () => {
      expect(() => {
        executeTransforms('test', [{ type: 'truncate', params: {} }]);
      }).toThrow(TransformValidationError);
    });

    it('should throw error if maxLength not positive', () => {
      expect(() => {
        executeTransforms('test', [
          { type: 'truncate', params: { maxLength: -5 } },
        ]);
      }).toThrow(TransformValidationError);
    });
  });
});

describe('Transform Engine - Hebrew Transforms', () => {
  describe('hebrew_reverse', () => {
    it('should reverse Hebrew text for legacy ERPs', () => {
      const result = executeTransforms('חברת דוגמה', [{ type: 'hebrew_reverse' }]);
      expect(result.output).toBe('המגוד תרבח');
    });

    it('should handle pure Hebrew text', () => {
      const result = executeTransforms('שלום', [{ type: 'hebrew_reverse' }]);
      expect(result.output).toBe('םולש');
    });

    it('should handle Hebrew with nikud', () => {
      const result = executeTransforms('שָׁלוֹם', [{ type: 'hebrew_reverse' }]);
      // Should reverse characters including nikud marks
      expect(result.output).not.toBe('שָׁלוֹם');
    });

    it('should be idempotent when applied twice', () => {
      const input = 'חברת דוגמה';
      const result1 = executeTransforms(input, [{ type: 'hebrew_reverse' }]);
      const result2 = executeTransforms(result1.output, [{ type: 'hebrew_reverse' }]);
      expect(result2.output).toBe(input);
    });
  });

  describe('strip_nikud', () => {
    it('should remove vowel marks from Hebrew text', () => {
      const result = executeTransforms('שָׁלוֹם', [{ type: 'strip_nikud' }]);
      expect(result.output).toBe('שלום');
    });

    it('should handle text without nikud', () => {
      const result = executeTransforms('שלום', [{ type: 'strip_nikud' }]);
      expect(result.output).toBe('שלום');
    });

    it('should remove all common nikud marks', () => {
      // Unicode ranges: U+0591-U+05C7
      const textWithNikud = 'בְּרֵאשִׁית';
      const result = executeTransforms(textWithNikud, [{ type: 'strip_nikud' }]);
      expect(result.output).toBe('בראשית');
    });

    it('should not affect English text', () => {
      const result = executeTransforms('Hello World', [{ type: 'strip_nikud' }]);
      expect(result.output).toBe('Hello World');
    });
  });

  describe('hebrew_numbers', () => {
    it('should convert Hebrew letters to numbers', () => {
      const result = executeTransforms('אב', [{ type: 'hebrew_numbers' }]);
      expect(result.output).toBe('3'); // א=1, ב=2, sum=3 (Gematria)
    });

    it('should handle single letter', () => {
      const result = executeTransforms('א', [{ type: 'hebrew_numbers' }]);
      expect(result.output).toBe('1');
    });

    it('should handle ת (400)', () => {
      const result = executeTransforms('ת', [{ type: 'hebrew_numbers' }]);
      expect(result.output).toBe('400');
    });

    it('should handle non-Hebrew text gracefully', () => {
      const result = executeTransforms('Hello', [{ type: 'hebrew_numbers' }]);
      expect(result.output).toBe('0'); // No Hebrew letters
    });
  });
});

describe('Transform Engine - Date Transforms', () => {
  describe('date_format', () => {
    it('should convert DD/MM/YYYY to YYYY-MM-DD', () => {
      const result = executeTransforms('15/01/2026', [
        {
          type: 'date_format',
          params: { from: 'DD/MM/YYYY', to: 'YYYY-MM-DD' },
        },
      ]);
      expect(result.output).toBe('2026-01-15');
    });

    it('should convert YYYY-MM-DD to DD/MM/YYYY', () => {
      const result = executeTransforms('2026-01-15', [
        {
          type: 'date_format',
          params: { from: 'YYYY-MM-DD', to: 'DD/MM/YYYY' },
        },
      ]);
      expect(result.output).toBe('15/01/2026');
    });

    it('should handle timestamp to date', () => {
      const result = executeTransforms('2026-01-15T10:30:00Z', [
        {
          type: 'date_format',
          params: { from: 'ISO8601', to: 'DD/MM/YYYY' },
        },
      ]);
      expect(result.output).toBe('15/01/2026');
    });

    it('should throw error for invalid date', () => {
      expect(() => {
        executeTransforms('invalid-date', [
          {
            type: 'date_format',
            params: { from: 'DD/MM/YYYY', to: 'YYYY-MM-DD' },
          },
        ]);
      }).toThrow();
    });

    it('should throw error if from format missing', () => {
      expect(() => {
        executeTransforms('15/01/2026', [
          { type: 'date_format', params: { to: 'YYYY-MM-DD' } },
        ]);
      }).toThrow(TransformValidationError);
    });

    it('should convert MM/DD/YYYY (US format) to YYYY-MM-DD', () => {
      const result = executeTransforms('01/15/2026', [
        {
          type: 'date_format',
          params: { from: 'MM/DD/YYYY', to: 'YYYY-MM-DD' },
        },
      ]);
      expect(result.output).toBe('2026-01-15');
    });

    it('should convert YYYY-MM-DD to MM/DD/YYYY (US format)', () => {
      const result = executeTransforms('2026-01-15', [
        {
          type: 'date_format',
          params: { from: 'YYYY-MM-DD', to: 'MM/DD/YYYY' },
        },
      ]);
      expect(result.output).toBe('01/15/2026');
    });

    it('should handle datetime with hours and minutes', () => {
      const result = executeTransforms('15/01/2026 14:30', [
        {
          type: 'date_format',
          params: { from: 'DD/MM/YYYY HH:mm', to: 'YYYY-MM-DD HH:mm:ss' },
        },
      ]);
      expect(result.output).toBe('2026-01-15 14:30:00');
    });

    it('should handle datetime with seconds', () => {
      const result = executeTransforms('2026-01-15 14:30:45', [
        {
          type: 'date_format',
          params: { from: 'YYYY-MM-DD HH:mm:ss', to: 'DD/MM/YYYY HH:mm' },
        },
      ]);
      expect(result.output).toBe('15/01/2026 14:30');
    });
  });

  describe('date_add', () => {
    it('should add days to date', () => {
      const result = executeTransforms('2026-01-01', [
        { type: 'date_add', params: { days: 30 } },
      ]);
      expect(result.output).toBe('2026-01-31');
    });

    it('should subtract days with negative value', () => {
      const result = executeTransforms('2026-01-31', [
        { type: 'date_add', params: { days: -30 } },
      ]);
      expect(result.output).toBe('2026-01-01');
    });

    it('should handle month boundary', () => {
      const result = executeTransforms('2026-01-31', [
        { type: 'date_add', params: { days: 1 } },
      ]);
      expect(result.output).toBe('2026-02-01');
    });

    it('should throw error if days missing', () => {
      expect(() => {
        executeTransforms('2026-01-01', [{ type: 'date_add', params: {} }]);
      }).toThrow(TransformValidationError);
    });
  });

  describe('date_now', () => {
    it('should return current date', () => {
      const result = executeTransforms(null, [{ type: 'date_now' }]);
      const today = new Date().toISOString().split('T')[0];
      expect(result.output).toBe(today);
    });

    it('should ignore input value', () => {
      const result = executeTransforms('some-value', [{ type: 'date_now' }]);
      const today = new Date().toISOString().split('T')[0];
      expect(result.output).toBe(today);
    });
  });
});

describe('Transform Engine - Number Transforms', () => {
  describe('to_number', () => {
    it('should convert string to number', () => {
      const result = executeTransforms('123.45', [{ type: 'to_number' }]);
      expect(result.output).toBe(123.45);
    });

    it('should handle integer strings', () => {
      const result = executeTransforms('42', [{ type: 'to_number' }]);
      expect(result.output).toBe(42);
    });

    it('should handle negative numbers', () => {
      const result = executeTransforms('-123.45', [{ type: 'to_number' }]);
      expect(result.output).toBe(-123.45);
    });

    it('should throw error for invalid number', () => {
      expect(() => {
        executeTransforms('not-a-number', [{ type: 'to_number' }]);
      }).toThrow();
    });

    it('should handle number input (no-op)', () => {
      const result = executeTransforms(123.45, [{ type: 'to_number' }]);
      expect(result.output).toBe(123.45);
    });
  });

  describe('round', () => {
    it('should round to specified decimals', () => {
      const result = executeTransforms(123.456, [
        { type: 'round', params: { decimals: 2 } },
      ]);
      expect(result.output).toBe(123.46);
    });

    it('should round to integer when decimals = 0', () => {
      const result = executeTransforms(123.456, [
        { type: 'round', params: { decimals: 0 } },
      ]);
      expect(result.output).toBe(123);
    });

    it('should handle negative decimals', () => {
      const result = executeTransforms(12345, [
        { type: 'round', params: { decimals: -2 } },
      ]);
      expect(result.output).toBe(12300);
    });

    it('should throw error if decimals missing', () => {
      expect(() => {
        executeTransforms(123.456, [{ type: 'round', params: {} }]);
      }).toThrow(TransformValidationError);
    });
  });

  describe('currency', () => {
    it('should format as currency with symbol', () => {
      const result = executeTransforms(1234.56, [
        { type: 'currency', params: { symbol: '₪' } },
      ]);
      expect(result.output).toBe('₪1,234.56');
    });

    it('should default to $ symbol', () => {
      const result = executeTransforms(1234.56, [{ type: 'currency' }]);
      expect(result.output).toBe('$1,234.56');
    });

    it('should handle zero', () => {
      const result = executeTransforms(0, [
        { type: 'currency', params: { symbol: '₪' } },
      ]);
      expect(result.output).toBe('₪0.00');
    });
  });
});

describe('Transform Engine - Lookup Transforms', () => {
  describe('map', () => {
    it('should map value using valueMap', () => {
      const result = executeTransforms('yes', [
        {
          type: 'map',
          params: {
            values: {
              yes: true,
              no: false,
            },
          },
        },
      ]);
      expect(result.output).toBe(true);
    });

    it('should handle Hebrew values', () => {
      const result = executeTransforms('כן', [
        {
          type: 'map',
          params: {
            values: {
              'כן': true,
              'לא': false,
            },
          },
        },
      ]);
      expect(result.output).toBe(true);
    });

    it('should throw error if value not in map', () => {
      expect(() => {
        executeTransforms('unknown', [
          {
            type: 'map',
            params: {
              values: {
                yes: true,
                no: false,
              },
            },
          },
        ]);
      }).toThrow();
    });

    it('should throw error if values missing', () => {
      expect(() => {
        executeTransforms('yes', [{ type: 'map', params: {} }]);
      }).toThrow(TransformValidationError);
    });
  });

  describe('conditional', () => {
    it('should return then value when condition matches', () => {
      const result = executeTransforms('IL', [
        {
          type: 'conditional',
          params: {
            if: { equals: 'IL' },
            then: '+972',
            else: '+1',
          },
        },
      ]);
      expect(result.output).toBe('+972');
    });

    it('should return else value when condition does not match', () => {
      const result = executeTransforms('US', [
        {
          type: 'conditional',
          params: {
            if: { equals: 'IL' },
            then: '+972',
            else: '+1',
          },
        },
      ]);
      expect(result.output).toBe('+1');
    });

    it('should throw error if required params missing', () => {
      expect(() => {
        executeTransforms('IL', [
          { type: 'conditional', params: { if: { equals: 'IL' } } },
        ]);
      }).toThrow(TransformValidationError);
    });
  });
});

describe('Transform Engine - Chaining', () => {
  it('should execute transforms in order', () => {
    const result = executeTransforms('  hello world  ', [
      { type: 'trim' },
      { type: 'uppercase' },
    ]);
    expect(result.output).toBe('HELLO WORLD');
    expect(result.steps).toHaveLength(2);
    expect(result.steps[0].output).toBe('hello world');
    expect(result.steps[1].output).toBe('HELLO WORLD');
  });

  it('should chain Hebrew transforms', () => {
    const result = executeTransforms('  חברת דוגמה בע״מ  ', [
      { type: 'trim' },
      { type: 'strip_nikud' },
      { type: 'hebrew_reverse' },
    ]);
    expect(result.steps).toHaveLength(3);
  });

  it('should chain complex transform pipeline', () => {
    const result = executeTransforms('  Company Ltd  ', [
      { type: 'trim' },
      { type: 'replace', params: { pattern: 'Ltd', replacement: 'Limited' } },
      { type: 'uppercase' },
      { type: 'truncate', params: { maxLength: 15 } },
    ]);
    expect(result.output).toBe('COMPANY LIMITED');
    expect(result.steps).toHaveLength(4);
  });

  it('should pass output of one transform as input to next', () => {
    const result = executeTransforms('hello', [
      { type: 'uppercase' },
      { type: 'replace', params: { pattern: 'HELLO', replacement: 'GOODBYE' } },
    ]);
    expect(result.output).toBe('GOODBYE');
    expect(result.steps[0].output).toBe('HELLO');
    expect(result.steps[1].input).toBe('HELLO');
  });
});

describe('Transform Engine - Validation', () => {
  it('should throw error for unknown transform type', () => {
    expect(() => {
      executeTransforms('test', [{ type: 'unknown_transform' }]);
    }).toThrow(TransformValidationError);
  });

  it('should validate transforms before execution', () => {
    const transforms: Transform[] = [
      { type: 'trim' },
      { type: 'uppercase' },
    ];

    expect(() => validateTransforms(transforms)).not.toThrow();
  });

  it('should detect invalid transform type in validation', () => {
    const transforms: Transform[] = [
      { type: 'trim' },
      { type: 'invalid_type' },
    ];

    expect(() => validateTransforms(transforms)).toThrow(TransformValidationError);
  });

  it('should detect missing required params in validation', () => {
    const transforms: Transform[] = [
      { type: 'replace', params: { pattern: 'test' } }, // missing replacement
    ];

    expect(() => validateTransforms(transforms)).toThrow(TransformValidationError);
  });
});

describe('Transform Engine - Error Handling', () => {
  it('should not crash on null input', () => {
    expect(() => {
      executeTransforms(null, [{ type: 'trim' }]);
    }).toThrow();
  });

  it('should not crash on undefined input', () => {
    expect(() => {
      executeTransforms(undefined, [{ type: 'trim' }]);
    }).toThrow();
  });

  it('should handle empty transform array', () => {
    const result = executeTransforms('test', []);
    expect(result.output).toBe('test');
    expect(result.steps).toHaveLength(0);
  });

  it('should provide clear error messages', () => {
    try {
      executeTransforms('test', [{ type: 'unknown_transform' }]);
      fail('Should have thrown error');
    } catch (error: any) {
      expect(error.message).toContain('unknown_transform');
      expect(error).toBeInstanceOf(TransformValidationError);
    }
  });

  it('should include transform index in error message', () => {
    try {
      executeTransforms('test', [
        { type: 'trim' },
        { type: 'unknown_transform' },
      ]);
      fail('Should have thrown error');
    } catch (error: any) {
      expect(error.message).toContain('transform 1'); // 0-indexed
    }
  });
});

describe('Transform Engine - Performance', () => {
  it('should handle long transform chains efficiently', () => {
    const transforms: Transform[] = Array(50).fill({ type: 'trim' });
    const startTime = Date.now();
    executeTransforms('  test  ', transforms);
    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(100); // Should complete in <100ms
  });

  it('should handle large strings efficiently', () => {
    const largeString = 'x'.repeat(10000);
    const startTime = Date.now();
    executeTransforms(largeString, [
      { type: 'trim' },
      { type: 'uppercase' },
    ]);
    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(50);
  });

  it('should include performance metrics in result', () => {
    const result = executeTransforms('  test  ', [
      { type: 'trim' },
      { type: 'uppercase' },
    ]);

    // Check that totalDurationMs is present
    expect(result.totalDurationMs).toBeDefined();
    expect(typeof result.totalDurationMs).toBe('number');
    expect(result.totalDurationMs).toBeGreaterThanOrEqual(0);

    // Check that each step has durationMs
    result.steps.forEach((step) => {
      expect(step.durationMs).toBeDefined();
      expect(typeof step.durationMs).toBe('number');
      expect(step.durationMs).toBeGreaterThanOrEqual(0);
    });
  });

  it('should track individual transform duration', () => {
    const result = executeTransforms('hello world', [
      { type: 'trim' },
      { type: 'uppercase' },
      { type: 'replace', params: { pattern: 'WORLD', replacement: 'UNIVERSE' } },
    ]);

    // Each step should have a duration
    expect(result.steps).toHaveLength(3);
    expect(result.steps[0].durationMs).toBeGreaterThanOrEqual(0);
    expect(result.steps[1].durationMs).toBeGreaterThanOrEqual(0);
    expect(result.steps[2].durationMs).toBeGreaterThanOrEqual(0);

    // Total duration should be sum of all steps (approximately)
    const sumOfSteps = result.steps.reduce((sum, step) => sum + (step.durationMs || 0), 0);
    expect(result.totalDurationMs).toBeGreaterThanOrEqual(sumOfSteps);
  });

  it('should measure duration accurately for complex transforms', () => {
    const result = executeTransforms('15/01/2026', [
      {
        type: 'date_format',
        params: { from: 'DD/MM/YYYY', to: 'YYYY-MM-DD' },
      },
    ]);

    // Date format transform should have measurable duration
    expect(result.steps[0].durationMs).toBeGreaterThan(0);
    expect(result.totalDurationMs).toBeGreaterThan(0);
  });
});

describe('Transform Engine - Hebrew Edge Cases', () => {
  it('should handle mixed RTL/LTR text', () => {
    const result = executeTransforms('PDF טופס 2024', [{ type: 'trim' }]);
    expect(result.output).toBe('PDF טופס 2024');
  });

  it('should handle Hebrew with numbers', () => {
    const result = executeTransforms('מספר 123 ו-456', [{ type: 'trim' }]);
    expect(result.output).toBe('מספר 123 ו-456');
  });

  it('should handle Hebrew with punctuation', () => {
    const result = executeTransforms('שאלה?', [{ type: 'trim' }]);
    expect(result.output).toBe('שאלה?');
  });

  it('should handle Hebrew in parentheses', () => {
    const result = executeTransforms('טקסט (בסוגריים)', [{ type: 'trim' }]);
    expect(result.output).toBe('טקסט (בסוגריים)');
  });

  it('should handle email with Hebrew context', () => {
    const result = executeTransforms('מייל: user@example.com', [{ type: 'trim' }]);
    expect(result.output).toBe('מייל: user@example.com');
  });

  it('should handle Hebrew acronyms', () => {
    const result = executeTransforms('צה"ל', [{ type: 'trim' }]);
    expect(result.output).toBe('צה"ל');
  });
});
