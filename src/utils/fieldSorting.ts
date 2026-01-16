import { FieldDefinition } from '@/types/fields';

/**
 * Sorts fields based on their physical position for better TAB order and logical flow.
 * Priority: Page -> Y (Top to Bottom) -> X (Right to Left for RTL, Left to Right for LTR)
 */
export function sortFieldsByPosition(
    fields: FieldDefinition[],
    direction: 'rtl' | 'ltr' = 'rtl',
): FieldDefinition[] {
    // Group fields by page
    const byPage = new Map<number, FieldDefinition[]>();
    for (const field of fields) {
        if (!byPage.has(field.pageNumber)) {
            byPage.set(field.pageNumber, []);
        }
        byPage.get(field.pageNumber)!.push(field);
    }

    const sorted: FieldDefinition[] = [];

    // Sort pages ascending
    const sortedPageNumbers = Array.from(byPage.keys()).sort((a, b) => a - b);

    for (const pageNum of sortedPageNumbers) {
        const pageFields = byPage.get(pageNum)!;

        // Sort page fields: Y descending (PDF origin is bottom, so higher Y is top)
        // Then X (Right-to-Left or Left-to-Right)
        pageFields.sort((a, b) => {
            // Y-axis: Higher Y is TOP in PDF coordinates. We want Top-to-Bottom.
            // So high Y comes FIRST.
            const yDiff = b.y - a.y;

            // If they are on the same line (within 10pt), sort by X
            if (Math.abs(yDiff) < 10) {
                return direction === 'rtl'
                    ? b.x - a.x  // RTL: Rightmost X comes first (higher X)
                    : a.x - b.x; // LTR: Leftmost X comes first (lower X)
            }

            return yDiff;
        });

        sorted.push(...pageFields);
    }

    return sorted;
}

/**
 * Re-indexes all fields based on their sorted position
 */
export function reindexFields(fields: FieldDefinition[], direction: 'rtl' | 'ltr' = 'rtl'): FieldDefinition[] {
    const sorted = sortFieldsByPosition(fields, direction);
    const reindexed = sorted.map((f, i) => ({ ...f, index: i + 1 }));

    // Sync with global counter in localStorage if available (mostly for client-side)
    if (typeof window !== 'undefined' && window.localStorage && reindexed.length > 0) {
        window.localStorage.setItem('rightflow_last_field_index', reindexed.length.toString());
    }

    return reindexed;
}

export interface PageDictionary {
    pageNumber: number;
    fields: Array<{ id: string; name: string; x: number; y: number; type: string }>;
}

/**
 * Creates page dictionaries for final export/storage
 */
export function createPageDictionaries(fields: FieldDefinition[]): PageDictionary[] {
    const byPage = new Map<number, FieldDefinition[]>();
    for (const field of fields) {
        if (!byPage.has(field.pageNumber)) {
            byPage.set(field.pageNumber, []);
        }
        byPage.get(field.pageNumber)!.push(field);
    }

    return Array.from(byPage.entries())
        .sort(([a], [b]) => a - b)
        .map(([pageNumber, pageFields]) => ({
            pageNumber,
            fields: pageFields.map(f => ({
                id: f.id,
                name: f.name,
                x: f.x,
                y: f.y,
                type: f.type,
            })),
        }));
}
