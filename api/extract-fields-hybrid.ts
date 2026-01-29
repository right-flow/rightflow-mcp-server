/**
 * Hybrid Field Extraction: Azure OCR + Gemini Visual Analysis
 *
 * Strategy:
 * - Azure = "Eyes" — precise OCR text positions, tables, selection marks
 * - Gemini = "Brain" — visual form understanding, field identification, type classification
 * - Smart Matching = "Hands" — positions input fields based on label locations + field types
 *
 * Gemini does NOT return coordinates. It only identifies WHAT fields exist.
 * Azure provides all coordinate data. Our code positions inputs based on field type.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import DocumentIntelligence, {
  AnalyzeResultOutput,
  getLongRunningPoller,
  isUnexpected,
} from '@azure-rest/ai-document-intelligence';
import { AzureKeyCredential } from '@azure/core-auth';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PDFDocument } from 'pdf-lib';

// ============================================================
// Types
// ============================================================

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PageInfo {
  pageNumber: number;
  width: number;
  height: number;
}

interface OcrTextLine {
  content: string;
  box: Box;
}

interface OcrWord {
  content: string;
  box: Box;
}

interface OcrTableCell {
  rowIndex: number;
  columnIndex: number;
  content: string;
  box: Box;
  kind?: string;
}

interface OcrTable {
  rowCount: number;
  columnCount: number;
  cells: OcrTableCell[];
  box?: Box;
}

interface OcrSelectionMark {
  state: string;
  box: Box;
  confidence: number;
}

interface OcrPageData {
  pageNumber: number;
  dimensions: { width: number; height: number };
  textLines: OcrTextLine[];
  words: OcrWord[];
  tables: OcrTable[];
  selectionMarks: OcrSelectionMark[];
  kvPairsWithValue: Array<{
    key: string;
    keyBox: Box;
    valueBox: Box;
    confidence: number;
  }>;
}

interface GeminiField {
  labelText: string;
  fieldType:
    | 'underline'
    | 'box_with_title'
    | 'digit_boxes'
    | 'table_cell'
    | 'title_right'
    | 'selection_mark';
  inputType: 'text' | 'checkbox' | 'radio' | 'signature' | 'dropdown';
  section?: string;
  required: boolean;
  visualDescription?: string;
}

interface GeminiPageResult {
  totalFieldCount: number;
  fields: GeminiField[];
}

interface ExtractedField {
  type: 'text' | 'checkbox' | 'radio' | 'dropdown' | 'signature';
  name: string;
  label?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  pageNumber: number;
  direction: 'ltr' | 'rtl';
  required: boolean;
  confidence: number;
  sectionName?: string;
  _source?: string;
}

// ============================================================
// Constants
// ============================================================

const PAGE_SIZES = {
  A4: { width: 595, height: 842 },
};

const POINTS_PER_INCH = 72;

// Hebrew field name translations
const HEBREW_FIELD_NAMES: Record<string, string> = {
  'שם': 'name', 'שם מלא': 'full_name', 'שם פרטי': 'first_name',
  'שם משפחה': 'last_name', 'שם הלקוח': 'customer_name',
  'שם הסוכן': 'agent_name', 'כתובת': 'address',
  'כתובת העסק': 'business_address', 'עיר': 'city',
  'מיקוד': 'zip_code', 'רחוב': 'street', 'רח\'': 'street',
  'טלפון': 'phone', 'נייד': 'mobile', 'פקס': 'fax',
  'ת.ז': 'id_number', 'ת.ז.': 'id_number', 'תאריך': 'date',
  'חתימה': 'signature', 'איש קשר': 'contact_person',
  'הערות': 'notes', 'מספר': 'number', 'מס\'': 'number',
  'חשבון': 'account', 'בנק': 'bank', 'סניף': 'branch',
  'פרטי': 'first_name', 'משפחה': 'last_name',
  'דוא"ל': 'email', 'E-mail': 'email',
};

// ============================================================
// Utility Functions
// ============================================================

function isHebrewText(text: string): boolean {
  return /[\u0590-\u05FF]/.test(text);
}

function generateFieldName(label: string, index: number): string {
  const clean = label.trim().replace(/[:\s]+$/, '');
  for (const [heb, eng] of Object.entries(HEBREW_FIELD_NAMES)) {
    if (clean.includes(heb)) return eng;
  }
  return `field_${index + 1}`;
}

/**
 * Convert Azure bounding polygon (inches, clockwise from TL) to PDF points
 */
