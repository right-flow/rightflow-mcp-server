import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';

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
 * Field response from AI with percentage-based coordinates
 */
interface AIFieldResponse {
  type: 'text' | 'checkbox' | 'radio' | 'dropdown' | 'signature';
  xPercent: number;      // X position as percentage (0-100) from LEFT
  yPercent: number;      // Y position as percentage (0-100) from TOP
  widthPercent: number;  // Width as percentage of page width
  heightPercent: number; // Height as percentage of page height
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
}

interface GuidanceTextResponse {
  id: string;
  content: string;
  pageNumber: number;
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
}

interface FormMetadata {
  companyName: string;
  formName: string;
  confidence: 'high' | 'medium' | 'low';
}

interface AIResponseWrapper {
  fields: AIFieldResponse[];
  guidanceTexts?: GuidanceTextResponse[];
  formMetadata?: FormMetadata;
}

/**
 * Convert percentage-based coordinates to PDF points
 */
function convertPercentToPoints(
  field: AIFieldResponse,
  pageWidth: number = PAGE_SIZES.A4.width,
  pageHeight: number = PAGE_SIZES.A4.height,
) {
  const x = (field.xPercent / 100) * pageWidth;
  const width = (field.widthPercent / 100) * pageWidth;
  const height = (field.heightPercent / 100) * pageHeight;

  const yFromTop = (field.yPercent / 100) * pageHeight;
  const y = pageHeight - yFromTop - height;

  return {
    ...field,
    x: Math.round(x * 100) / 100,
    y: Math.round(y * 100) / 100,
    width: Math.round(width * 100) / 100,
    height: Math.round(height * 100) / 100,
  };
}

