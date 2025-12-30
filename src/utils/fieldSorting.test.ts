import { describe, it, expect, beforeEach } from 'vitest';
import { sortFieldsByPosition, reindexFields } from './fieldSorting';
import { FieldDefinition } from '@/types/fields';

describe('fieldSorting', () => {
    const common = { required: false, direction: 'rtl' as const };
    const mockFields: FieldDefinition[] = [
        { id: '1', type: 'text', pageNumber: 2, x: 100, y: 500, width: 50, height: 20, name: 'f1', ...common },
        { id: '2', type: 'text', pageNumber: 1, x: 200, y: 700, width: 50, height: 20, name: 'f2', ...common }, // Top of page 1
        { id: '3', type: 'text', pageNumber: 1, x: 100, y: 700, width: 50, height: 20, name: 'f3', ...common }, // Right of p1, same Y (RTL means higher X comes first)
        { id: '4', type: 'text', pageNumber: 1, x: 150, y: 650, width: 50, height: 20, name: 'f4', ...common }, // Below on p1
    ];

    beforeEach(() => {
        // Reset localStorage mock before each test
        let store: Record<string, string> = {};
        const storageMock = {
            getItem: (key: string) => store[key] || null,
            setItem: (key: string, value: string) => { store[key] = value.toString(); },
            clear: () => { store = {}; }
        };
        Object.defineProperty(window, 'localStorage', { value: storageMock, writable: true });
    });

    describe('sortFieldsByPosition', () => {
        it('should sort fields by page, then Y (top-down), then X (right-to-left)', () => {
            const sorted = sortFieldsByPosition(mockFields);

            expect(sorted[0].id).toBe('2'); // Page 1, Y=700, X=200
            expect(sorted[1].id).toBe('3'); // Page 1, Y=700, X=100
            expect(sorted[2].id).toBe('4'); // Page 1, Y=650
            expect(sorted[3].id).toBe('1'); // Page 2
        });
    });

    describe('reindexFields', () => {
        it('should assign sequential indices to sorted fields', () => {
            const sorted = sortFieldsByPosition(mockFields);
            const reindexed = reindexFields(sorted);

            expect(reindexed[0].index).toBe(1);
            expect(reindexed[1].index).toBe(2);
            expect(reindexed[2].index).toBe(3);
            expect(reindexed[3].index).toBe(4);
        });

        it('should handle lastIndex from localStorage', () => {
            const sorted = sortFieldsByPosition(mockFields);
            reindexFields(sorted);

            expect(window.localStorage.getItem('rightflow_last_field_index')).toBe('4');
        });
    });
});
