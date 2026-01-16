import { describe, it, expect } from 'vitest';
import {
  validateRequired,
  validateDigitsOnly,
  validateLengthBetween,
  validateLengthExact,
  validateIsraeliId,
  validateMobileIL,
  validateEmail,
  validateAge,
  validateNotInFuture,
  validateDate,
  validateNumeric,
  validateRange,
  runValidator,
} from './validators';

describe('validators', () => {
  describe('validateRequired', () => {
    it('should return true for non-empty string', () => {
      expect(validateRequired('hello')).toBe(true);
      expect(validateRequired('שלום')).toBe(true);
    });

    it('should return false for empty string', () => {
      expect(validateRequired('')).toBe(false);
    });

    it('should return false for whitespace only', () => {
      expect(validateRequired('   ')).toBe(false);
      expect(validateRequired('\t\n')).toBe(false);
    });
  });

  describe('validateDigitsOnly', () => {
    it('should return true for digits only', () => {
      expect(validateDigitsOnly('123456')).toBe(true);
      expect(validateDigitsOnly('0')).toBe(true);
    });

    it('should return false for non-digits', () => {
      expect(validateDigitsOnly('12a34')).toBe(false);
      expect(validateDigitsOnly('abc')).toBe(false);
    });

    it('should return true for empty string', () => {
      expect(validateDigitsOnly('')).toBe(true);
    });
  });

  describe('validateNumeric', () => {
    it('should return true for valid numbers', () => {
      expect(validateNumeric('123')).toBe(true);
      expect(validateNumeric('-45')).toBe(true);
      expect(validateNumeric('12.34')).toBe(true);
    });

    it('should return false for invalid numbers', () => {
      expect(validateNumeric('12a34')).toBe(false);
      expect(validateNumeric('abc')).toBe(false);
    });

    it('should return true for empty string', () => {
      expect(validateNumeric('')).toBe(true);
    });
  });

  describe('validateLengthBetween', () => {
    it('should return true for valid length', () => {
      expect(validateLengthBetween('hello', { min: 3, max: 10 })).toBe(true);
      expect(validateLengthBetween('12345', { min: 5, max: 5 })).toBe(true);
    });

    it('should return false for too short', () => {
      expect(validateLengthBetween('hi', { min: 3, max: 10 })).toBe(false);
    });

    it('should return false for too long', () => {
      expect(validateLengthBetween('hello world!', { min: 3, max: 10 })).toBe(false);
    });

    it('should return true for empty string', () => {
      expect(validateLengthBetween('', { min: 3, max: 10 })).toBe(true);
    });
  });

  describe('validateLengthExact', () => {
    it('should return true for exact length', () => {
      expect(validateLengthExact('12345', { length: 5 })).toBe(true);
    });

    it('should return false for different length', () => {
      expect(validateLengthExact('1234', { length: 5 })).toBe(false);
      expect(validateLengthExact('123456', { length: 5 })).toBe(false);
    });

    it('should return true for empty string', () => {
      expect(validateLengthExact('', { length: 5 })).toBe(true);
    });
  });

  describe('validateIsraeliId', () => {
    it('should return true for valid Israeli ID', () => {
      // Known valid Israeli IDs for testing - calculated using Luhn variant
      // ID: 000000018 -> sum should be divisible by 10
      expect(validateIsraeliId('000000018')).toBe(true);
      // ID: 12345679 (8 digits, padded to 012345679)
      expect(validateIsraeliId('39337423')).toBe(true); // Known valid ID
    });

    it('should return false for invalid checksum', () => {
      expect(validateIsraeliId('123456789')).toBe(false);
      expect(validateIsraeliId('111111111')).toBe(false);
    });

    it('should return false for wrong length', () => {
      expect(validateIsraeliId('1234567')).toBe(false); // 7 digits
      expect(validateIsraeliId('1234567890')).toBe(false); // 10 digits
    });

    it('should return false for non-digits', () => {
      expect(validateIsraeliId('12345678a')).toBe(false);
    });

    it('should return true for empty string', () => {
      expect(validateIsraeliId('')).toBe(true);
    });
  });

  describe('validateMobileIL', () => {
    it('should return true for valid Israeli mobile', () => {
      expect(validateMobileIL('0501234567')).toBe(true);
      expect(validateMobileIL('0521234567')).toBe(true);
      expect(validateMobileIL('0541234567')).toBe(true);
    });

    it('should return false for invalid mobile format', () => {
      expect(validateMobileIL('0611234567')).toBe(false); // Invalid prefix
      expect(validateMobileIL('050123456')).toBe(false); // Too short
      expect(validateMobileIL('05012345678')).toBe(false); // Too long
    });

    it('should return true for empty string', () => {
      expect(validateMobileIL('')).toBe(true);
    });
  });

  describe('validateEmail', () => {
    it('should return true for valid email', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name@domain.co.il')).toBe(true);
      expect(validateEmail('user+tag@example.org')).toBe(true);
    });

    it('should return false for invalid email', () => {
      expect(validateEmail('notanemail')).toBe(false);
      expect(validateEmail('missing@domain')).toBe(false);
      expect(validateEmail('@nodomain.com')).toBe(false);
    });

    it('should return true for empty string', () => {
      expect(validateEmail('')).toBe(true);
    });
  });

  describe('validateDate', () => {
    it('should return true for valid dates', () => {
      expect(validateDate('2020-01-15')).toBe(true);
      expect(validateDate('2024-12-31')).toBe(true);
    });

    it('should return false for invalid dates', () => {
      expect(validateDate('not-a-date')).toBe(false);
      expect(validateDate('invalid')).toBe(false);
    });

    it('should return true for empty string', () => {
      expect(validateDate('')).toBe(true);
    });
  });

  describe('validateAge', () => {
    it('should return true for valid age in range', () => {
      // Use a date that would make someone 25 years old
      const twentyFiveYearsAgo = new Date();
      twentyFiveYearsAgo.setFullYear(twentyFiveYearsAgo.getFullYear() - 25);
      const dateStr = twentyFiveYearsAgo.toISOString().split('T')[0];
      expect(validateAge(dateStr, { min: 18, max: 120 })).toBe(true);
    });

    it('should return false for age below min', () => {
      // Use a date that would make someone 10 years old
      const tenYearsAgo = new Date();
      tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);
      const dateStr = tenYearsAgo.toISOString().split('T')[0];
      expect(validateAge(dateStr, { min: 18, max: 120 })).toBe(false);
    });

    it('should return false for invalid date', () => {
      expect(validateAge('abc', { min: 18, max: 120 })).toBe(false);
    });

    it('should return true for empty string', () => {
      expect(validateAge('', { min: 18, max: 120 })).toBe(true);
    });
  });

  describe('validateNotInFuture', () => {
    it('should return true for past date', () => {
      expect(validateNotInFuture('2020-01-01')).toBe(true);
      expect(validateNotInFuture('1990-12-31')).toBe(true);
    });

    it('should return true for today', () => {
      const today = new Date().toISOString().split('T')[0];
      expect(validateNotInFuture(today)).toBe(true);
    });

    it('should return false for future date', () => {
      expect(validateNotInFuture('2099-01-01')).toBe(false);
    });

    it('should return true for empty string', () => {
      expect(validateNotInFuture('')).toBe(true);
    });
  });

  describe('validateRange', () => {
    it('should return true for value in range', () => {
      expect(validateRange('50', { min: 0, max: 100 })).toBe(true);
      expect(validateRange('0', { min: 0, max: 100 })).toBe(true);
      expect(validateRange('100', { min: 0, max: 100 })).toBe(true);
    });

    it('should return false for value out of range', () => {
      expect(validateRange('-1', { min: 0, max: 100 })).toBe(false);
      expect(validateRange('101', { min: 0, max: 100 })).toBe(false);
    });

    it('should return true for empty string', () => {
      expect(validateRange('', { min: 0, max: 100 })).toBe(true);
    });
  });

  describe('runValidator', () => {
    it('should run built-in validators', () => {
      expect(runValidator('required', 'hello')).toBe(true);
      expect(runValidator('required', '')).toBe(false);
    });

    it('should run parametric validators with params', () => {
      expect(
        runValidator('length_between', 'hello', { min: 3, max: 10 }),
      ).toBe(true);
      expect(
        runValidator('length_between', 'hi', { min: 3, max: 10 }),
      ).toBe(false);
    });

    it('should run custom validators', () => {
      expect(runValidator('israeli_id_checksum', '000000018')).toBe(true);
      expect(runValidator('israeli_id_checksum', '123456789')).toBe(false);
    });

    it('should return true for unknown validator', () => {
      expect(runValidator('unknown_validator', 'test')).toBe(true);
    });
  });
});
