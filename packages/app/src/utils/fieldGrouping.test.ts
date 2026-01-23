import { describe, it, expect } from 'vitest';
import { detectRadioGroups } from './fieldGrouping';
import { FieldDefinition } from '@/types/fields';

describe('fieldGrouping', () => {
    describe('detectRadioGroups', () => {
        it('should group proximal and aligned checkboxes into ONE radio field', () => {
            const fields: FieldDefinition[] = [
                {
                    id: '1',
                    type: 'checkbox',
                    pageNumber: 1,
                    x: 100,
                    y: 500,
                    width: 10,
                    height: 10,
                    name: 'opt1',
                    required: false,
                    direction: 'rtl',
                },
                {
                    id: '2',
                    type: 'checkbox',
                    pageNumber: 1,
                    x: 120, // Aligned Y, proximal X (diff 20 < 30)
                    y: 500,
                    width: 10,
                    height: 10,
                    name: 'opt2',
                    required: false,
                    direction: 'rtl',
                },
                {
                    id: '3',
                    type: 'checkbox',
                    pageNumber: 1,
                    x: 140, // Aligned Y, proximal X
                    y: 500,
                    width: 10,
                    height: 10,
                    name: 'opt3',
                    required: false,
                    direction: 'rtl',
                },
            ];

            const result = detectRadioGroups(fields);

            expect(result.length).toBe(1);
            expect(result[0].type).toBe('radio');
            expect(result[0].options).toEqual(['opt3', 'opt2', 'opt1']);
            expect(result[0].orientation).toBe('horizontal');
        });

        it('should not group checkboxes that are far apart', () => {
            const fields: FieldDefinition[] = [
                {
                    id: '1',
                    type: 'checkbox',
                    pageNumber: 1,
                    x: 100,
                    y: 500,
                    width: 10,
                    height: 10,
                    name: 'opt1',
                    required: false,
                    direction: 'rtl',
                },
                {
                    id: '2',
                    type: 'checkbox',
                    pageNumber: 1,
                    x: 200, // Not proximal (> 30)
                    y: 500,
                    width: 10,
                    height: 10,
                    name: 'opt2',
                    required: false,
                    direction: 'rtl',
                },
            ];

            const result = detectRadioGroups(fields);

            expect(result.length).toBe(2);
            expect(result.every(f => f.type === 'checkbox')).toBe(true);
        });

        it('should not group checkboxes that are not aligned', () => {
            const fields: FieldDefinition[] = [
                {
                    id: '1',
                    type: 'checkbox',
                    pageNumber: 1,
                    x: 100,
                    y: 500,
                    width: 10,
                    height: 10,
                    name: 'opt1',
                    required: false,
                    direction: 'rtl',
                },
                {
                    id: '2',
                    type: 'checkbox',
                    pageNumber: 1,
                    x: 110,
                    y: 520, // Not aligned (> 5 variance)
                    width: 10,
                    height: 10,
                    name: 'opt2',
                    required: false,
                    direction: 'rtl',
                },
            ];

            const result = detectRadioGroups(fields);

            expect(result.length).toBe(2);
            expect(result.every(f => f.type === 'checkbox')).toBe(true);
        });

        it('should detect vertical orientation correctly', () => {
            const fields: FieldDefinition[] = [
                {
                    id: '1',
                    type: 'checkbox',
                    pageNumber: 1,
                    x: 100,
                    y: 500,
                    width: 10,
                    height: 10,
                    name: 'opt1',
                    required: false,
                    direction: 'rtl',
                },
                {
                    id: '2',
                    type: 'checkbox',
                    pageNumber: 1,
                    x: 100,
                    y: 480, // Aligned X, proximal Y
                    width: 10,
                    height: 10,
                    name: 'opt2',
                    required: false,
                    direction: 'rtl',
                },
            ];

            const result = detectRadioGroups(fields);

            expect(result.length).toBe(1);
            expect(result[0].type).toBe('radio');
            expect(result[0].orientation).toBe('vertical');
        });
    });
});
