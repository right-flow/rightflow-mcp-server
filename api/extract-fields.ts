import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PDFDocument } from 'pdf-lib';
import { CalibrationService, isRtlForm } from './lib/ai';

/**
 * Creates a promise that rejects after a specified timeout
 */
function createTimeout(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Request timed out after ${ms}ms`));
    }, ms);
  });
}

/**
 * Wraps a promise with a timeout
 */
async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([promise, createTimeout(ms)]);
}

/**
 * Standard PDF page sizes in points (1 point = 1/72 inch)
 */
const PAGE_SIZES = {
  A4: { width: 595, height: 842 },
  LETTER: { width: 612, height: 792 },
  LEGAL: { width: 612, height: 1008 },
};

/**
 * Page dimension info extracted from PDF
 */
interface PageInfo {
  pageNumber: number;
  width: number;   // PDF points
  height: number;  // PDF points
  rotation: number; // 0, 90, 180, 270 degrees
}

/**
 * Extract actual page dimensions from PDF using pdf-lib
 * This is critical for accurate coordinate conversion - Layer 1 improvement
 */
async function extractPageDimensions(pdfBase64: string): Promise<PageInfo[]> {
  try {
    const pdfBytes = Buffer.from(pdfBase64, 'base64');
    const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const pages = pdfDoc.getPages();

    return pages.map((page, index) => {
      const { width, height } = page.getSize();
      const rotation = page.getRotation().angle;

      // Handle rotation: if 90 or 270, swap width/height for effective dimensions
      const effectiveWidth = (rotation === 90 || rotation === 270) ? height : width;
      const effectiveHeight = (rotation === 90 || rotation === 270) ? width : height;

      return {
        pageNumber: index + 1,
        width: effectiveWidth,
        height: effectiveHeight,
        rotation,
      };
    });
  } catch (error) {
    console.warn('[RightFlow] Could not extract page dimensions, using A4 default:', error);
    return [{ pageNumber: 1, width: PAGE_SIZES.A4.width, height: PAGE_SIZES.A4.height, rotation: 0 }];
  }
}

/**
 * Field confidence scores from AI - Layer 3 improvement
 */
interface FieldConfidence {
  position: number;      // 0-1: How confident in x,y position
  size: number;          // 0-1: How confident in width,height
  labelMatch: number;    // 0-1: How confident label text matches field purpose
  overall: number;       // 0-1: Overall confidence
}

/**
 * Field response from AI with NATIVE Gemini bounding box format
 *
 * Gemini's native format uses:
 * - box_2d: [y_min, x_min, y_max, x_max] - NOTE: Y comes first!
 * - Coordinates normalized to 0-1000 scale
 *
 * This is the format Gemini is TRAINED on and provides best accuracy.
 */
interface AIFieldResponse {
  type: 'text' | 'checkbox' | 'radio' | 'dropdown' | 'signature';
  // Native Gemini bounding box: [y_min, x_min, y_max, x_max] in 0-1000 scale
  box_2d: [number, number, number, number];
  pageNumber: number;
  label?: string;
  name: string;
  required: boolean;
  direction: 'ltr' | 'rtl';
  sectionName?: string;
  radioGroup?: string;
  orientation?: 'horizontal' | 'vertical';
  options?: string[];    // Options for radio/dropdown fields
  buttonSpacing?: number; // Percentage distance between radio/checkbox buttons
  buttonSize?: number;    // Percentage size of individual radio/checkbox buttons
  confidence?: FieldConfidence; // Layer 3: Per-field confidence scores
}

interface GuidanceTextResponse {
  id: string;
  content: string;
  pageNumber: number;
  box_2d: [number, number, number, number]; // [y_min, x_min, y_max, x_max] in 0-1000 scale
}

/**
 * Anchor point for coordinate calibration - Layer 2 improvement
 */
interface AnchorPointResponse {
  type: 'logo' | 'header' | 'section_header' | 'table_corner' | 'border';
  description: string;
  pageNumber: number;
  box_2d: [number, number, number, number]; // [y_min, x_min, y_max, x_max] in 0-1000 scale
  confidence: number;  // 0-1
}

interface FormMetadata {
  companyName: string;
  formName: string;
  confidence: 'high' | 'medium' | 'low';
}

interface AIResponseWrapper {
  fields: AIFieldResponse[];
  guidanceTexts?: GuidanceTextResponse[];
  anchorPoints?: AnchorPointResponse[];  // Layer 2: calibration anchors
  formMetadata?: FormMetadata;
}

/**
 * Convert Gemini's native bounding box format to PDF points
 *
 * Gemini returns: box_2d = [y_min, x_min, y_max, x_max] in 0-1000 scale
 * We need: x, y (bottom-left origin), width, height in PDF points
 *
 * Key insight: Gemini's 0-1000 scale is relative to a 1000x1000 image.
 * We simply divide by 1000 and multiply by actual page dimensions.
 */
function convertNativeBoxToPoints(
  box_2d: [number, number, number, number],
  pageInfo: PageInfo,
): { x: number; y: number; width: number; height: number } {
  const [y_min, x_min, y_max, x_max] = box_2d;

  // Convert from 0-1000 scale to page dimensions
  const xStart = (x_min / 1000) * pageInfo.width;
  const xEnd = (x_max / 1000) * pageInfo.width;
  const yTopStart = (y_min / 1000) * pageInfo.height; // Distance from TOP
  const yTopEnd = (y_max / 1000) * pageInfo.height;   // Distance from TOP

  const width = xEnd - xStart;
  const height = yTopEnd - yTopStart;

  // Convert Y from top-origin to PDF bottom-origin
  // PDF: y=0 at bottom, y increases upward
  // Gemini: y=0 at top, y increases downward
  const y = pageInfo.height - yTopEnd; // Bottom of the box in PDF coords

  return {
    x: Math.round(xStart * 100) / 100,
    y: Math.round(y * 100) / 100,
    width: Math.round(width * 100) / 100,
    height: Math.round(height * 100) / 100,
  };
}

/**
 * Convert Gemini native box_2d to PDF points
 * Uses the new native format for maximum accuracy
 */
function convertFieldToPoints(
  field: AIFieldResponse,
  pageInfoMap: Map<number, PageInfo>,
) {
  // Get actual page dimensions for this field's page
  const pageInfo = pageInfoMap.get(field.pageNumber) || {
    pageNumber: field.pageNumber,
    width: PAGE_SIZES.A4.width,
    height: PAGE_SIZES.A4.height,
    rotation: 0,
  };

  // Convert native bounding box to PDF points
  const { x, y, width, height } = convertNativeBoxToPoints(field.box_2d, pageInfo);

  // Log for debugging
  const [y_min, x_min, y_max, x_max] = field.box_2d;
  console.log(`[Native Box] Field "${field.name}": box_2d=[${y_min}, ${x_min}, ${y_max}, ${x_max}] → x=${x.toFixed(1)}, y=${y.toFixed(1)}, w=${width.toFixed(1)}, h=${height.toFixed(1)}`);

  return {
    ...field,
    x,
    y,
    width,
    height,
    // Include page dimensions for frontend reference
    _pageWidth: pageInfo.width,
    _pageHeight: pageInfo.height,
    // Debug: include original box_2d
    _box_2d_original: field.box_2d,
  };
}

function convertGuidanceToPoints(
  text: GuidanceTextResponse,
  pageInfoMap: Map<number, PageInfo>,
) {
  const pageInfo = pageInfoMap.get(text.pageNumber) || {
    pageNumber: text.pageNumber,
    width: PAGE_SIZES.A4.width,
    height: PAGE_SIZES.A4.height,
    rotation: 0,
  };

  const { x, y, width, height } = convertNativeBoxToPoints(text.box_2d, pageInfo);

  return {
    id: text.id,
    content: text.content,
    pageNumber: text.pageNumber,
    x,
    y,
    width,
    height,
  };
}

/**
 * Convert anchor point coordinates to PDF points - Layer 2
 */
function convertAnchorToPoints(
  anchor: AnchorPointResponse,
  pageInfoMap: Map<number, PageInfo>,
) {
  const pageInfo = pageInfoMap.get(anchor.pageNumber) || {
    pageNumber: anchor.pageNumber,
    width: PAGE_SIZES.A4.width,
    height: PAGE_SIZES.A4.height,
    rotation: 0,
  };

  const { x, y, width, height } = convertNativeBoxToPoints(anchor.box_2d, pageInfo);

  return {
    type: anchor.type,
    description: anchor.description,
    pageNumber: anchor.pageNumber,
    x,
    y,
    width,
    height,
    confidence: anchor.confidence,
  };
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured' });
    }

    const { pdfBase64, pageCount } = req.body;
    if (!pdfBase64) {
      return res.status(400).json({ error: 'Missing PDF data' });
    }

    // Layer 1: Extract actual page dimensions from PDF
    const pageInfoList = await extractPageDimensions(pdfBase64);
    const pageInfoMap = new Map<number, PageInfo>();
    for (const info of pageInfoList) {
      pageInfoMap.set(info.pageNumber, info);
    }
    console.log(`[RightFlow] Extracted dimensions for ${pageInfoList.length} page(s):`,
      pageInfoList.map(p => `Page ${p.pageNumber}: ${p.width}x${p.height}pt`).join(', '));

    const genAI = new GoogleGenerativeAI(apiKey);
    const modelName = process.env.GEMINI_CHAT_MODEL || 'gemini-1.5-pro';
    const parsedTimeout = parseInt(process.env.GEMINI_TIMEOUT || '60000', 10);
    const timeout = Number.isNaN(parsedTimeout) ? 60000 : parsedTimeout;

    console.log(`[Gemini AI] Using model: ${modelName}`);
    const model = genAI.getGenerativeModel({ model: modelName });

    const prompt = `You are analyzing a Hebrew PDF form. Extract ALL fillable fields with PRECISE bounding boxes.
Scan EVERY page (${pageCount ? `Total: ${pageCount}` : 'All'}).

⚠️ CRITICAL: USE NATIVE BOUNDING BOX FORMAT ⚠️
Return coordinates as "box_2d": [y_min, x_min, y_max, x_max] with values normalized to 0-1000.
This is the EXACT format you are trained on for spatial understanding.

Example: A field in the upper-right quadrant of the page:
"box_2d": [100, 600, 150, 950]  // y_min=100, x_min=600, y_max=150, x_max=950

COORDINATE SYSTEM:
- Origin (0,0) is TOP-LEFT corner of each page
- x increases LEFT to RIGHT (0=left edge, 1000=right edge)
- y increases TOP to BOTTOM (0=top edge, 1000=bottom edge)
- All coordinates normalized to 1000x1000 grid
- Each page has INDEPENDENT coordinates (page 2 starts fresh at 0,0)

FORM IDENTIFICATION (FIRST PAGE ONLY):
- Scan the TOP 20-25% of the FIRST page to identify:
  1. Company Name: Look for company logo, header text, or issuing organization name
  2. Form Name: Look for form title, document name, or main heading
- Return in "formMetadata" with confidence level

ANCHOR POINTS DETECTION:
For EACH page, detect 3-5 fixed reference points:
1. Company Logo, 2. Main Header/Title, 3. Section Headers, 4. Table Corners, 5. Page Borders

Return anchor points with:
- "type": "logo" | "header" | "section_header" | "table_corner" | "border"
- "description": text content or description
- "pageNumber": which page
- "box_2d": [y_min, x_min, y_max, x_max] in 0-1000 scale
- "confidence": 0-1

⚠️ CRITICAL - DETECT THE INPUT AREA, NOT THE LABEL ⚠️

For Hebrew RTL forms:
- Labels are on the RIGHT, input fields/underlines are on the LEFT
- Return box_2d for the UNDERLINE/INPUT area ONLY, not the label

Example - Field "שם מלא: _______________":
- The LABEL "שם מלא:" is at x=750-950 (right side)
- The INPUT UNDERLINE is at x=50-600 (left side)
- Return box_2d for the UNDERLINE: [y_min, 50, y_max, 600]

INPUT AREA DETECTION RULES:
1. UNDERLINES (______) mark input areas - return ONLY the underline bounding box
2. EMPTY BOXES/RECTANGLES are input fields - return the box coordinates
3. The INPUT is typically to the LEFT of Hebrew label text
4. For underlined text fields: box height is typically 20-40 units (2-4% of page)

Y-POSITION FOR UNDERLINES:
- The box_2d should encompass the underline area where text will be written
- y_min should be ABOVE the underline, y_max at or slightly below it
- This ensures text appears ON TOP of the underline when filled

RADIO BUTTONS AND CHECKBOXES:

RADIO vs CHECKBOX:
- RADIO: options in a clear row/column, mutually exclusive
- CHECKBOX: scattered/clustered, multiple selections allowed
- "orientation": "horizontal" or "vertical" for radio buttons
- "buttonSpacing": distance between button centers (in 0-1000 scale)

RADIO FIELD STRUCTURE:
- "type": "radio"
- "box_2d": bounding box of the FIRST button [y_min, x_min, y_max, x_max]
- "options": actual Hebrew labels (e.g., ["ז", "נ"])
- "radioGroup": unique identifier
- "orientation": "horizontal" or "vertical"
- "buttonSpacing": distance between buttons (0-1000 scale)

FIELD NAMING:
- "name": descriptive English name (e.g., "first_name", "id_number")
- "label": Hebrew text label visible near the field

CONFIDENCE SCORING:
For EACH field, provide "confidence" object (0-1 scale):
- "position": confidence in box_2d coordinates
- "size": confidence in box dimensions
- "labelMatch": how well label matches what you see
- "overall": combined confidence

SECTIONS:
- Group fields by logical sections (e.g., "פרטים אישיים", "כתובת")

FIELD TYPES: "text", "checkbox", "radio", "dropdown", "signature"

⚠️ JSON OUTPUT FORMAT (ONLY) - USE box_2d FORMAT ⚠️
{
  "formMetadata": {
    "companyName": "Phoenix",
    "formName": "טופס בקשה לביטוח חיים",
    "confidence": "high"
  },
  "fields": [
    {
      "type": "radio",
      "box_2d": [140, 800, 160, 830],
      "pageNumber": 1,
      "label": "מין",
      "name": "gender",
      "options": ["ז", "נ"],
      "radioGroup": "gender",
      "orientation": "horizontal",
      "buttonSpacing": 50,
      "sectionName": "פרטים אישיים",
      "required": true,
      "direction": "rtl",
      "confidence": { "position": 0.9, "size": 0.85, "labelMatch": 0.95, "overall": 0.9 }
    },
    {
      "type": "text",
      "box_2d": [100, 70, 130, 600],
      "pageNumber": 1,
      "label": "שם פרטי",
      "name": "first_name",
      "sectionName": "פרטים אישיים",
      "required": true,
      "direction": "rtl",
      "confidence": { "position": 0.85, "size": 0.9, "labelMatch": 0.95, "overall": 0.9 }
    }
  ],
  "guidanceTexts": [
    { "id": "g1", "content": "נא למלא בכתב יד ברור", "pageNumber": 1, "box_2d": [50, 100, 70, 900] }
  ],
  "anchorPoints": [
    { "type": "logo", "description": "Company logo", "pageNumber": 1, "box_2d": [20, 850, 80, 980], "confidence": 0.95 },
    { "type": "header", "description": "טופס בקשה לביטוח חיים", "pageNumber": 1, "box_2d": [30, 200, 60, 800], "confidence": 0.9 }
  ]
}`;

    console.log('[Gemini AI] Sending request...');

    const result = await withTimeout(
      model.generateContent([
        prompt,
        { inlineData: { mimeType: 'application/pdf', data: pdfBase64 } },
      ]),
      timeout,
    );

    const responseText = result.response.text();
    let cleanedText = responseText.trim();

    // Remove markdown code blocks
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    // Try to extract JSON from response if it contains text before/after
    if (!cleanedText.startsWith('{')) {
      const jsonMatch = cleanedText.match(/\{[\s\S]*"fields"[\s\S]*\}/);
      if (jsonMatch) {
        cleanedText = jsonMatch[0];
        console.log('[Gemini AI] Extracted JSON from mixed response');
      } else {
        console.error('[Gemini AI] Response was not JSON:', cleanedText.substring(0, 200));
        throw new Error('AI returned text instead of JSON. The page may be empty or unreadable.');
      }
    }

    let aiResponse: AIResponseWrapper;
    try {
      aiResponse = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('[Gemini AI] JSON parse failed:', cleanedText.substring(0, 500));
      throw new Error('Failed to parse AI response as JSON');
    }

    if (!aiResponse.fields) {
      throw new Error('Invalid response format: missing fields');
    }

    // Log raw AI response with NATIVE box_2d format
    console.log(`[RightFlow] Raw AI response: ${aiResponse.fields.length} fields (using native box_2d format)`);
    const sampleFields = aiResponse.fields.slice(0, 5);
    sampleFields.forEach(f => {
      const box = f.box_2d;
      if (box) {
        console.log(`  Field "${f.name}" (page ${f.pageNumber}): box_2d=[${box[0]}, ${box[1]}, ${box[2]}, ${box[3]}] (y_min, x_min, y_max, x_max)`);
      } else {
        console.warn(`  Field "${f.name}" (page ${f.pageNumber}): MISSING box_2d!`);
      }
    });

    // Log radio fields with their options for debugging
    const radioFields = aiResponse.fields.filter(f => f.type === 'radio');
    if (radioFields.length > 0) {
      console.log(`[Gemini AI] Found ${radioFields.length} radio fields:`);
      radioFields.forEach((f, i) => {
        console.log(`  Radio ${i + 1}: name="${f.name}", options=${JSON.stringify(f.options)}, radioGroup="${f.radioGroup}"`);
      });
    }

    // Validate box_2d format - all fields must have it
    const fieldsWithoutBox = aiResponse.fields.filter(f => !f.box_2d || f.box_2d.length !== 4);
    if (fieldsWithoutBox.length > 0) {
      console.error(`[RightFlow ERROR] ${fieldsWithoutBox.length} fields missing valid box_2d:`,
        fieldsWithoutBox.map(f => f.name).join(', '));
    }

    // Convert using native box_2d format - NO CALIBRATION NEEDED with native format
    let fields = aiResponse.fields
      .filter(f => f.box_2d && f.box_2d.length === 4) // Only process valid fields
      .map(f => convertFieldToPoints(f, pageInfoMap));
    const guidanceTexts = (aiResponse.guidanceTexts || []).map(g => convertGuidanceToPoints(g, pageInfoMap));
    // Layer 2: Convert anchor points for calibration
    const anchorPoints = (aiResponse.anchorPoints || []).map(a => convertAnchorToPoints(a, pageInfoMap));

    // Layer 4: Apply RTL calibration for Hebrew forms
    const formIsRtl = isRtlForm(fields);
    if (formIsRtl) {
      console.log('[RightFlow] Detected RTL form - applying calibration');
      const calibrationService = new CalibrationService();

      // Apply RTL correction to shift from label position to input field position
      fields = fields.map(field => {
        const pageInfo = pageInfoMap.get(field.pageNumber);
        if (!pageInfo) return field;

        // Convert to CalibratedField format for the service
        const calibratedField = calibrationService.applyRtlCorrection(
          {
            name: field.name,
            label: field.label,
            type: field.type,
            pageNumber: field.pageNumber,
            x: field.x,
            y: field.y,
            width: field.width,
            height: field.height,
            direction: field.direction,
            confidence: field.confidence,
          },
          pageInfo.width,
        );

        return {
          ...field,
          x: calibratedField.x,
          width: calibratedField.width,
          _calibrated: calibratedField._calibrated,
          _originalX: calibratedField._originalX,
        };
      });
    }

    const pageStats: Record<number, number> = {};
    fields.forEach(f => { pageStats[f.pageNumber] = (pageStats[f.pageNumber] || 0) + 1; });

    // Log form metadata if present
    if (aiResponse.formMetadata) {
      console.log('[Gemini AI] Form metadata extracted:', aiResponse.formMetadata);
    }

    // Layer 2: Log anchor points for debugging
    if (anchorPoints.length > 0) {
      console.log(`[Gemini AI] Found ${anchorPoints.length} anchor points for calibration`);
    }

    // Log diagnostics for native format
    const multiPageFields = fields.filter(f => f.pageNumber > 1);
    if (multiPageFields.length > 0) {
      console.log(`[RightFlow] Multi-page form: ${multiPageFields.length} fields on pages 2+`);
    }

    return res.status(200).json({
      fields,
      guidanceTexts,
      anchorPoints,
      formMetadata: aiResponse.formMetadata,
      pageDimensions: pageInfoList,
      stats: {
        totalFields: fields.length,
        fieldsPerPage: pageStats,
        pageCount: pageInfoList.length,
      },
      // Include info about native format usage
      _coordinateFormat: 'native_box_2d_0_1000',
    });
  } catch (error) {
    console.error('Gemini API error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Field extraction failed',
    });
  }
}
