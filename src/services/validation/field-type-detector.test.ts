import { describe, it, expect } from 'vitest';
import {
  detectFieldType,
  getAvailableFieldTypes,
  getValidatorsForFieldType,
} from './field-type-detector';

describe('field-type-detector', () => {
  describe('detectFieldType', () => {
    it('should detect Israeli ID from Hebrew label', () => {
      const result = detectFieldType('תעודת זהות', 'text');

      expect(result.bestMatch).not.toBeNull();
      expect(result.bestMatch?.fieldTypeId).toBe('identity.israeli_id');
    });

    it('should detect Israeli ID from partial label', () => {
      const result = detectFieldType('מספר ת.ז', 'text');

      expect(result.bestMatch).not.toBeNull();
      expect(result.bestMatch?.fieldTypeId).toBe('identity.israeli_id');
    });

    it('should detect mobile phone', () => {
      const result = detectFieldType('טלפון נייד', 'text');

      expect(result.bestMatch).not.toBeNull();
      expect(result.bestMatch?.fieldTypeId).toBe('contact.mobile_il');
    });

    it('should detect email from pattern', () => {
      const result = detectFieldType('אימייל', 'text');

      expect(result.bestMatch).not.toBeNull();
      expect(result.bestMatch?.fieldTypeId).toBe('contact.email');
    });

    it('should detect date of birth', () => {
      const result = detectFieldType('תאריך לידה', 'text');

      expect(result.bestMatch).not.toBeNull();
      expect(result.bestMatch?.fieldTypeId).toBe('date.birthdate');
    });

    it('should detect first name', () => {
      const result = detectFieldType('שם פרטי', 'text');

      expect(result.bestMatch).not.toBeNull();
      expect(result.bestMatch?.fieldTypeId).toBe('identity.first_name');
    });

    it('should detect address', () => {
      const result = detectFieldType('כתובת', 'text');

      expect(result.bestMatch).not.toBeNull();
      expect(result.bestMatch?.fieldTypeId).toBe('contact.address');
    });

    it('should detect last name', () => {
      const result = detectFieldType('שם משפחה', 'text');

      expect(result.bestMatch).not.toBeNull();
      expect(result.bestMatch?.fieldTypeId).toBe('identity.last_name');
    });

    it('should return null for non-matching label', () => {
      const result = detectFieldType('unknown field xyz', 'text');

      expect(result.bestMatch).toBeNull();
    });

    it('should return all matches sorted by score', () => {
      const result = detectFieldType('תעודת זהות', 'text');

      expect(result.allMatches.length).toBeGreaterThanOrEqual(1);
      expect(result.allMatches[0].fieldTypeId).toBe('identity.israeli_id');

      // Check that matches are sorted by score (highest first)
      for (let i = 1; i < result.allMatches.length; i++) {
        expect(result.allMatches[i - 1].score).toBeGreaterThanOrEqual(
          result.allMatches[i].score
        );
      }
    });

    it('should use threshold score of 50', () => {
      const result = detectFieldType('ת.ז', 'text');

      // All matches should have score >= 50
      for (const match of result.allMatches) {
        expect(match.score).toBeGreaterThanOrEqual(50);
      }
    });

    it('should return validators for detected type', () => {
      const result = detectFieldType('תעודת זהות', 'text');

      expect(result.bestMatch?.validators).toBeDefined();
      expect(result.bestMatch?.validators.length).toBeGreaterThan(0);

      // Should include israeli_id_checksum validator
      const hasChecksumValidator = result.bestMatch?.validators.some(
        (v) => v.name === 'israeli_id_checksum'
      );
      expect(hasChecksumValidator).toBe(true);
    });
  });

  describe('getAvailableFieldTypes', () => {
    it('should return field types for text fields', () => {
      const types = getAvailableFieldTypes('text');

      expect(types.length).toBeGreaterThan(0);

      // Should include common text field types
      const ids = types.map((t) => t.id);
      expect(ids).toContain('identity.israeli_id');
      expect(ids).toContain('contact.email');
      expect(ids).toContain('contact.mobile_il');
    });

    it('should return field types for checkbox fields', () => {
      const types = getAvailableFieldTypes('checkbox');

      // Should include checkbox-compatible types
      expect(types.length).toBeGreaterThan(0);

      // Should include consent.mandatory_checkbox
      const ids = types.map((t) => t.id);
      expect(ids).toContain('consent.mandatory_checkbox');
    });

    it('should return display names in Hebrew', () => {
      const types = getAvailableFieldTypes('text');

      for (const type of types) {
        expect(type.displayName).toBeDefined();
        expect(type.displayName.length).toBeGreaterThan(0);
      }
    });
  });

  describe('getValidatorsForFieldType', () => {
    it('should return validators for Israeli ID', () => {
      const validators = getValidatorsForFieldType('identity.israeli_id');

      expect(validators.length).toBeGreaterThan(0);

      const names = validators.map((v) => v.name);
      expect(names).toContain('digits_only');
      expect(names).toContain('israeli_id_checksum');
    });

    it('should return validators for email', () => {
      const validators = getValidatorsForFieldType('contact.email');

      expect(validators.length).toBeGreaterThan(0);
      const names = validators.map((v) => v.name);
      // Email uses regex validator in the rules
      expect(names).toContain('regex');
    });

    it('should return validators for mobile phone', () => {
      const validators = getValidatorsForFieldType('contact.mobile_il');

      expect(validators.length).toBeGreaterThan(0);
      const names = validators.map((v) => v.name);
      // Mobile uses regex and digits_only validators
      expect(names).toContain('digits_only');
      expect(names).toContain('regex');
    });

    it('should return empty array for unknown field type', () => {
      const validators = getValidatorsForFieldType('unknown.type');

      expect(validators).toEqual([]);
    });

    it('should include parametric validators with params', () => {
      const validators = getValidatorsForFieldType('identity.israeli_id');

      // Should have length_between with min/max params
      const lengthValidator = validators.find((v) => v.name === 'length_between');
      expect(lengthValidator).toBeDefined();
      expect(lengthValidator?.params).toBeDefined();
      expect(lengthValidator?.params?.min).toBeDefined();
      expect(lengthValidator?.params?.max).toBeDefined();
    });
  });
});