function convertPolygonToBox(
  polygon: number[],
  pageInfo: PageInfo,
): Box {
  if (!polygon || polygon.length < 8) {
    return { x: 0, y: 0, width: 50, height: 20 };
  }
  const [tlX, tlY, trX, trY, brX, brY, blX, blY] = polygon;
  // Use min/max across ALL coordinates to handle rotated/skewed boxes
  const xMin = Math.min(tlX, trX, brX, blX) * POINTS_PER_INCH;
  const xMax = Math.max(tlX, trX, brX, blX) * POINTS_PER_INCH;
  const yMin = Math.min(tlY, trY, brY, blY) * POINTS_PER_INCH;
  const yMax = Math.max(tlY, trY, brY, blY) * POINTS_PER_INCH;
  return {
    x: Math.round(xMin * 100) / 100,
    y: Math.round((pageInfo.height - yMax) * 100) / 100,
    width: Math.round((xMax - xMin) * 100) / 100,
    height: Math.round((yMax - yMin) * 100) / 100,
  };
}

/**
 * Extract page dimensions from PDF using pdf-lib
 */
async function extractPageDimensions(
  pdfBase64: string,
): Promise<PageInfo[]> {
  try {
    const pdfBytes = Buffer.from(pdfBase64, 'base64');
    const pdfDoc = await PDFDocument.load(pdfBytes, {
      ignoreEncryption: true,
    });
    return pdfDoc.getPages().map((page, i) => {
      const { width, height } = page.getSize();
      const rot = page.getRotation().angle;
      const w = rot === 90 || rot === 270 ? height : width;
      const h = rot === 90 || rot === 270 ? width : height;
      return { pageNumber: i + 1, width: w, height: h };
    });
  } catch {
    return [
      {
        pageNumber: 1,
        width: PAGE_SIZES.A4.width,
        height: PAGE_SIZES.A4.height,
      },
    ];
  }
}

/**
 * Extract a single page from a multi-page PDF
 * Returns the extracted page as base64
 */
async function extractSinglePage(
  pdfBase64: string,
  pageNumber: number,
): Promise<string> {
  try {
    const pdfBytes = Buffer.from(pdfBase64, 'base64');
    const pdfDoc = await PDFDocument.load(pdfBytes, {
      ignoreEncryption: true,
    });

    // Create new PDF with only the specified page
    const newPdf = await PDFDocument.create();
    const [copiedPage] = await newPdf.copyPages(pdfDoc, [pageNumber - 1]);
    newPdf.addPage(copiedPage);

    // Save and return as base64
    const newPdfBytes = await newPdf.save();
    return Buffer.from(newPdfBytes).toString('base64');
  } catch (error) {
    console.error(
      `[Hybrid] Failed to extract page ${pageNumber}:`,
      error,
    );
    throw error;
  }
}

/**
 * Hebrew-aware fuzzy text matching
 * Returns a score 0-1 indicating how well two strings match
 */
function hebrewTextSimilarity(a: string, b: string): number {
  const cleanA = a
    .trim()
    .replace(/[:\s׃]+$/, '')
    .replace(/\s+/g, ' ');
  const cleanB = b
    .trim()
    .replace(/[:\s׃]+$/, '')
    .replace(/\s+/g, ' ');

  // Handle empty strings - no match unless both are empty
  if (cleanA === '' || cleanB === '') {
    return cleanA === cleanB ? 1.0 : 0;
  }

  if (cleanA === cleanB) return 1.0;
  if (cleanA.includes(cleanB) || cleanB.includes(cleanA)) return 0.9;

  // Normalize Hebrew characters
  const normA = cleanA.replace(/[\u05B0-\u05BD\u05BF-\u05C7]/g, '');
  const normB = cleanB.replace(/[\u05B0-\u05BD\u05BF-\u05C7]/g, '');
  if (normA === normB) return 0.95;
  if (normA.includes(normB) || normB.includes(normA)) return 0.85;

  return 0;
}

/**
 * Calculate overall confidence score for a positioned field
 *
 * Combines multiple confidence factors with weighted formula:
 * - Label match: 30% weight (how well label text matched)
 * - Position certainty: 50% weight (how certain field position is)
 * - Type certainty: 20% weight (how certain field type is)
 */
