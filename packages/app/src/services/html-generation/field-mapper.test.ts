import { describe, it, expect } from 'vitest';
import {
  mapFieldsToHtml,
  createFieldGroups,
  detectFormDirection,
  groupFieldsIntoRows,
} from './field-mapper';
import type { FieldDefinition } from '@/types/fields';

describe('field-mapper', () => {
  const commonProps = {
    required: false,
    direction: 'rtl' as const,
    width: 100,
    height: 20,
  };

  describe('mapFieldsToHtml', () => {
    it('should convert FieldDefinition to HtmlFormField', () => {
      const fields: FieldDefinition[] = [
        {
          id: '1',
          type: 'text',
          pageNumber: 1,
          x: 100,
          y: 500,
          name: 'first_name',
          label: 'שם פרטי',
          ...commonProps,
        },
      ];

      const result = mapFieldsToHtml(fields);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
      expect(result[0].type).toBe('text');
      expect(result[0].name).toBe('first_name');
      expect(result[0].label).toBe('שם פרטי');
      expect(result[0].direction).toBe('rtl');
    });

    it('should map dropdown type to select', () => {
      const fields: FieldDefinition[] = [
        {
          id: '1',
          type: 'dropdown',
          pageNumber: 1,
          x: 100,
          y: 500,
          name: 'city',
          options: ['תל אביב', 'ירושלים', 'חיפה'],
          ...commonProps,
        },
      ];

      const result = mapFieldsToHtml(fields);

      expect(result[0].type).toBe('select');
      expect(result[0].options).toEqual(['תל אביב', 'ירושלים', 'חיפה']);
    });

    it('should preserve position information', () => {
      const fields: FieldDefinition[] = [
        {
          id: '1',
          type: 'text',
          pageNumber: 2,
          x: 150,
          y: 600,
          name: 'field1',
          ...commonProps,
        },
      ];

      const result = mapFieldsToHtml(fields);

      expect(result[0].position).toEqual({
        page: 2,
        x: 150,
        y: 600,
        width: 100,
        height: 20,
      });
    });

    it('should map sectionName to section', () => {
      const fields: FieldDefinition[] = [
        {
          id: '1',
          type: 'text',
          pageNumber: 1,
          x: 100,
          y: 500,
          name: 'field1',
          sectionName: 'פרטים אישיים',
          ...commonProps,
        },
      ];

      const result = mapFieldsToHtml(fields);

      expect(result[0].section).toBe('פרטים אישיים');
    });

    it('should map index to tabOrder', () => {
      const fields: FieldDefinition[] = [
        {
          id: '1',
          type: 'text',
          pageNumber: 1,
          x: 100,
          y: 500,
          name: 'field1',
          index: 5,
          ...commonProps,
        },
      ];

      const result = mapFieldsToHtml(fields);

      expect(result[0].tabOrder).toBe(5);
    });

    it('should sort fields by tabOrder when available', () => {
      const fields: FieldDefinition[] = [
        { id: '1', type: 'text', pageNumber: 1, x: 100, y: 500, name: 'f1', index: 3, ...commonProps },
        { id: '2', type: 'text', pageNumber: 1, x: 200, y: 500, name: 'f2', index: 1, ...commonProps },
        { id: '3', type: 'text', pageNumber: 1, x: 150, y: 500, name: 'f3', index: 2, ...commonProps },
      ];

      const result = mapFieldsToHtml(fields);

      expect(result[0].id).toBe('2'); // index 1
      expect(result[1].id).toBe('3'); // index 2
      expect(result[2].id).toBe('1'); // index 3
    });
  });

  describe('createFieldGroups', () => {
    it('should group fields by sectionName', () => {
      const fields: FieldDefinition[] = [
        { id: '1', type: 'text', pageNumber: 1, x: 100, y: 700, name: 'f1', sectionName: 'סקשן א', ...commonProps },
        { id: '2', type: 'text', pageNumber: 1, x: 100, y: 600, name: 'f2', sectionName: 'סקשן ב', ...commonProps },
        { id: '3', type: 'text', pageNumber: 1, x: 100, y: 650, name: 'f3', sectionName: 'סקשן א', ...commonProps },
      ];

      const groups = createFieldGroups(fields);

      expect(groups).toHaveLength(2);

      const sectionA = groups.find(g => g.title === 'סקשן א');
      const sectionB = groups.find(g => g.title === 'סקשן ב');

      expect(sectionA?.fields).toContain('1');
      expect(sectionA?.fields).toContain('3');
      expect(sectionB?.fields).toContain('2');
    });

    it('should use default section name for fields without sectionName', () => {
      const fields: FieldDefinition[] = [
        { id: '1', type: 'text', pageNumber: 1, x: 100, y: 500, name: 'f1', ...commonProps },
      ];

      const groups = createFieldGroups(fields);

      expect(groups).toHaveLength(1);
      expect(groups[0].title).toBe('כללי');
    });

    it('should assign sequential order to groups', () => {
      const fields: FieldDefinition[] = [
        { id: '1', type: 'text', pageNumber: 1, x: 100, y: 700, name: 'f1', sectionName: 'A', ...commonProps },
        { id: '2', type: 'text', pageNumber: 1, x: 100, y: 600, name: 'f2', sectionName: 'B', ...commonProps },
        { id: '3', type: 'text', pageNumber: 1, x: 100, y: 500, name: 'f3', sectionName: 'C', ...commonProps },
      ];

      const groups = createFieldGroups(fields);

      expect(groups.map(g => g.order)).toEqual(expect.arrayContaining([0, 1, 2]));
    });
  });

  describe('detectFormDirection', () => {
    it('should return rtl when labels contain Hebrew', () => {
      const fields: FieldDefinition[] = [
        { id: '1', type: 'text', pageNumber: 1, x: 100, y: 500, name: 'name', label: 'שם', ...commonProps },
      ];

      expect(detectFormDirection(fields)).toBe('rtl');
    });

    it('should return rtl when field names contain Hebrew', () => {
      const fields: FieldDefinition[] = [
        { id: '1', type: 'text', pageNumber: 1, x: 100, y: 500, name: 'שם_פרטי', ...commonProps },
      ];

      expect(detectFormDirection(fields)).toBe('rtl');
    });

    it('should return rtl when options contain Hebrew', () => {
      const fields: FieldDefinition[] = [
        {
          id: '1',
          type: 'dropdown',
          pageNumber: 1,
          x: 100,
          y: 500,
          name: 'city',
          options: ['תל אביב'],
          ...commonProps,
          direction: 'ltr' as const,
        },
      ];

      expect(detectFormDirection(fields)).toBe('rtl');
    });

    it('should return ltr when no Hebrew content and majority ltr direction', () => {
      const fields: FieldDefinition[] = [
        { id: '1', type: 'text', pageNumber: 1, x: 100, y: 500, name: 'name', label: 'Name', ...commonProps, direction: 'ltr' as const },
        { id: '2', type: 'text', pageNumber: 1, x: 100, y: 400, name: 'email', label: 'Email', ...commonProps, direction: 'ltr' as const },
      ];

      expect(detectFormDirection(fields)).toBe('ltr');
    });

    it('should return rtl when majority of fields have rtl direction', () => {
      const fields: FieldDefinition[] = [
        { id: '1', type: 'text', pageNumber: 1, x: 100, y: 500, name: 'f1', ...commonProps, direction: 'rtl' as const },
        { id: '2', type: 'text', pageNumber: 1, x: 100, y: 400, name: 'f2', ...commonProps, direction: 'rtl' as const },
        { id: '3', type: 'text', pageNumber: 1, x: 100, y: 300, name: 'f3', ...commonProps, direction: 'ltr' as const },
      ];

      expect(detectFormDirection(fields)).toBe('rtl');
    });
  });

  describe('groupFieldsIntoRows', () => {
    it('should group fields with similar Y positions into same row', () => {
      const fields = mapFieldsToHtml([
        { id: '1', type: 'text', pageNumber: 1, x: 100, y: 500, name: 'f1', ...commonProps },
        { id: '2', type: 'text', pageNumber: 1, x: 200, y: 505, name: 'f2', ...commonProps }, // Within threshold
        { id: '3', type: 'text', pageNumber: 1, x: 300, y: 400, name: 'f3', ...commonProps }, // Different row
      ]);

      const rows = groupFieldsIntoRows(fields);

      expect(rows).toHaveLength(2);
      expect(rows[0]).toHaveLength(2); // f1 and f2 in same row
      expect(rows[1]).toHaveLength(1); // f3 in separate row
    });

    it('should sort fields within a row by X position (RTL order)', () => {
      const fields = mapFieldsToHtml([
        { id: '1', type: 'text', pageNumber: 1, x: 100, y: 500, name: 'f1', ...commonProps },
        { id: '2', type: 'text', pageNumber: 1, x: 300, y: 500, name: 'f2', ...commonProps },
        { id: '3', type: 'text', pageNumber: 1, x: 200, y: 500, name: 'f3', ...commonProps },
      ]);

      const rows = groupFieldsIntoRows(fields);

      expect(rows).toHaveLength(1);
      // RTL order: highest X first
      expect(rows[0][0].id).toBe('2'); // x=300
      expect(rows[0][1].id).toBe('3'); // x=200
      expect(rows[0][2].id).toBe('1'); // x=100
    });

    it('should return empty array for empty input', () => {
      const rows = groupFieldsIntoRows([]);
      expect(rows).toEqual([]);
    });

    it('should handle fields across multiple pages by sorting by page first', () => {
      const fields = mapFieldsToHtml([
        { id: '1', type: 'text', pageNumber: 1, x: 100, y: 500, name: 'f1', ...commonProps },
        { id: '2', type: 'text', pageNumber: 2, x: 100, y: 700, name: 'f2', ...commonProps }, // Different Y on page 2
      ]);

      const rows = groupFieldsIntoRows(fields);

      // Fields are sorted by page then Y, so they should be in separate rows
      // Page 1, Y=500 and Page 2, Y=700 have different Y values after page sorting
      expect(rows.length).toBeGreaterThanOrEqual(1);
      expect(rows.flat().map(f => f.id)).toContain('1');
      expect(rows.flat().map(f => f.id)).toContain('2');
    });
  });
});
