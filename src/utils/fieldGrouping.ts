import { FieldDefinition } from '@/types/fields';

const PROXIMITY_THRESHOLD = 50; // points (~17mm) - increased for better grouping
const ALIGNMENT_THRESHOLD = 8;  // points variance allowed

/**
 * Main post-processing function for radio groups
 * 1. Merges AI-returned radio buttons with the same radioGroup
 * 2. Converts grouped checkboxes to radio buttons
 */
export function detectRadioGroups(fields: FieldDefinition[]): FieldDefinition[] {
    // Step 1: Merge radio buttons that have the same radioGroup name
    const mergedRadios = mergeRadiosByGroup(fields);

    // Step 2: Convert grouped checkboxes to radio buttons
    const checkboxes = mergedRadios.filter(f => f.type === 'checkbox');
    const others = mergedRadios.filter(f => f.type !== 'checkbox');

    // Group checkboxes by proximity and alignment
    const groups = groupFields(checkboxes);

    const result: FieldDefinition[] = [...others];

    for (const group of groups) {
        if (group.length >= 2 && group.length <= 6) {
            // Conversion to Radio - Merge into ONE field
            // Only convert if 2-6 options (more than 6 is likely not a radio group)

            // Log checkbox group for debugging
            console.log(`[CheckboxToRadio] Converting ${group.length} checkboxes to radio:`);
            group.forEach((f, i) => {
                console.log(`  Checkbox ${i + 1}: name="${f.name}", label="${f.label}"`);
            });

            // Sort buttons by physical position (Top to Bottom, Right to Left)
            group.sort((a, b) => {
                const yDiff = b.y - a.y; // High Y is top
                if (Math.abs(yDiff) > ALIGNMENT_THRESHOLD) {
                    return yDiff;
                }
                return b.x - a.x; // High X is Right (RTL)
            });

            const orientation = detectOrientation(group);
            const first = group[0];

            // Extract meaningful labels, filtering out generic names
            const options = group.map(f => {
                const label = f.label || '';
                // Don't use generic field names as options
                if (label && !label.startsWith('field_') && !label.startsWith('checkbox_')) {
                    return label;
                }
                return f.name || 'אפשרות';
            });

            console.log(`  => Created radio with options: ${JSON.stringify(options)}`);

            const radioField: FieldDefinition = {
                ...first,
                type: 'radio',
                label: extractGroupLabel(group) || options.join(' / '),
                options,
                radioGroup: `radio_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                orientation,
                spacing: 1,
            };

            result.push(radioField);
        } else {
            result.push(...group); // Stays as isolated checkbox(es)
        }
    }

    return result;
}

/**
 * Merges radio buttons that have the same radioGroup name into single fields
 */
function mergeRadiosByGroup(fields: FieldDefinition[]): FieldDefinition[] {
    const radioButtons = fields.filter(f => f.type === 'radio');
    const nonRadios = fields.filter(f => f.type !== 'radio');

    // Group radios by their radioGroup property
    const radioGroups = new Map<string, FieldDefinition[]>();
    const standAloneRadios: FieldDefinition[] = [];

    for (const radio of radioButtons) {
        const groupName = radio.radioGroup;
        if (groupName) {
            if (!radioGroups.has(groupName)) {
                radioGroups.set(groupName, []);
            }
            radioGroups.get(groupName)!.push(radio);
        } else {
            // Radio without group name - check if it already has multiple options
            if (radio.options && radio.options.length > 1) {
                standAloneRadios.push(radio);
            } else {
                // Single option radio - keep as is for now
                standAloneRadios.push(radio);
            }
        }
    }

    // Merge grouped radios
    const mergedRadios: FieldDefinition[] = [];
    for (const [groupName, radios] of radioGroups) {
        if (radios.length === 1) {
            // Only one radio with this group name - keep as is
            mergedRadios.push(radios[0]);
        } else {
            // Multiple radios with same group name - merge them
            // Sort by position (RTL: right to left, top to bottom)
            radios.sort((a, b) => {
                const yDiff = b.y - a.y;
                if (Math.abs(yDiff) > ALIGNMENT_THRESHOLD) {
                    return yDiff;
                }
                return b.x - a.x;
            });

            const first = radios[0];
            const allOptions: string[] = [];

            // Collect all options from all radios in the group
            for (const radio of radios) {
                if (radio.options && radio.options.length > 0) {
                    allOptions.push(...radio.options);
                } else if (radio.label) {
                    allOptions.push(radio.label);
                }
            }

            // Remove duplicates while preserving order
            const uniqueOptions = [...new Set(allOptions)];

            const mergedRadio: FieldDefinition = {
                ...first,
                type: 'radio',
                label: first.label || uniqueOptions.join(' / '),
                options: uniqueOptions.length > 0 ? uniqueOptions : ['אפשרות 1', 'אפשרות 2'],
                radioGroup: groupName,
                orientation: detectOrientation(radios),
            };

            mergedRadios.push(mergedRadio);
            console.log(`[RadioMerge] Merged ${radios.length} radios into group "${groupName}" with options:`, uniqueOptions);
        }
    }

    return [...nonRadios, ...mergedRadios, ...standAloneRadios];
}

/**
 * Tries to extract a common label for a group of fields
 */
function extractGroupLabel(fields: FieldDefinition[]): string | null {
    // Look for a common sectionName or shared label prefix
    const labels = fields.map(f => f.label).filter(Boolean);
    if (labels.length === 0) return null;

    // Check if all labels share a common prefix (longer than 2 chars)
    const firstLabel = labels[0] || '';
    for (let len = firstLabel.length; len >= 2; len--) {
        const prefix = firstLabel.substring(0, len);
        if (labels.every(l => l && l.startsWith(prefix))) {
            return prefix.trim();
        }
    }

    return null;
}

/**
 * Groups fields based on proximity and axial alignment
 */
function groupFields(fields: FieldDefinition[]): FieldDefinition[][] {
    const groups: FieldDefinition[][] = [];
    const used = new Set<string>();

    for (const field of fields) {
        if (used.has(field.id)) continue;

        const group = [field];
        used.add(field.id);

        // Find all connected neighbors (BFS-like)
        let i = 0;
        while (i < group.length) {
            const current = group[i];
            for (const other of fields) {
                if (!used.has(other.id) && isNeighbor(current, other)) {
                    group.push(other);
                    used.add(other.id);
                }
            }
            i++;
        }

        groups.push(group);
    }

    return groups;
}

/**
 * Determines if two fields are neighbors based on distance and alignment
 */
function isNeighbor(f1: FieldDefinition, f2: FieldDefinition): boolean {
    // Check absolute distance
    const dist = Math.hypot(f1.x - f2.x, f1.y - f2.y);
    if (dist > PROXIMITY_THRESHOLD) return false;

    // Check Axial Alignment
    // They should either be on the same horizontal line or same vertical line
    const verticalAlign = Math.abs(f1.x - f2.x) < ALIGNMENT_THRESHOLD;   // Aligned vertically (stack)
    const horizontalAlign = Math.abs(f1.y - f2.y) < ALIGNMENT_THRESHOLD; // Aligned horizontally (row)

    return verticalAlign || horizontalAlign;
}

/**
 * Detects the dominant orientation of a group of fields
 */
function detectOrientation(fields: FieldDefinition[]): 'horizontal' | 'vertical' {
    if (fields.length < 2) return 'vertical';

    const xVariance = Math.max(...fields.map(f => f.x)) - Math.min(...fields.map(f => f.x));
    const yVariance = Math.max(...fields.map(f => f.y)) - Math.min(...fields.map(f => f.y));

    return xVariance > yVariance ? 'horizontal' : 'vertical';
}