function calculateConfidence(factors: {
  labelMatch: number;
  positionCertainty: number;
  typeCertainty: number;
  visualBoundary?: boolean;
}): {
  overall: number;
  breakdown: {
    labelMatch: number;
    positionCertainty: number;
    typeCertainty: number;
  };
  quality: 'high' | 'medium' | 'low';
} {
  const LABEL_WEIGHT = 0.3;
  const POSITION_WEIGHT = 0.5;
  const TYPE_WEIGHT = 0.2;
  const VISUAL_BOUNDARY_BOOST = 0.05;

  let overall =
    factors.labelMatch * LABEL_WEIGHT +
    factors.positionCertainty * POSITION_WEIGHT +
    factors.typeCertainty * TYPE_WEIGHT;

  if (factors.visualBoundary === true) {
    overall += VISUAL_BOUNDARY_BOOST;
  }

  overall = Math.min(overall, 1.0);

  let quality: 'high' | 'medium' | 'low';
  if (overall >= 0.85) {
    quality = 'high';
  } else if (overall >= 0.70) {
    quality = 'medium';
  } else {
    quality = 'low';
  }

  return {
    overall,
    breakdown: {
      labelMatch: factors.labelMatch,
      positionCertainty: factors.positionCertainty,
      typeCertainty: factors.typeCertainty,
    },
    quality,
  };
}

// ============================================================
// Phase 1: Azure OCR
// ============================================================

async function runAzureOcr(
  pdfBase64: string,
  pageInfoMap: Map<number, PageInfo>,
): Promise<{ ocrPages: Map<number, OcrPageData>; raw: AnalyzeResultOutput }> {
  const endpoint = process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT!;
  const apiKey = process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY!;
  const client = DocumentIntelligence(
    endpoint,
    new AzureKeyCredential(apiKey),
  );

  console.log('[Hybrid] Phase 1: Sending to Azure DI...');
  const initialResponse = await client
    .path('/documentModels/{modelId}:analyze', 'prebuilt-layout')
    .post({
      contentType: 'application/json',
      body: { base64Source: pdfBase64 },
      queryParameters: { features: ['keyValuePairs'] },
    });

  if (isUnexpected(initialResponse)) {
    throw new Error(
      `Azure API error: ${JSON.stringify(initialResponse.body)}`,
    );
  }

  const poller = getLongRunningPoller(client, initialResponse);
  const result = await poller.pollUntilDone();
  if (isUnexpected(result)) {
    throw new Error(
      `Azure analysis failed: ${JSON.stringify(result.body)}`,
    );
  }

  const resultBody = result.body as {
    analyzeResult?: AnalyzeResultOutput;
  };
  const analyzeResult = resultBody.analyzeResult;
  if (!analyzeResult) {
    throw new Error('No analysis result from Azure');
  }

  // Build OCR page data
  const ocrPages = new Map<number, OcrPageData>();

  if (analyzeResult.pages) {
    for (const page of analyzeResult.pages) {
      const pi = pageInfoMap.get(page.pageNumber) || {
        pageNumber: page.pageNumber,
        width: PAGE_SIZES.A4.width,
        height: PAGE_SIZES.A4.height,
      };

      const textLines: OcrTextLine[] = (page.lines || []).map(
        (l: any) => ({
          content: l.content || '',
          box: convertPolygonToBox(l.polygon || [], pi),
        }),
      );

      const words: OcrWord[] = (page.words || []).map((w: any) => ({
        content: w.content || '',
        box: convertPolygonToBox(w.polygon || [], pi),
      }));

      const selectionMarks: OcrSelectionMark[] = (
        page.selectionMarks || []
      ).map((m: any) => ({
        state: m.state || 'unselected',
        box: convertPolygonToBox(m.polygon || [], pi),
        confidence: m.confidence || 0.5,
      }));

      ocrPages.set(page.pageNumber, {
        pageNumber: page.pageNumber,
        dimensions: { width: pi.width, height: pi.height },
        textLines,
        words,
        tables: [],
        selectionMarks,
        kvPairsWithValue: [],
      });

      console.log(
        `[Hybrid] Page ${page.pageNumber}: ` +
          `${textLines.length} lines, ${words.length} words, ` +
          `${selectionMarks.length} selection marks`,
      );
    }
  }

  // Process tables
  if (analyzeResult.tables) {
    for (const table of analyzeResult.tables) {
      // Find which page this table belongs to
      const firstCell = table.cells?.[0];
      const tablePageNum =
        firstCell?.boundingRegions?.[0]?.pageNumber || 1;
      const pi = pageInfoMap.get(tablePageNum) || {
        pageNumber: tablePageNum,
        width: PAGE_SIZES.A4.width,
        height: PAGE_SIZES.A4.height,
      };

      const cells: OcrTableCell[] = (table.cells || []).map(
        (c: any) => ({
          rowIndex: c.rowIndex,
          columnIndex: c.columnIndex,
          content: c.content || '',
          box: c.boundingRegions?.[0]?.polygon
            ? convertPolygonToBox(
                c.boundingRegions[0].polygon,
                pi,
              )
            : { x: 0, y: 0, width: 50, height: 20 },
          kind: c.kind,
        }),
      );

      const ocrPage = ocrPages.get(tablePageNum);
      if (ocrPage) {
        ocrPage.tables.push({
          rowCount: table.rowCount || 0,
          columnCount: table.columnCount || 0,
          cells,
        });
      }
    }

    console.log(
      `[Hybrid] Found ${analyzeResult.tables.length} tables`,
    );
  }

  // Process KV pairs with value regions
  if (analyzeResult.keyValuePairs) {
    for (const kv of analyzeResult.keyValuePairs) {
      if (!kv.value?.boundingRegions?.length) continue;
      if (!kv.key?.boundingRegions?.length) continue;

      const keyRegion = kv.key.boundingRegions[0];
      const valueRegion = kv.value.boundingRegions[0];
      const pi = pageInfoMap.get(keyRegion.pageNumber) || {
        pageNumber: keyRegion.pageNumber,
        width: PAGE_SIZES.A4.width,
        height: PAGE_SIZES.A4.height,
      };

      const ocrPage = ocrPages.get(keyRegion.pageNumber);
      if (ocrPage) {
        ocrPage.kvPairsWithValue.push({
          key: kv.key.content || '',
          keyBox: convertPolygonToBox(
            keyRegion.polygon || [],
            pi,
          ),
          valueBox: convertPolygonToBox(
            valueRegion.polygon || [],
            pi,
          ),
          confidence: kv.confidence || 0.8,
        });
      }
    }
  }

  return { ocrPages, raw: analyzeResult };
}

