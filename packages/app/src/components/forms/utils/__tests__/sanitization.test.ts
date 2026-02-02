/**
 * Unit tests for Sanitization Utilities
 * Testing XSS prevention and BiDi attack protection
 */

import {
  sanitizeTextInput,
  sanitizeHTML,
  sanitizeFieldName,
  sanitizeEmail,
  sanitizePhone,
  sanitizeFileName,
  containsRTL,
  getTextDirection,
} from '../sanitization';

describe('Sanitization Utilities', () => {
  describe('sanitizeTextInput', () => {
    it('should remove dangerous Unicode control characters', () => {
      const input = 'Hello\u202EWorld'; // Contains RIGHT-TO-LEFT OVERRIDE
      const result = sanitizeTextInput(input);
      expect(result).toBe('HelloWorld');
    });

    it('should remove all dangerous BiDi characters', () => {
      const input = '\u202A\u202B\u202C\u202D\u202E\u2066\u2067\u2068\u2069Test';
      const result = sanitizeTextInput(input);
      expect(result).toBe('Test');
    });

    it('should strip HTML tags', () => {
      const input = '<script>alert("XSS")</script>Hello';
      const result = sanitizeTextInput(input);
      expect(result).toBe('Hello');
    });

    it('should preserve safe text', () => {
      const input = 'This is safe text with numbers 123 and symbols !@#';
      const result = sanitizeTextInput(input);
      expect(result).toBe(input);
    });

    it('should preserve Hebrew text without BiDi characters', () => {
      const input = 'שלום עולם';
      const result = sanitizeTextInput(input);
      expect(result).toBe(input);
    });

    it('should handle empty input', () => {
      expect(sanitizeTextInput('')).toBe('');
      expect(sanitizeTextInput(null as any)).toBe('');
      expect(sanitizeTextInput(undefined as any)).toBe('');
    });

    it('should handle mixed Hebrew and English', () => {
      const input = 'Hello שלום World עולם';
      const result = sanitizeTextInput(input);
      expect(result).toBe(input);
    });

    it('should remove JavaScript event handlers', () => {
      const input = '<div onclick="alert(1)">Click me</div>';
      const result = sanitizeTextInput(input);
      expect(result).toBe('Click me');
    });
  });

  describe('sanitizeHTML', () => {
    it('should allow safe HTML tags', () => {
      const input = '<p>Hello <strong>World</strong></p>';
      const result = sanitizeHTML(input);
      expect(result).toContain('<p>');
      expect(result).toContain('<strong>');
    });

    it('should remove dangerous tags', () => {
      const input = '<script>alert("XSS")</script><p>Safe</p>';
      const result = sanitizeHTML(input);
      expect(result).not.toContain('<script>');
      expect(result).toContain('<p>Safe</p>');
    });

    it('should allow safe attributes on links', () => {
      const input = '<a href="https://example.com" target="_blank">Link</a>';
      const result = sanitizeHTML(input);
      expect(result).toContain('href="https://example.com"');
      expect(result).toContain('target="_blank"');
    });

    it('should remove dangerous attributes', () => {
      const input = '<a href="javascript:alert(1)">Bad Link</a>';
      const result = sanitizeHTML(input);
      expect(result).not.toContain('javascript:');
    });

    it('should remove data attributes', () => {
      const input = '<div data-evil="bad">Content</div>';
      const result = sanitizeHTML(input);
      expect(result).not.toContain('data-evil');
    });

    it('should handle empty input', () => {
      expect(sanitizeHTML('')).toBe('');
      expect(sanitizeHTML(null as any)).toBe('');
    });
  });

  describe('sanitizeFieldName', () => {
    it('should replace spaces with underscores', () => {
      const result = sanitizeFieldName('field name with spaces');
      expect(result).toBe('field_name_with_spaces');
    });

    it('should remove special characters', () => {
      const result = sanitizeFieldName('field@name#with$special%chars');
      expect(result).toBe('fieldnamewithspecialchars');
    });

    it('should allow alphanumeric, underscore, and hyphen', () => {
      const result = sanitizeFieldName('field_name-123');
      expect(result).toBe('field_name-123');
    });

    it('should prefix with field_ if starts with number', () => {
      const result = sanitizeFieldName('123field');
      expect(result).toBe('field_123field');
    });

    it('should return empty string for empty input', () => {
      expect(sanitizeFieldName('')).toBe('');
      expect(sanitizeFieldName(null as any)).toBe('');
    });

    it('should handle mixed Hebrew and Latin by keeping Latin part', () => {
      const result = sanitizeFieldName('שדה_field');
      expect(result).toBe('_field');
    });

    // BUG FIX TESTS: Hebrew field name collision prevention
    it('should generate unique field name for Hebrew-only text', () => {
      const result = sanitizeFieldName('שם');
      expect(result).toMatch(/^field_[a-z0-9]+$/);
      expect(result).not.toBe('field');
    });

    it('should generate different field names for different Hebrew texts', () => {
      const name1 = sanitizeFieldName('שם');      // Name
      const name2 = sanitizeFieldName('כתובת');   // Address
      const name3 = sanitizeFieldName('טלפון');   // Phone
      const name4 = sanitizeFieldName('אימייל');  // Email

      // All should have the field_[hash] format
      expect(name1).toMatch(/^field_[a-z0-9]+$/);
      expect(name2).toMatch(/^field_[a-z0-9]+$/);
      expect(name3).toMatch(/^field_[a-z0-9]+$/);
      expect(name4).toMatch(/^field_[a-z0-9]+$/);

      // All should be unique (no collisions)
      const names = [name1, name2, name3, name4];
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(4);
    });

    it('should generate deterministic field names (same input = same output)', () => {
      const name1a = sanitizeFieldName('שם');
      const name1b = sanitizeFieldName('שם');
      expect(name1a).toBe(name1b);

      const name2a = sanitizeFieldName('כתובת');
      const name2b = sanitizeFieldName('כתובת');
      expect(name2a).toBe(name2b);
    });

    it('should handle Arabic text with unique field names', () => {
      const arabic1 = sanitizeFieldName('اسم');      // Name in Arabic
      const arabic2 = sanitizeFieldName('عنوان');    // Address in Arabic

      expect(arabic1).toMatch(/^field_[a-z0-9]+$/);
      expect(arabic2).toMatch(/^field_[a-z0-9]+$/);
      expect(arabic1).not.toBe(arabic2);
    });

    it('should handle mixed Hebrew with spaces', () => {
      const result = sanitizeFieldName('שם פרטי');  // First name (with space)
      expect(result).toMatch(/^field_[a-z0-9]+$/);
      expect(result).not.toBe('field');
    });

    it('should handle Hebrew with numbers and special chars', () => {
      const result = sanitizeFieldName('שדה-123');
      expect(result).toMatch(/^field_[a-z0-9]+$/);
    });

    it('should generate unique names for similar Hebrew texts', () => {
      const name1 = sanitizeFieldName('שם');
      const name2 = sanitizeFieldName('שמ');
      const name3 = sanitizeFieldName('שמה');

      expect(name1).not.toBe(name2);
      expect(name2).not.toBe(name3);
      expect(name1).not.toBe(name3);
    });

    it('should handle very long Hebrew text', () => {
      const longHebrew = 'שדה טקסט ארוך מאוד עם הרבה מילים בעברית';
      const result = sanitizeFieldName(longHebrew);
      expect(result).toMatch(/^field_[a-z0-9]+$/);
      expect(result.length).toBeLessThan(50); // Hash keeps it reasonably short
    });

    it('should handle emoji and other Unicode characters', () => {
      const result1 = sanitizeFieldName('😀field');
      const result2 = sanitizeFieldName('field😀');
      const result3 = sanitizeFieldName('😀😁');

      // Emojis are removed, but should still generate unique names if nothing left
      expect(result3).toMatch(/^field_[a-z0-9]+$/);
    });
  });

  describe('sanitizeEmail', () => {
    it('should remove dangerous Unicode characters', () => {
      const input = 'user\u202E@example.com';
      const result = sanitizeEmail(input);
      expect(result).toBe('user@example.com');
    });

    it('should convert to lowercase', () => {
      const result = sanitizeEmail('USER@EXAMPLE.COM');
      expect(result).toBe('user@example.com');
    });

    it('should trim whitespace', () => {
      const result = sanitizeEmail('  user@example.com  ');
      expect(result).toBe('user@example.com');
    });

    it('should remove HTML tags', () => {
      const input = '<script>alert(1)</script>user@example.com';
      const result = sanitizeEmail(input);
      expect(result).toBe('user@example.com');
    });

    it('should handle empty input', () => {
      expect(sanitizeEmail('')).toBe('');
      expect(sanitizeEmail(null as any)).toBe('');
    });
  });

  describe('sanitizePhone', () => {
    it('should remove dangerous Unicode characters', () => {
      const input = '+1\u202E234567890';
      const result = sanitizePhone(input);
      expect(result).toBe('+1234567890');
    });

    it('should keep only allowed phone characters', () => {
      const input = '+1 (234) 567-8900';
      const result = sanitizePhone(input);
      expect(result).toBe('+1 (234) 567-8900');
    });

    it('should remove letters and special characters', () => {
      const input = 'Call: +1-234-ABC-5678!@#';
      const result = sanitizePhone(input);
      expect(result).toBe('+1-234-5678');
    });

    it('should handle empty input', () => {
      expect(sanitizePhone('')).toBe('');
      expect(sanitizePhone(null as any)).toBe('');
    });
  });

  describe('sanitizeFileName', () => {
    it('should remove path separators', () => {
      const input = '../../../etc/passwd';
      const result = sanitizeFileName(input);
      expect(result).toBe('______etc_passwd');
    });

    it('should remove null bytes', () => {
      const input = 'file.txt\0.jpg';
      const result = sanitizeFileName(input);
      expect(result).toBe('file.txt.jpg');
    });

    it('should remove dangerous Unicode characters', () => {
      const input = 'file\u202E.txt';
      const result = sanitizeFileName(input);
      expect(result).toBe('file.txt');
    });

    it('should limit filename length', () => {
      const longName = 'a'.repeat(300) + '.txt';
      const result = sanitizeFileName(longName);
      expect(result.length).toBeLessThanOrEqual(255);
      expect(result).toEndWith('.txt');
    });

    it('should preserve file extension when truncating', () => {
      const longName = 'a'.repeat(300) + '.pdf';
      const result = sanitizeFileName(longName);
      expect(result).toEndWith('.pdf');
      expect(result.length).toBeLessThanOrEqual(255);
    });

    it('should handle filenames without extension', () => {
      const longName = 'a'.repeat(300);
      const result = sanitizeFileName(longName);
      expect(result.length).toBeLessThanOrEqual(255);
    });

    it('should return file for empty input', () => {
      expect(sanitizeFileName('')).toBe('file');
      expect(sanitizeFileName(null as any)).toBe('file');
    });
  });

  describe('containsRTL', () => {
    it('should detect Hebrew text', () => {
      expect(containsRTL('שלום')).toBe(true);
      expect(containsRTL('Hello שלום')).toBe(true);
      expect(containsRTL('שלום World')).toBe(true);
    });

    it('should detect Arabic text', () => {
      expect(containsRTL('مرحبا')).toBe(true);
      expect(containsRTL('Hello مرحبا')).toBe(true);
    });

    it('should return false for LTR text only', () => {
      expect(containsRTL('Hello World')).toBe(false);
      expect(containsRTL('123456')).toBe(false);
      expect(containsRTL('')).toBe(false);
    });

    it('should detect mixed Hebrew and English', () => {
      expect(containsRTL('Name: שם')).toBe(true);
      expect(containsRTL('כתובת: Address')).toBe(true);
    });
  });

  describe('getTextDirection', () => {
    it('should return rtl for Hebrew text', () => {
      expect(getTextDirection('שלום עולם')).toBe('rtl');
      expect(getTextDirection('טקסט בעברית')).toBe('rtl');
    });

    it('should return rtl for mixed text with Hebrew', () => {
      expect(getTextDirection('Hello שלום')).toBe('rtl');
      expect(getTextDirection('Name: שם')).toBe('rtl');
    });

    it('should return ltr for English only text', () => {
      expect(getTextDirection('Hello World')).toBe('ltr');
      expect(getTextDirection('Test 123')).toBe('ltr');
    });

    it('should return auto for empty text', () => {
      expect(getTextDirection('')).toBe('auto');
      expect(getTextDirection(null as any)).toBe('auto');
      expect(getTextDirection(undefined as any)).toBe('auto');
    });

    it('should return rtl for Arabic text', () => {
      expect(getTextDirection('مرحبا بالعالم')).toBe('rtl');
    });
  });

  describe('XSS Attack Prevention', () => {
    const xssAttacks = [
      '<img src=x onerror="alert(1)">',
      '<svg onload="alert(1)">',
      '<iframe src="javascript:alert(1)">',
      '<body onload="alert(1)">',
      '<input onfocus="alert(1)" autofocus>',
      '<select onfocus="alert(1)" autofocus>',
      '<textarea onfocus="alert(1)" autofocus>',
      '<keygen onfocus="alert(1)" autofocus>',
      '<video><source onerror="alert(1)">',
      '<audio src=x onerror="alert(1)">',
      '<marquee onstart="alert(1)">',
      '<meter onmouseover="alert(1)">'
    ];

    xssAttacks.forEach(attack => {
      it(`should prevent XSS: ${attack.substring(0, 30)}...`, () => {
        const result = sanitizeTextInput(attack);
        expect(result).not.toContain('alert');
        expect(result).not.toContain('javascript:');
        expect(result).not.toContain('onerror');
        expect(result).not.toContain('onload');
        expect(result).not.toContain('onfocus');
      });
    });
  });

  describe('BiDi Attack Prevention', () => {
    it('should prevent RIGHT-TO-LEFT OVERRIDE attack', () => {
      const attack = 'user\u202Emanager'; // Makes "manager" appear as "reganam"
      const result = sanitizeTextInput(attack);
      expect(result).toBe('usermanager');
    });

    it('should prevent filename spoofing with RTL marks', () => {
      const attack = 'document\u202Efdp.exe'; // Makes it look like "documentexe.pdf"
      const result = sanitizeFileName(attack);
      expect(result).toBe('documentfdp.exe');
    });

    it('should prevent mixed direction text confusion', () => {
      const attack = 'Amount: $\u202E500'; // Could make amount appear different
      const result = sanitizeTextInput(attack);
      expect(result).toBe('Amount: $500');
    });
  });
});