function convertGuidanceToPoints(
  text: GuidanceTextResponse,
  pageWidth: number = PAGE_SIZES.A4.width,
  pageHeight: number = PAGE_SIZES.A4.height,
) {
  const x = (text.xPercent / 100) * pageWidth;
  const width = (text.widthPercent / 100) * pageWidth;
  const height = (text.heightPercent / 100) * pageHeight;
  const yFromTop = (text.yPercent / 100) * pageHeight;
  const y = pageHeight - yFromTop - height;

  return {
    id: text.id,
    content: text.content,
    pageNumber: text.pageNumber,
    x: Math.round(x * 100) / 100,
    y: Math.round(y * 100) / 100,
    width: Math.round(width * 100) / 100,
    height: Math.round(height * 100) / 100,
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

    const genAI = new GoogleGenerativeAI(apiKey);
    const modelName = process.env.GEMINI_CHAT_MODEL || 'gemini-1.5-pro';
    const parsedTimeout = parseInt(process.env.GEMINI_TIMEOUT || '60000', 10);
    const timeout = Number.isNaN(parsedTimeout) ? 60000 : parsedTimeout;

    console.log(`[Gemini AI] Using model: ${modelName}`);
    const model = genAI.getGenerativeModel({ model: modelName });

    const prompt = `You are analyzing a Hebrew PDF form. Extract ALL fillable fields with PRECISE coordinates.
Scan EVERY page (${pageCount ? `Total: ${pageCount}` : 'All'}). Use PERCENTAGE coordinates (0-100).

FORM IDENTIFICATION (FIRST PAGE ONLY):
- Scan the TOP 20-25% of the FIRST page to identify:
  1. Company Name: Look for company logo, header text, or issuing organization name
  2. Form Name: Look for form title, document name, or main heading
- Return in "formMetadata" with confidence level:
  - "high": Both company and form name clearly visible
  - "medium": One of them clearly visible
  - "low": Neither clearly visible or uncertain
- Examples: "Phoenix", "פניקס", "כלל ביטוח", "טופס בקשה לביטוח חיים"

CRITICAL - COORDINATE PRECISION:
- Measure coordinates EXACTLY where the fillable box/circle appears on the page.
- xPercent: distance from LEFT edge of page (0=left, 100=right).
- yPercent: distance from TOP edge of page (0=top, 100=bottom).
- widthPercent/heightPercent: actual size of the fillable area.
- For small checkboxes/radio buttons: typically 2-3% width, 1.5-2.5% height.
- For text fields: measure the actual input box, not the label.

RADIO BUTTONS AND CHECKBOXES - ADVANCED DETECTION AGENT:

STEP 1 - DETERMINE FIELD TYPE (RADIO vs CHECKBOX):
- Use RADIO BUTTONS when: options appear in a CLEAR row (horizontal) or column (vertical) layout.
- Use CHECKBOXES when: options appear in a CLUSTER pattern (scattered, grid, or irregular layout).
- Visual indicators for RADIO: circles (○), dots aligned in a row/column with shared question.
- Visual indicators for CHECKBOX: squares (☐), checkmarks, scattered positioning.
- Rule: If marks form a distinct line (horizontal/vertical), use RADIO. If scattered/clustered, use CHECKBOX.

STEP 2 - DETECT ORIENTATION (for RADIO buttons):
- HORIZONTAL: buttons arranged in a row (same Y, different X positions).
- VERTICAL: buttons arranged in a column (same X, different Y positions).
- DEFAULT: If orientation is unclear, use "horizontal".
- Set "orientation": "horizontal" or "vertical" accordingly.

STEP 3 - MEASURE BUTTON SIZE:
- Most form checkbox/radio buttons are VERY SMALL: typically 5-8 pixels (1-1.5% of page).
- Measure the ACTUAL circle/square size in the PDF, not the surrounding area.
- widthPercent and heightPercent should reflect the TRUE button size.
- Common sizes: 1-2% width, 1-2% height for small forms.

STEP 4 - CALCULATE SPACING BETWEEN BUTTONS:
- Measure the distance between the CENTER of each button to the next.
- Return "buttonSpacing": percentage distance between consecutive buttons.
- This helps maintain exact PDF layout when rendering the form.

STEP 5 - DETERMINE STARTING POSITION:
- For HORIZONTAL layout: position should be the LEFTMOST button's coordinates.
- For VERTICAL layout: position should be the TOPMOST button's coordinates.
- Buttons will be spread from this starting point according to orientation and spacing.

RADIO FIELD STRUCTURE:
Each radio field should include:
- "type": "radio"
- "options": array of ACTUAL Hebrew labels (e.g., ["ז", "נ"], NOT generic placeholders)
- "radioGroup": unique identifier (e.g., "gender", "marital_status")
- "orientation": "horizontal" or "vertical"
- "buttonSpacing": percentage distance between button centers
- "buttonSize": percentage size of individual buttons (e.g., 1.5)
- "label": the question text if visible (e.g., "מין")
- Position (xPercent, yPercent): starting button location (leftmost for horizontal, topmost for vertical)

EXAMPLE - Gender Radio Group:
{
  "type": "radio",
  "xPercent": 85, "yPercent": 15,
  "widthPercent": 1.5, "heightPercent": 1.5,
  "options": ["ז", "נ"],
  "radioGroup": "gender",
  "orientation": "horizontal",
  "buttonSpacing": 5,
  "buttonSize": 1.5,
  "label": "מין"
}

CHECKBOX vs RADIO FINAL DECISION:
- Use RADIO when: options are mutually exclusive AND arranged in clear row/column.
- Use CHECKBOX when:
  - Multiple selections allowed.
  - Complex multi-row/column layouts or clustered positioning.
  - Independent yes/no choices.
- When in doubt with complex layouts (4+ options scattered), use CHECKBOX.

FIELD NAMING:
- "name": descriptive English name based on field purpose (e.g., "first_name", "id_number", "gender").
- "label": the Hebrew text label visible near the field.

SECTIONS:
- Group fields by logical sections (e.g., "פרטים אישיים", "כתובת", "פרטי תעסוקה").

GUIDANCE TEXT:
- Return instruction blocks and notes in "guidanceTexts" array (NOT as fields).

FIELD TYPES: "text", "checkbox", "radio", "dropdown", "signature".

JSON OUTPUT FORMAT (ONLY):
{
  "formMetadata": {
    "companyName": "Phoenix",
    "formName": "טופס בקשה לביטוח חיים",
    "confidence": "high"
  },
  "fields": [
    {
      "type": "radio",
      "xPercent": 85, "yPercent": 15, "widthPercent": 1.5, "heightPercent": 1.5,
      "pageNumber": 1,
      "label": "מין",
      "name": "gender",
      "options": ["ז", "נ"],
      "radioGroup": "gender",
      "orientation": "horizontal",
      "buttonSpacing": 5,
      "buttonSize": 1.5,
      "sectionName": "פרטים אישיים",
      "required": true,
      "direction": "rtl"
    },
    {
      "type": "text",
      "xPercent": 60, "yPercent": 10, "widthPercent": 25, "heightPercent": 3,
      "pageNumber": 1,
      "label": "שם פרטי",
      "name": "first_name",
      "sectionName": "פרטים אישיים",
      "required": true,
      "direction": "rtl"
    }
  ],
  "guidanceTexts": [
    { "id": "g1", "content": "נא למלא בכתב יד ברור", "pageNumber": 1, "xPercent": 10, "yPercent": 5, "widthPercent": 80, "heightPercent": 2 }
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

    // Log radio fields with their options for debugging
    const radioFields = aiResponse.fields.filter(f => f.type === 'radio');
    if (radioFields.length > 0) {
      console.log(`[Gemini AI] Found ${radioFields.length} radio fields:`);
      radioFields.forEach((f, i) => {
        console.log(`  Radio ${i + 1}: name="${f.name}", options=${JSON.stringify(f.options)}, radioGroup="${f.radioGroup}"`);
      });
    }

    const fields = aiResponse.fields.map(f => convertPercentToPoints(f));
    const guidanceTexts = (aiResponse.guidanceTexts || []).map(g => convertGuidanceToPoints(g));

    const pageStats: Record<number, number> = {};
    fields.forEach(f => { pageStats[f.pageNumber] = (pageStats[f.pageNumber] || 0) + 1; });

    // Log form metadata if present
    if (aiResponse.formMetadata) {
      console.log('[Gemini AI] Form metadata extracted:', aiResponse.formMetadata);
    }

    return res.status(200).json({
      fields,
      guidanceTexts,
      formMetadata: aiResponse.formMetadata,
      stats: {
        totalFields: fields.length,
        fieldsPerPage: pageStats,
      },
    });
  } catch (error) {
    console.error('Gemini API error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Field extraction failed',
    });
  }
}