// ============================================================
// Phase 2: Gemini Visual Analysis
// ============================================================

function buildGeminiPrompt(ocrData: OcrPageData): string {
  // Build OCR text list for Gemini to reference
  const textList = ocrData.textLines
    .map((l, i) => `  [${i + 1}] "${l.content}"`)
    .join('\n');

  const tableInfo =
    ocrData.tables.length > 0
      ? ocrData.tables
          .map(
            (t, i) =>
              `  Table ${i + 1}: ${t.rowCount} rows x ${t.columnCount} cols`,
          )
          .join('\n')
      : '  (no tables detected)';

  const selectionInfo =
    ocrData.selectionMarks.length > 0
      ? `  ${ocrData.selectionMarks.length} selection marks (checkboxes/radio buttons)`
      : '  (no selection marks detected)';

  return `You are analyzing a Hebrew RTL form page. I have already extracted all text using OCR.
Your job is to identify WHAT form fields exist on this page — not WHERE they are.

OCR TEXT FOUND ON THIS PAGE:
${textList}

TABLES:
${tableInfo}

SELECTION MARKS:
${selectionInfo}

For EACH fillable form field you can see, provide:
1. "labelText": the exact Hebrew label text associated with this field
   - MUST match one of the OCR texts above (copy exactly)
   - For fields without labels, use a descriptive name
2. "fieldType": one of:
   - "underline" — fill field with underline (קו למילוי)
   - "box_with_title" — fill box with title below (קופסא + כותרת)
   - "digit_boxes" — boxes for individual digits (קופסאות ספרות)
   - "table_cell" — input cell within a table (תא בטבלה)
   - "title_right" — title on right with fill area to left (כותרת מימין)
   - "selection_mark" — checkbox or radio button (סימון בחירה)
3. "inputType": "text" | "checkbox" | "radio" | "signature" | "dropdown"
4. "section": logical section name (Hebrew)
5. "required": true/false

CRITICAL RULES:
- Identify EVERY fillable field on the page
- For digit boxes (phone, ID): count as ONE field with fieldType "digit_boxes"
- For table cells that expect user input: each is a separate field
- Selection marks (checkboxes/radio) should be identified with their nearby label text
- The form is in Hebrew (right-to-left). Labels are on the RIGHT side.
- Signature areas should have inputType: "signature"
- Return "totalFieldCount" with the total number of fields you identified

RETURN ONLY VALID JSON:
{
  "totalFieldCount": <number>,
  "fields": [
    {
      "labelText": "<exact OCR text>",
      "fieldType": "<type>",
      "inputType": "<type>",
      "section": "<section name>",
      "required": <true/false>
    }
  ]
}`;
}

