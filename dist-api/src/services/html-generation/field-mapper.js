/**
 * Field Mapper
 * Converts RightFlow FieldDefinition[] to HTML-friendly format
 */
/**
 * Maps FieldDefinition.type to HtmlFieldType
 */
function mapFieldType(type) {
    switch (type) {
        case 'dropdown':
            return 'select';
        case 'text':
        case 'checkbox':
        case 'radio':
        case 'signature':
        case 'static-text':
            return type;
        default:
            return 'text';
    }
}
/**
 * Converts a single FieldDefinition to HtmlFormField
 */
function mapFieldToHtml(field) {
    const htmlField = {
        id: field.id,
        name: field.name,
        type: mapFieldType(field.type),
        label: field.label,
        required: field.required,
        placeholder: field.label || field.name,
        value: field.defaultValue,
        options: field.options,
        position: {
            page: field.pageNumber,
            x: field.x,
            y: field.y,
            width: field.width,
            height: field.height,
        },
        section: field.sectionName,
        tabOrder: field.index,
        direction: field.direction,
        station: field.station || 'client', // Default to client if not specified
    };
    // Add validation properties if enabled
    if (field.validationType && field.validation?.enabled) {
        htmlField.validationType = field.validationType;
        htmlField.validators = field.validation.validators;
    }
    // Add static text properties if this is a static-text field
    if (field.type === 'static-text') {
        htmlField.content = field.content;
        htmlField.textAlign = field.textAlign;
        htmlField.backgroundColor = field.backgroundColor;
        htmlField.textColor = field.textColor;
        htmlField.fontWeight = field.fontWeight;
        htmlField.fontStyle = field.fontStyle;
        htmlField.fontSize = field.fontSize;
        htmlField.borderColor = field.borderColor;
        htmlField.borderWidth = field.borderWidth;
    }
    return htmlField;
}
/**
 * Converts FieldDefinition[] to HtmlFormField[]
 * Sorts by physical position (RTL: right to left, top to bottom)
 * Uses dynamic gap detection to handle varying row spacing
 */
export function mapFieldsToHtml(fields) {
    const htmlFields = fields.map(mapFieldToHtml);
    if (htmlFields.length === 0)
        return [];
    // Group by page
    const pageGroups = new Map();
    for (const field of htmlFields) {
        const page = field.position?.page ?? 1;
        if (!pageGroups.has(page)) {
            pageGroups.set(page, []);
        }
        pageGroups.get(page).push(field);
    }
    const result = [];
    // Process each page
    for (const [, pageFields] of Array.from(pageGroups.entries()).sort((a, b) => a[0] - b[0])) {
        // Sort by Y (descending - top to bottom)
        const sortedByY = [...pageFields].sort((a, b) => {
            const aY = a.position?.y ?? 0;
            const bY = b.position?.y ?? 0;
            return bY - aY;
        });
        // Calculate gaps between consecutive fields
        const gaps = [];
        for (let i = 0; i < sortedByY.length - 1; i++) {
            const y1 = sortedByY[i].position?.y ?? 0;
            const y2 = sortedByY[i + 1].position?.y ?? 0;
            gaps.push(y1 - y2);
        }
        if (gaps.length === 0) {
            result.push(...sortedByY);
            continue;
        }
        // Find gap threshold using median
        const sortedGaps = [...gaps].sort((a, b) => a - b);
        const median = sortedGaps[Math.floor(sortedGaps.length / 2)];
        const gapThreshold = Math.max(median * 2, 20);
        // Group into rows based on gaps
        const rows = [];
        let currentRow = [sortedByY[0]];
        for (let i = 0; i < gaps.length; i++) {
            if (gaps[i] > gapThreshold) {
                rows.push(currentRow);
                currentRow = [sortedByY[i + 1]];
            }
            else {
                currentRow.push(sortedByY[i + 1]);
            }
        }
        rows.push(currentRow);
        // Sort within each row by X (right to left)
        for (const row of rows) {
            row.sort((a, b) => {
                const aX = a.position?.x ?? 0;
                const bX = b.position?.x ?? 0;
                return bX - aX;
            });
            result.push(...row);
        }
    }
    return result;
}
/**
 * Creates field groups from sections
 * Groups fields by sectionName and orders them
 */
