/**
 * Field Type Detector
 * Detects field validation type based on label pattern matching
 */
import { FIELD_TYPE_DISPLAY_NAMES, } from './validation-rules.types';
import { validationRules } from './validation-rules';
/**
 * Minimum score threshold for a match to be considered valid
 */
const SCORE_THRESHOLD = 50;
/**
 * Map field type to compatible HTML input types
 */
function getHtmlTypesForFieldType(fieldType) {
    switch (fieldType) {
        case 'text':
            return ['text', 'email', 'tel', 'date', 'number', 'url', 'password'];
        case 'checkbox':
            return ['checkbox'];
        case 'radio':
            return ['radio'];
        case 'dropdown':
            return ['select'];
        case 'signature':
            return ['signature'];
        default:
            return ['text'];
    }
}
/**
 * Normalize validators to ValidatorConfig format
 */
function normalizeValidators(validators) {
    return validators.map((v) => {
        if (typeof v === 'string') {
            return { name: v };
        }
        return v;
    });
}
/**
 * Calculate match score between a label and a pattern
 */
function calculateMatchScore(label, pattern) {
    const normalizedLabel = label.trim().toLowerCase();
    const normalizedPattern = pattern.trim().toLowerCase();
    // Exact match
    if (normalizedLabel === normalizedPattern) {
        return 100;
    }
    // Label starts with pattern
    if (normalizedLabel.startsWith(normalizedPattern)) {
        return 90 + Math.min(10, normalizedPattern.length);
    }
    // Label ends with pattern
    if (normalizedLabel.endsWith(normalizedPattern)) {
        return 85 + Math.min(10, normalizedPattern.length);
    }
    // Pattern is contained in label
    if (normalizedLabel.includes(normalizedPattern)) {
        // Bonus for longer patterns (more specific)
        const lengthBonus = Math.min(15, normalizedPattern.length * 2);
        return 70 + lengthBonus;
    }
    // Label is contained in pattern (partial match)
    if (normalizedPattern.includes(normalizedLabel)) {
        return 50;
    }
    return 0;
}
/**
 * Check if a field type is compatible with the given HTML input type
 */
function isHtmlTypeCompatible(fieldType, allowedHtmlTypes) {
    const fieldHtmlTypes = getHtmlTypesForFieldType(fieldType);
    return fieldHtmlTypes.some((type) => allowedHtmlTypes.includes(type));
}
/**
 * Detect field type based on label and field type
 * @param label - The field label text
 * @param fieldType - The field type (text, checkbox, etc.)
 * @param sectionName - Optional section name for additional context
 * @returns Detection result with best match and all matches
 */
export function detectFieldType(label, fieldType, sectionName) {
    if (!label || label.trim() === '') {
        return { bestMatch: null, allMatches: [] };
    }
    // Combine label with section name for context
    const context = sectionName
        ? `${label} ${sectionName}`.toLowerCase()
        : label.toLowerCase();
    const matches = [];
    // Check each field type definition
    for (const [fieldTypeId, definition] of Object.entries(validationRules.fieldTypes)) {
        // Check HTML type compatibility
        if (!isHtmlTypeCompatible(fieldType, definition.htmlTypes)) {
            continue;
        }
        // Find best matching pattern
        let bestPatternScore = 0;
        let bestPattern = '';
        for (const pattern of definition.labelPatterns) {
            const score = calculateMatchScore(context, pattern);
            if (score > bestPatternScore) {
                bestPatternScore = score;
                bestPattern = pattern;
            }
        }
        // Only include if above threshold
        if (bestPatternScore >= SCORE_THRESHOLD) {
            matches.push({
                fieldTypeId,
                displayName: FIELD_TYPE_DISPLAY_NAMES[fieldTypeId] || fieldTypeId,
                score: bestPatternScore,
                matchedPattern: bestPattern,
                validators: normalizeValidators(definition.validators),
            });
        }
    }
    // Sort by score (highest first)
    matches.sort((a, b) => b.score - a.score);
    return {
        bestMatch: matches.length > 0 ? matches[0] : null,
        allMatches: matches,
    };
}
/**
 * Get all available field types for a given field type
 * Useful for populating a dropdown in the UI
 */
export function getAvailableFieldTypes(fieldType) {
    const result = [];
    for (const [fieldTypeId, definition] of Object.entries(validationRules.fieldTypes)) {
        if (isHtmlTypeCompatible(fieldType, definition.htmlTypes)) {
            result.push({
                id: fieldTypeId,
                displayName: FIELD_TYPE_DISPLAY_NAMES[fieldTypeId] || fieldTypeId,
            });
        }
    }
    return result;
}
/**
 * Get validators for a field type ID
 */
export function getValidatorsForFieldType(fieldTypeId) {
    const definition = validationRules.fieldTypes[fieldTypeId];
    if (!definition) {
        return [];
    }
    return normalizeValidators(definition.validators);
}
//# sourceMappingURL=field-type-detector.js.map