async function runGeminiAnalysis(
  pdfBase64: string,
  ocrData: OcrPageData,
): Promise<GeminiPageResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const modelName = process.env.GEMINI_CHAT_MODEL || 'gemini-1.5-pro';
  const model = genAI.getGenerativeModel({ model: modelName });

  const prompt = buildGeminiPrompt(ocrData);

  console.log(
    `[Hybrid] Phase 2: Extracting page ${ocrData.pageNumber} for Gemini...`,
  );

  // Extract ONLY this specific page before sending to Gemini
  const singlePagePdf = await extractSinglePage(
    pdfBase64,
    ocrData.pageNumber,
  );

  console.log(
    `[Hybrid] Phase 2: Sending page ${ocrData.pageNumber} to Gemini...`,
  );

  const result = await model.generateContent([
    prompt,
    {
      inlineData: {
        mimeType: 'application/pdf',
        data: singlePagePdf,
      },
    },
  ]);

  let text = result.response.text().trim();

  // Clean markdown code blocks
  if (text.startsWith('```json')) {
    text = text.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (text.startsWith('```')) {
    text = text.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }

  // Extract JSON if mixed with text
  if (!text.startsWith('{')) {
    const match = text.match(/\{[\s\S]*"fields"[\s\S]*\}/);
    if (match) text = match[0];
  }

  try {
    const parsed = JSON.parse(text) as GeminiPageResult;
    console.log(
      `[Hybrid] Gemini identified ${parsed.totalFieldCount} fields ` +
        `(${parsed.fields.length} in detail)`,
    );
    return parsed;
  } catch (e) {
    console.error(
      '[Hybrid] Gemini JSON parse error:',
      text.substring(0, 200),
    );
    return { totalFieldCount: 0, fields: [] };
  }
}

// ============================================================
// Phase 3: Smart Matching & Positioning
// ============================================================

function findLabelInOcr(
  labelText: string,
  ocrData: OcrPageData,
): { line: OcrTextLine; word?: OcrWord } | null {
  // First try exact line match
  for (const line of ocrData.textLines) {
    const sim = hebrewTextSimilarity(labelText, line.content);
    if (sim >= 0.85) {
      return { line };
    }
  }

  // Try word-level match for multi-word labels on the same line
  for (const word of ocrData.words) {
    const sim = hebrewTextSimilarity(labelText, word.content);
    if (sim >= 0.85) {
      return { line: { content: word.content, box: word.box }, word };
    }
  }

  // Try partial match within longer lines
  for (const line of ocrData.textLines) {
    if (
      line.content.includes(labelText.replace(/:$/, '')) ||
      labelText.replace(/:$/, '').includes(line.content.replace(/:$/, ''))
    ) {
      return { line };
    }
  }

  return null;
}

/**
 * Get all labels on the same row (within Y tolerance)
 */
function getLabelsOnSameRow(
  labelBox: Box,
  allLabels: Array<{ box: Box }>,
  yTolerance: number = 8,
): Array<{ box: Box }> {
  return allLabels.filter(
    (l) => Math.abs(l.box.y - labelBox.y) < yTolerance,
  );
}