export function createFieldGroups(fields) {
    const sectionMap = new Map();
    // Group fields by section
    for (const field of fields) {
        const section = field.sectionName || 'כללי'; // Default section name in Hebrew
        if (!sectionMap.has(section)) {
            sectionMap.set(section, []);
        }
        sectionMap.get(section).push(field);
    }
    // Convert to HtmlFieldGroup array
    const groups = [];
    let order = 0;
    for (const [sectionName, sectionFields] of sectionMap) {
        groups.push({
            id: `group_${order}`,
            title: sectionName,
            fields: sectionFields.map((f) => f.id),
            order: order++,
        });
    }
    // Sort groups by the position of their first field
    return groups.sort((a, b) => {
        const aFields = fields.filter((f) => a.fields.includes(f.id));
        const bFields = fields.filter((f) => b.fields.includes(f.id));
        if (aFields.length === 0 || bFields.length === 0)
            return 0;
        const aFirst = aFields[0];
        const bFirst = bFields[0];
        // Sort by page first
        if (aFirst.pageNumber !== bFirst.pageNumber) {
            return aFirst.pageNumber - bFirst.pageNumber;
        }
        // Then by Y position (in PDF: Y=0 is bottom, higher Y = higher on page)
        return bFirst.y - aFirst.y;
    });
}
/**
 * Detects if form should be RTL based on field content
 * Checks labels and names for Hebrew characters
 */
export function detectFormDirection(fields) {
    const hebrewRegex = /[\u0590-\u05FF]/;
    for (const field of fields) {
        if (field.label && hebrewRegex.test(field.label)) {
            return 'rtl';
        }
        if (field.name && hebrewRegex.test(field.name)) {
            return 'rtl';
        }
        if (field.options) {
            for (const option of field.options) {
                if (hebrewRegex.test(option)) {
                    return 'rtl';
                }
            }
        }
    }
    // Also check direction property
    const rtlCount = fields.filter((f) => f.direction === 'rtl').length;
    const ltrCount = fields.filter((f) => f.direction === 'ltr').length;
    return rtlCount >= ltrCount ? 'rtl' : 'ltr';
}
/**
 * Groups fields into rows based on Y position
 * Uses dynamic gap detection to handle varying row spacing
 */
export function groupFieldsIntoRows(fields, _threshold = 15) {
    if (fields.length === 0)
        return [];
    // Sort by Y (descending - top to bottom)
    const sorted = [...fields].sort((a, b) => {
        if (!a.position || !b.position)
            return 0;
        // Sort by page first
        if (a.position.page !== b.position.page) {
            return a.position.page - b.position.page;
        }
        return b.position.y - a.position.y;
    });
    // Calculate gaps between consecutive fields
    const gaps = [];
    for (let i = 0; i < sorted.length - 1; i++) {
        const y1 = sorted[i].position?.y ?? 0;
        const y2 = sorted[i + 1].position?.y ?? 0;
        gaps.push(y1 - y2);
    }
    if (gaps.length === 0) {
        // Only one field
        const singleRow = [...sorted];
        singleRow.sort((a, b) => {
            const aX = a.position?.x ?? 0;
            const bX = b.position?.x ?? 0;
            return bX - aX;
        });
        return [singleRow];
    }
    // Find gap threshold using median
    const sortedGaps = [...gaps].sort((a, b) => a - b);
    const median = sortedGaps[Math.floor(sortedGaps.length / 2)];
    const gapThreshold = Math.max(median * 2, 20);
    // Group into rows based on gaps
    const rows = [];
    let currentRow = [sorted[0]];
    for (let i = 0; i < gaps.length; i++) {
        if (gaps[i] > gapThreshold) {
            // Large gap = new row
            rows.push(currentRow);
            currentRow = [sorted[i + 1]];
        }
        else {
            // Small gap = same row
            currentRow.push(sorted[i + 1]);
        }
    }
    rows.push(currentRow); // Add last row
    // Sort fields within each row by X (right to left)
    for (const row of rows) {
        row.sort((a, b) => {
            if (!a.position || !b.position)
                return 0;
            return b.position.x - a.position.x;
        });
    }
    return rows;
}
//# sourceMappingURL=field-mapper.js.map