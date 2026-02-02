/**
 * AI Prompt Engineering for Form Field Extraction
 * Optimized prompts for Gemini 1.5 Pro Vision
 *
 * These prompts are specifically designed for:
 * - Hebrew/RTL text detection
 * - Accurate field coordinate extraction
 * - Field type identification
 * - Multi-language support
 */

/**
 * System prompt for field extraction
 */
export const SYSTEM_PROMPT = `You are an expert PDF form analyzer specializing in:
- Hebrew (RTL) and English (LTR) text detection
- Form field identification and classification
- Accurate coordinate extraction
- Multi-language document processing

Your analysis must be precise, especially for:
- Right-to-left (RTL) text fields
- Mixed-direction content
- Field boundaries and positions`;

/**
 * Main extraction prompt template
 */
export const EXTRACTION_PROMPT = `Analyze this PDF page and extract ALL form fields with precise details.

CRITICAL REQUIREMENTS:
1. Detect ALL fillable areas (boxes, lines, checkboxes, radio buttons)
2. Identify text direction (RTL for Hebrew/Arabic, LTR for English)
3. Extract exact coordinates in PDF points (72 DPI)
4. Group related radio buttons
5. Detect field labels even if separated from input areas

For each field, provide:
{
  "type": "text|checkbox|radio|dropdown|signature|date",
  "name": "unique_field_identifier",
  "label": "visible label text (in original language)",
  "direction": "rtl|ltr",
  "required": boolean,
  "x": number (left position in points),
  "y": number (top position in points),
  "width": number (field width in points),
  "height": number (field height in points),
  "pageNumber": number,
  "options": ["option1", "option2"] (for radio/dropdown),
  "radioGroup": "group_name" (for radio buttons),
  "sectionName": "section header if applicable"
}

SPECIAL INSTRUCTIONS FOR HEBREW:
- Hebrew text runs right-to-left (RTL)
- Mark ALL Hebrew fields with "direction": "rtl"
- Common Hebrew field labels:
  - שם (Name)
  - תאריך (Date)
  - חתימה (Signature)
  - כתובת (Address)
  - טלפון (Phone)
  - דוא"ל/מייל (Email)
  - ת.ז. (ID Number)
  - מס׳ (Number)

COORDINATE SYSTEM:
- Origin (0,0) is bottom-left of page
- X increases left-to-right
- Y increases bottom-to-top
- Standard A4: 595x842 points
- Letter: 612x792 points

OUTPUT FORMAT:
Return a JSON object with:
{
  "fields": [...array of field objects...],
  "pageInfo": {
    "width": page width in points,
    "height": page height in points,
    "hasRTL": boolean,
    "primaryLanguage": "he|en|ar|other"
  },
  "formMetadata": {
    "title": "form title if detected",
    "type": "government|medical|insurance|legal|other",
    "isRTL": boolean
  }
}`;

/**
 * Prompt for complex field detection
 */
export const COMPLEX_FIELD_PROMPT = `Focus on detecting complex field types:

CHECKBOXES:
- Small squares (typically 10-20pt)
- May have checkmarks or X marks
- Often grouped together
- Associated labels usually to the right (LTR) or left (RTL)

RADIO BUTTONS:
- Small circles (typically 10-20pt)
- Grouped with same name, different values
- Only one can be selected per group
- Labels indicate the option value

SIGNATURE FIELDS:
- Larger rectangular areas
- Often have "signature" or "חתימה" label
- May have a line or box
- Typically 150-300pt wide

DATE FIELDS:
- May be single box or split (DD/MM/YYYY)
- Look for calendar icons
- Labels like "Date", "תאריך"
- Consider format indicators

DROPDOWN/SELECT:
- Rectangular with arrow indicator
- May show default value
- Fixed set of options`;

/**
 * Prompt for RTL-specific analysis
 */
export const RTL_ANALYSIS_PROMPT = `Perform specialized RTL analysis:

1. DIRECTION DETECTION:
   - Check first strong character (Hebrew/Arabic = RTL)
   - Mixed text: determine primary direction
   - Numbers stay LTR even in RTL context

2. FIELD ALIGNMENT:
   - RTL forms typically align labels to the right
   - Input fields may be on the left of labels
   - Check overall page layout direction

3. COMMON RTL PATTERNS:
   - Hebrew forms often have ":שם" (name:) format
   - Right-aligned headers and titles
   - Mirrored layout compared to LTR forms

4. COORDINATE ADJUSTMENTS:
   - X coordinate still measures from left
   - But visual flow is right-to-left
   - Consider when grouping related fields`;

/**
 * Prompt for validation and correction
 */