function positionFieldFromLabel(
  geminiField: GeminiField,
  labelBox: Box,
  pageInfo: PageInfo,
  allMatchedLabels: Array<{ box: Box }>,
): Box {
  const leftMargin = pageInfo.width * 0.05;
  const rightMargin = pageInfo.width * 0.95;
  const isRtl = isHebrewText(geminiField.labelText);

  switch (geminiField.fieldType) {
    case 'underline':
    case 'title_right': {
      // Input is to the LEFT of label (RTL)
      if (isRtl) {
        const sameRow = getLabelsOnSameRow(labelBox, allMatchedLabels);
        let leftBoundary = leftMargin;
        for (const other of sameRow) {
          const rightEdge = other.box.x + other.box.width;
          if (rightEdge < labelBox.x && rightEdge > leftBoundary) {
            leftBoundary = rightEdge + 5;
          }
        }
        const inputX = leftBoundary;
        const inputWidth = Math.max(
          labelBox.x - inputX - 3,
          50,
        );
        return {
          x: inputX,
          y: labelBox.y,
          width: inputWidth,
          height: 20,
        };
      }
      // LTR fallback
      const inputX = labelBox.x + labelBox.width + 5;
      return {
        x: inputX,
        y: labelBox.y,
        width: Math.min(rightMargin - inputX, 180),
        height: 20,
      };
    }

    case 'box_with_title': {
      // Input box is ABOVE the label (higher Y in PDF coords)
      const boxWidth = Math.max(labelBox.width * 1.5, 80);
      const boxX =
        labelBox.x + labelBox.width / 2 - boxWidth / 2;
      return {
        x: Math.max(leftMargin, boxX),
        y: labelBox.y + labelBox.height + 5,
        width: boxWidth,
        height: 35,
      };
    }

    case 'digit_boxes': {
      // Digit box group — position to the LEFT of label for RTL
      if (isRtl) {
        const boxWidth = Math.min(
          labelBox.x - leftMargin - 5,
          200,
        );
        return {
          x: Math.max(leftMargin, labelBox.x - boxWidth - 5),
          y: labelBox.y,
          width: boxWidth,
          height: 22,
        };
      }
      return {
        x: labelBox.x + labelBox.width + 5,
        y: labelBox.y,
        width: 200,
        height: 22,
      };
    }

    case 'table_cell': {
      // For table cells, use the label box directly
      // (it's usually the cell itself)
      return {
        x: labelBox.x,
        y: labelBox.y,
        width: Math.max(labelBox.width, 50),
        height: Math.max(labelBox.height, 18),
      };
    }

    case 'selection_mark': {
      // Selection marks are positioned by Azure
      return {
        x: labelBox.x,
        y: labelBox.y,
        width: 15,
        height: 15,
      };
    }

    default: {
      // Generic: input to left for RTL
      if (isRtl) {
        return {
          x: Math.max(leftMargin, labelBox.x - 150),
          y: labelBox.y,
          width: 140,
          height: 20,
        };
      }
      return {
        x: labelBox.x + labelBox.width + 5,
        y: labelBox.y,
        width: 140,
        height: 20,
      };
    }
  }
}

