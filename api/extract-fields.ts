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
}

/**
 * Convert percentage-based coordinates to PDF points
 *
 * @param field - Field with percentage coordinates
 * @param pageWidth - Page width in points (default A4)
 * @param pageHeight - Page height in points (default A4)
 * @returns Field with coordinates in PDF points
 */
function convertPercentToPoints(
  field: AIFieldResponse,
  pageWidth: number = PAGE_SIZES.A4.width,
  pageHeight: number = PAGE_SIZES.A4.height
): {
  x: number;
  y: number;
  width: number;
  height: number;
  type: string;
  pageNumber: number;
  label?: string;
  name: string;
  required: boolean;
  direction: 'ltr' | 'rtl';
} {
  // Convert percentages to points
  const x = (field.xPercent / 100) * pageWidth;
  const width = (field.widthPercent / 100) * pageWidth;
  const height = (field.heightPercent / 100) * pageHeight;

  // Convert Y from top-based percentage to PDF bottom-based coordinate
  // yPercent=0 means top of page, yPercent=100 means bottom
  // In PDF: y=pageHeight is top, y=0 is bottom
  const yFromTop = (field.yPercent / 100) * pageHeight;
  const y = pageHeight - yFromTop - height; // Bottom edge of field in PDF coords

  return {
    type: field.type,
    x: Math.round(x * 100) / 100,
    y: Math.round(y * 100) / 100,
    width: Math.round(width * 100) / 100,
    height: Math.round(height * 100) / 100,
    pageNumber: field.pageNumber,
    label: field.label,
    name: field.name,
    required: field.required,
    direction: field.direction,
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
    // Validate API key is configured
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY environment variable is not configured',
      });
    }

    const { pdfBase64, pageCount } = req.body;

    if (!pdfBase64) {
      return res.status(400).json({ error: 'Missing PDF data' });
    }

    // Initialize Gemini AI with validated API key
    const genAI = new GoogleGenerativeAI(apiKey);

    // Use environment variable for model name with sensible fallback
    const modelName = process.env.GEMINI_CHAT_MODEL || 'gemini-2.0-flash';

    // Parse timeout with NaN validation (default: 60000ms = 60 seconds)
    const parsedTimeout = parseInt(process.env.GEMINI_TIMEOUT || '60000', 10);
    const timeout = Number.isNaN(parsedTimeout) ? 60000 : parsedTimeout;

    console.log(`[Gemini AI] Using model: ${modelName}, timeout: ${timeout}ms`);
    const model = genAI.getGenerativeModel({ model: modelName });

    // Improved prompt with percentage-based coordinates
    const prompt = `You are a PDF form field detection expert. Analyze this PDF document THOROUGHLY and extract ALL fillable fields from EVERY page.

CRITICAL INSTRUCTIONS:
1. Scan EVERY page of the document (${pageCount ? `there are ${pageCount} pages` : 'scan all pages'})
2. Find ALL fields - do not skip any fields, even small ones
3. Use PERCENTAGE-based coordinates (0-100) for accuracy
4. Be thorough - insurance/government forms typically have 20-50+ fields

COORDINATE SYSTEM (PERCENTAGE-BASED):
- xPercent: Horizontal position from LEFT edge (0=left edge, 100=right edge)
- yPercent: Vertical position from TOP edge (0=top of page, 100=bottom)
- widthPercent: Field width as percentage of page width
- heightPercent: Field height as percentage of page height

FIELD TYPES TO DETECT:
- "text": Any line, box, or underlined area for writing text (most common)
- "checkbox": Small square boxes (typically 2-4% of page width)
- "radio": Circular options in groups sharing the same question
- "dropdown": Fields with arrow indicators or "בחר/Select" text
- "signature": Large boxes marked "חתימה/Signature" (typically 15-25% width)

WHAT TO LOOK FOR:
- Blank lines (horizontal rules for writing)
- Empty boxes/rectangles
- Dotted or dashed lines
- Underscored areas after labels
- Form field indicators (boxes, circles, lines)
- Areas marked with : or _ after Hebrew/English labels

FOR HEBREW FORMS:
- Read RIGHT to LEFT for field order
- Labels usually appear to the RIGHT of fields
- Look for fields after colons (:) or underscores

RETURN FORMAT - JSON array only, no markdown:
[
  {
    "type": "text",
    "xPercent": 60,
    "yPercent": 15,
    "widthPercent": 25,
    "heightPercent": 3,
    "pageNumber": 1,
    "label": "שם פרטי",
    "name": "first_name",
    "required": true,
    "direction": "rtl"
  }
]

IMPORTANT:
- Return ONLY the JSON array, no explanations
- Include fields from ALL pages
- Do not miss any fillable areas
- Estimate reasonable field sizes (text fields: 15-30% width, 2-4% height)
- Checkboxes are small (2-3% width/height)
- Be precise with percentages based on visual position`;

    console.log('[Gemini AI] Sending request...');

    // Call Gemini API with timeout protection
    const result = await withTimeout(
      model.generateContent([
        prompt,
        {
          inlineData: {
            mimeType: 'application/pdf',
            data: pdfBase64,
          },
        },
      ]),
      timeout,
    );

    const responseText = result.response.text();
    console.log('[Gemini AI] Response received, length:', responseText.length);

    // Clean up the response - remove markdown code blocks if present
    let cleanedText = responseText.trim();
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    // Parse AI response
    const aiFields: AIFieldResponse[] = JSON.parse(cleanedText);

    // Validate that we got an array
    if (!Array.isArray(aiFields)) {
      throw new Error('Invalid response format: expected array');
    }

    console.log(`[Gemini AI] Detected ${aiFields.length} fields`);

    // Convert percentage coordinates to PDF points
    const fields = aiFields.map(field => convertPercentToPoints(field));

    // Log summary by page
    const pageStats: Record<number, number> = {};
    fields.forEach(f => {
      pageStats[f.pageNumber] = (pageStats[f.pageNumber] || 0) + 1;
    });
    console.log('[Gemini AI] Fields per page:', pageStats);

    return res.status(200).json({
      fields,
      stats: {
        totalFields: fields.length,
        fieldsPerPage: pageStats,
      }
    });
  } catch (error) {
    console.error('Gemini API error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Field extraction failed',
    });
  }
}