export const VALIDATION_PROMPT = `Validate extracted fields:

1. COORDINATE VALIDATION:
   - Ensure X + Width <= page width
   - Ensure Y + Height <= page height
   - Check for overlapping fields
   - Verify reasonable sizes (text: 20-40pt height)

2. LABEL ASSOCIATION:
   - Match labels to nearest fields
   - Consider RTL reading order
   - Check vertical alignment

3. GROUP VALIDATION:
   - Radio buttons in same group aligned
   - Checkboxes in logical groups
   - Related fields proximally located

4. RTL VALIDATION:
   - Hebrew/Arabic text marked as RTL
   - Consistent direction within sections
   - Proper label-field relationships

Return corrected field data with confidence scores.`;

/**
 * Generate extraction prompt based on PDF characteristics
 */
export function generateExtractionPrompt(
  pageCount: number,
  currentPage: number,
  hasHebrewContent: boolean = false,
  documentType?: string
): string {
  let prompt = EXTRACTION_PROMPT;

  // Add page context
  if (pageCount > 1) {
    prompt += `\n\nPAGE CONTEXT: This is page ${currentPage} of ${pageCount}.`;
  }

  // Add Hebrew-specific instructions
  if (hasHebrewContent) {
    prompt += `\n\nHEBREW DOCUMENT DETECTED:
- Pay special attention to RTL field detection
- Common form types: טופס (form), בקשה (request), הצהרה (declaration)
- Government forms often have both Hebrew and English`;
  }

  // Add document type specific hints
  if (documentType) {
    const typeHints: Record<string, string> = {
      'government': 'Look for: ID fields, dates, signatures, official stamps',
      'medical': 'Look for: patient info, diagnosis codes, doctor signatures',
      'insurance': 'Look for: policy numbers, coverage options, claim details',
      'legal': 'Look for: parties involved, case numbers, notary sections',
    };

    const hint = typeHints[documentType];
    if (hint) {
      prompt += `\n\nDOCUMENT TYPE (${documentType}): ${hint}`;
    }
  }

  return prompt;
}

/**
 * Generate validation prompt for extracted fields
 */
export function generateValidationPrompt(
  fields: any[],
  pageWidth: number,
  pageHeight: number
): string {
  return `${VALIDATION_PROMPT}

PAGE DIMENSIONS: ${pageWidth}x${pageHeight} points

EXTRACTED FIELDS TO VALIDATE:
${JSON.stringify(fields, null, 2)}

Please validate and correct any issues, returning the corrected field array.`;
}

/**
 * Prompt for field grouping and relationships
 */
export const FIELD_RELATIONSHIP_PROMPT = `Analyze field relationships:

1. FORM SECTIONS:
   - Group fields under section headers
   - Identify logical groupings (personal info, contact, etc.)
   - Preserve visual hierarchy

2. CONDITIONAL FIELDS:
   - Fields that appear based on checkbox/radio selection
   - Dependent field relationships
   - Skip logic patterns

3. FIELD ORDER:
   - Reading order (consider RTL)
   - Tab order for form filling
   - Logical progression

4. VALIDATION RULES:
   - Required field indicators (*, required, חובה)
   - Format hints (email, phone, date)
   - Field length constraints

Return enhanced field data with relationships and rules.`;

/**
 * Error recovery prompts
 */
export const ERROR_RECOVERY_PROMPTS = {
  'no_fields_found': `No fields were detected. Please:
    1. Look for ANY rectangular areas that could be filled
    2. Check for underlines where text could be written
    3. Identify checkboxes (small squares) and radio buttons (circles)
    4. Look for signature lines or areas`,

  'coordinates_out_of_bounds': `Field coordinates exceed page boundaries. Please:
    1. Verify page dimensions
    2. Check coordinate system (0,0 at bottom-left)
    3. Recalculate positions within bounds
    4. Ensure width/height are positive`,

  'missing_labels': `Fields found but labels missing. Please:
    1. Search for text near each field
    2. Check above, below, left, and right of fields
    3. Consider RTL label positions
    4. Look for section headers that apply to multiple fields`,
};

/**
 * Generate prompt for specific error recovery
 */
export function generateErrorRecoveryPrompt(
  errorType: keyof typeof ERROR_RECOVERY_PROMPTS,
  context?: any
): string {
  const basePrompt = ERROR_RECOVERY_PROMPTS[errorType];

  if (context) {
    return `${basePrompt}\n\nCONTEXT:\n${JSON.stringify(context, null, 2)}`;
  }

  return basePrompt;
}

/**
 * Confidence scoring prompt
 */
export const CONFIDENCE_SCORING_PROMPT = `Rate confidence for each extracted field:

CONFIDENCE LEVELS:
- HIGH (0.9-1.0): Clear boundaries, obvious label, standard field type
- MEDIUM (0.6-0.8): Partially visible, ambiguous type, unclear label
- LOW (0.0-0.5): Guessed position, no clear label, uncertain type

FACTORS TO CONSIDER:
1. Visual clarity of field boundaries
2. Label-field association strength
3. Field type certainty
4. OCR accuracy for labels
5. Position relative to other fields

Add "confidence" property (0.0-1.0) to each field.`;