function matchAndPositionFields(
  geminiResult: GeminiPageResult,
  ocrData: OcrPageData,
  pageInfo: PageInfo,
): ExtractedField[] {
  const fields: ExtractedField[] = [];
  let fieldIndex = 0;
  let matchedCount = 0;
  let unmatchedCount = 0;

  // First pass: collect all label boxes for row-aware positioning
  const allMatchedLabels: Array<{ box: Box }> = [];
  const matchResults: Array<{
    geminiField: GeminiField;
    labelBox: Box | null;
    ocrMatch: OcrTextLine | null;
  }> = [];

  for (const gField of geminiResult.fields) {
    const ocrMatch = findLabelInOcr(gField.labelText, ocrData);
    if (ocrMatch) {
      allMatchedLabels.push({ box: ocrMatch.line.box });
      matchResults.push({
        geminiField: gField,
        labelBox: ocrMatch.line.box,
        ocrMatch: ocrMatch.line,
      });
    } else {
      matchResults.push({
        geminiField: gField,
        labelBox: null,
        ocrMatch: null,
      });
    }
  }

  // Second pass: position fields
  for (const { geminiField, labelBox, ocrMatch } of matchResults) {
    if (!labelBox) {
      unmatchedCount++;
      console.log(
        `[Hybrid] UNMATCHED: "${geminiField.labelText}" ` +
          `(${geminiField.fieldType}) — no OCR match`,
      );
      continue;
    }

    matchedCount++;

    // Handle selection marks specially
    if (geminiField.fieldType === 'selection_mark') {
      // Find nearest Azure selection mark
      const nearest = ocrData.selectionMarks.reduce(
        (best, mark) => {
          const dist =
            Math.abs(mark.box.x - labelBox.x) +
            Math.abs(mark.box.y - labelBox.y);
          return dist < best.dist
            ? { mark, dist }
            : best;
        },
        { mark: null as OcrSelectionMark | null, dist: Infinity },
      );

      if (nearest.mark) {
        const inputType =
          geminiField.inputType === 'radio' ? 'radio' : 'checkbox';
        fields.push({
          type: inputType,
          name: generateFieldName(
            geminiField.labelText,
            fieldIndex,
          ),
          label: geminiField.labelText,
          x: nearest.mark.box.x,
          y: nearest.mark.box.y,
          width: Math.max(nearest.mark.box.width, 15),
          height: Math.max(nearest.mark.box.height, 15),
          pageNumber: ocrData.pageNumber,
          direction: 'ltr',
          required: geminiField.required,
          confidence: nearest.mark.confidence,
          sectionName: geminiField.section,
          _source: 'azure_selection_mark',
        });
        fieldIndex++;
        continue;
      }
    }

    // Position input field based on type
    const inputBox = positionFieldFromLabel(
      geminiField,
      labelBox,
      { pageNumber: ocrData.pageNumber, ...ocrData.dimensions },
      allMatchedLabels,
    );

    // Determine field type
    let fieldType: ExtractedField['type'] = 'text';
    if (geminiField.inputType === 'checkbox') fieldType = 'checkbox';
    else if (geminiField.inputType === 'radio') fieldType = 'radio';
    else if (geminiField.inputType === 'signature')
      fieldType = 'signature';
    else if (geminiField.inputType === 'dropdown')
      fieldType = 'dropdown';

    const fieldName = generateFieldName(
      geminiField.labelText,
      fieldIndex,
    );

    console.log(
      `[Hybrid] "${geminiField.labelText}" (${geminiField.fieldType}) → ` +
        `${fieldType} at x=${inputBox.x.toFixed(1)}, ` +
        `y=${inputBox.y.toFixed(1)}, w=${inputBox.width.toFixed(1)}`,
    );

    fields.push({
      type: fieldType,
      name: fieldName,
      label: geminiField.labelText.replace(/:$/, ''),
      x: Math.round(inputBox.x * 100) / 100,
      y: Math.round(inputBox.y * 100) / 100,
      width: Math.round(inputBox.width * 100) / 100,
      height: Math.round(inputBox.height * 100) / 100,
      pageNumber: ocrData.pageNumber,
      direction: isHebrewText(geminiField.labelText)
        ? 'rtl'
        : 'ltr',
      required: geminiField.required,
      confidence: 0.8,
      sectionName: geminiField.section,
      _source: 'hybrid_matched',
    });
    fieldIndex++;
  }

  // Phase 3b: Add KV pairs with value regions that weren't already matched
  for (const kv of ocrData.kvPairsWithValue) {
    const alreadyMatched = fields.some(
      (f) =>
        Math.abs(f.x - kv.valueBox.x) < 20 &&
        Math.abs(f.y - kv.valueBox.y) < 10,
    );
    if (!alreadyMatched) {
      fields.push({
        type: 'text',
        name: generateFieldName(kv.key, fieldIndex),
        label: kv.key,
        x: kv.valueBox.x,
        y: kv.valueBox.y,
        width: kv.valueBox.width,
        height: kv.valueBox.height,
        pageNumber: ocrData.pageNumber,
        direction: isHebrewText(kv.key) ? 'rtl' : 'ltr',
        required: false,
        confidence: kv.confidence,
        _source: 'azure_kv_value',
      });
      fieldIndex++;
    }
  }

  // Phase 3c: Add unmatched selection marks
  for (const mark of ocrData.selectionMarks) {
    const alreadyAdded = fields.some(
      (f) =>
        f.type === 'checkbox' &&
        Math.abs(f.x - mark.box.x) < 10 &&
        Math.abs(f.y - mark.box.y) < 10,
    );
    if (!alreadyAdded) {
      fields.push({
        type: 'checkbox',
        name: `checkbox_${fieldIndex + 1}`,
        x: mark.box.x,
        y: mark.box.y,
        width: Math.max(mark.box.width, 15),
        height: Math.max(mark.box.height, 15),
        pageNumber: ocrData.pageNumber,
        direction: 'ltr',
        required: false,
        confidence: mark.confidence,
        _source: 'azure_selection_mark_unmatched',
      });
      fieldIndex++;
    }
  }

  console.log(
    `[Hybrid] Page ${ocrData.pageNumber}: ` +
      `${matchedCount} matched, ${unmatchedCount} unmatched, ` +
      `${fields.length} total fields`,
  );

  return fields;
}

// ============================================================
// Main Handler
// ============================================================

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Validate config
    const azureEndpoint =
      process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT;
    const azureKey =
      process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    if (!azureEndpoint || !azureKey) {
      return res.status(500).json({
        error: 'Azure Document Intelligence not configured',
      });
    }
    if (!geminiKey) {
      return res.status(500).json({
        error: 'Gemini API key not configured',
      });
    }

    const { pdfBase64 } = req.body;
    if (!pdfBase64) {
      return res.status(400).json({ error: 'Missing PDF data' });
    }

    // Extract page dimensions
    const pageInfoList = await extractPageDimensions(pdfBase64);
    const pageInfoMap = new Map<number, PageInfo>();
    for (const info of pageInfoList) {
      pageInfoMap.set(info.pageNumber, info);
    }

    console.log(
      `[Hybrid] Processing ${pageInfoList.length} page(s)`,
    );

    // Phase 1: Azure OCR
    const { ocrPages, raw: azureResult } = await runAzureOcr(
      pdfBase64,
      pageInfoMap,
    );

    // Phase 2 + 3: For each page, run Gemini analysis and match
    const allFields: ExtractedField[] = [];

    for (const [pageNum, ocrData] of ocrPages) {
      const pageInfo = pageInfoMap.get(pageNum) || {
        pageNumber: pageNum,
        width: PAGE_SIZES.A4.width,
        height: PAGE_SIZES.A4.height,
      };

      try {
        // Phase 2: Gemini analysis
        const geminiResult = await runGeminiAnalysis(
          pdfBase64,
          ocrData,
        );

        // Phase 3: Match and position
        const pageFields = matchAndPositionFields(
          geminiResult,
          ocrData,
          pageInfo,
        );
        allFields.push(...pageFields);

        // Phase 4: Gap detection
        const gap =
          geminiResult.totalFieldCount - pageFields.length;
        if (gap > 0) {
          console.warn(
            `[Hybrid] Page ${pageNum}: Gemini expected ` +
              `${geminiResult.totalFieldCount} fields, ` +
              `got ${pageFields.length} (${gap} gap)`,
          );
        }
      } catch (geminiError) {
        console.error(
          `[Hybrid] Gemini failed for page ${pageNum}:`,
          geminiError,
        );
        // Fallback: use Azure OCR text lines as labels
        console.log(
          `[Hybrid] Falling back to Azure-only for page ${pageNum}`,
        );
        // Simple fallback: create fields from label-like text
        for (const line of ocrData.textLines) {
          const content = line.content.trim();
          if (
            content.endsWith(':') ||
            content.endsWith('׃')
          ) {
            const isRtl = isHebrewText(content);
            const leftMargin = pageInfo.width * 0.05;
            const inputX = isRtl
              ? Math.max(leftMargin, line.box.x - 150)
              : line.box.x + line.box.width + 5;
            const inputWidth = isRtl
              ? line.box.x - inputX - 3
              : 140;

            allFields.push({
              type: 'text',
              name: generateFieldName(content, allFields.length),
              label: content.replace(/:$/, ''),
              x: inputX,
              y: line.box.y,
              width: Math.max(inputWidth, 50),
              height: 20,
              pageNumber: pageNum,
              direction: isRtl ? 'rtl' : 'ltr',
              required: false,
              confidence: 0.5,
              _source: 'azure_fallback',
            });
          }
        }
      }
    }

    // Generate stats
    const pageStats: Record<number, number> = {};
    allFields.forEach((f) => {
      pageStats[f.pageNumber] =
        (pageStats[f.pageNumber] || 0) + 1;
    });

    console.log(
      `[Hybrid] DONE: ${allFields.length} total fields across ` +
        `${pageInfoList.length} pages`,
    );
    console.log('[Hybrid] Fields per page:', pageStats);

    return res.status(200).json({
      fields: allFields,
      guidanceTexts: [],
      anchorPoints: [],
      formMetadata: {
        companyName: 'Unknown',
        formName: 'Document',
        confidence: 'medium',
      },
      pageDimensions: pageInfoList,
      stats: {
        totalFields: allFields.length,
        fieldsPerPage: pageStats,
        pageCount: pageInfoList.length,
      },
      _source: 'hybrid_azure_gemini',
      _debug: {
        approach: 'hybrid',
        azurePages: azureResult.pages?.length || 0,
        azureKvPairs: azureResult.keyValuePairs?.length || 0,
        azureTables: azureResult.tables?.length || 0,
        pagesProcessed: ocrPages.size,
      },
    });
  } catch (error) {
    console.error('[Hybrid] Error:', error);
    return res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : 'Hybrid extraction failed',
    });
  }
}
