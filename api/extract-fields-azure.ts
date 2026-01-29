/**
 * Azure Document Intelligence Field Extraction API
 *
 * Alternative to Gemini-based extraction with better accuracy for form fields.
 * Uses Azure's prebuilt-layout model which is specifically designed for form detection.
 *
 * Key advantages:
 * - Accurate bounding box detection for form fields
 * - Native support for RTL languages
 * - Better distinction between labels and input areas
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import DocumentIntelligence, {
  AnalyzeResultOutput,
  DocumentFieldOutput,
  DocumentTableOutput,
  getLongRunningPoller,
  isUnexpected,
} from '@azure-rest/ai-document-intelligence';
import { AzureKeyCredential } from '@azure/core-auth';
import { PDFDocument } from 'pdf-lib';

/**
 * Standard PDF page sizes in points (1 point = 1/72 inch)
 */
const PAGE_SIZES = {
  A4: { width: 595, height: 842 },
  LETTER: { width: 612, height: 792 },
};

interface PageInfo {
  pageNumber: number;
  width: number;  // in PDF points (1/72 inch)
  height: number; // in PDF points (1/72 inch)
  unit: 'point' | 'pixel';
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
  // Debug info
  _boundingRegion?: number[];
  _pageWidth?: number;
  _pageHeight?: number;
}

/**
 * Extract page dimensions from PDF
 */
async function extractPageDimensions(pdfBase64: string): Promise<PageInfo[]> {
  try {
    const pdfBytes = Buffer.from(pdfBase64, 'base64');
    const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const pages = pdfDoc.getPages();

    return pages.map((page, index) => {
      const { width, height } = page.getSize();
      const rotation = page.getRotation().angle;

      const effectiveWidth = rotation === 90 || rotation === 270 ? height : width;
      const effectiveHeight = rotation === 90 || rotation === 270 ? width : height;

      console.log(`[Azure DI DEBUG] Page ${index + 1}: ${effectiveWidth}x${effectiveHeight} points (${(effectiveWidth / 72).toFixed(2)}x${(effectiveHeight / 72).toFixed(2)} inches, rotation=${rotation}°)`);

      return {
        pageNumber: index + 1,
        width: effectiveWidth,
        height: effectiveHeight,
        unit: 'point' as const, // pdf-lib returns points (1/72 inch)
      };
    });
  } catch (error) {
    console.warn('[Azure DI] Could not extract page dimensions:', error);
    return [{ pageNumber: 1, width: PAGE_SIZES.A4.width, height: PAGE_SIZES.A4.height, unit: 'point' }];
  }
}

/**
 * Convert Azure bounding polygon to PDF coordinates
 *
 * Azure returns: [x1, y1, x2, y2, x3, y3, x4, y4] in inches (for PDF)
 * clockwise from top-left: TL, TR, BR, BL
 *
 * We need: x, y (bottom-left origin), width, height in PDF points
 */
function convertBoundingPolygon(
  polygon: number[],
  pageInfo: PageInfo,
): { x: number; y: number; width: number; height: number } {
  if (!polygon || polygon.length < 8) {
    return { x: 0, y: 0, width: 50, height: 20 };
  }

  // Polygon points: [x1,y1, x2,y2, x3,y3, x4,y4]
  // Order: top-left, top-right, bottom-right, bottom-left
  const [tlX, tlY, trX, trY, brX, brY, blX, blY] = polygon;

  // Convert inches to points (72 points per inch)
  const POINTS_PER_INCH = 72;

  const xMin = Math.min(tlX, blX) * POINTS_PER_INCH;
  const xMax = Math.max(trX, brX) * POINTS_PER_INCH;
  const yMin = Math.min(tlY, trY) * POINTS_PER_INCH; // Top of box (distance from page top)
  const yMax = Math.max(blY, brY) * POINTS_PER_INCH; // Bottom of box

  const width = xMax - xMin;
  const height = yMax - yMin;

  // Convert Y from top-origin to PDF bottom-origin
  // PDF: y=0 at bottom, Azure: y=0 at top
  const pdfY = pageInfo.height - yMax;

  return {
    x: Math.round(xMin * 100) / 100,
    y: Math.round(pdfY * 100) / 100,
    width: Math.round(width * 100) / 100,
    height: Math.round(height * 100) / 100,
  };
}

/**
 * Detect if text contains Hebrew characters
 */
function isHebrewText(text: string): boolean {
  return /[\u0590-\u05FF]/.test(text);
}

/**
 * Generate a field name from label text
 */
function generateFieldName(label: string, index: number): string {
  // Simple transliteration and cleaning for common Hebrew labels
  const hebrewToEnglish: Record<string, string> = {
    'שם': 'name',
    'שם מלא': 'full_name',
    'שם פרטי': 'first_name',
    'שם משפחה': 'last_name',
    'כתובת': 'address',
    'עיר': 'city',
    'טלפון': 'phone',
    'נייד': 'mobile',
    'דוא"ל': 'email',
    'פקס': 'fax',
    'ת.ז': 'id_number',
    'תעודת זהות': 'id_number',
    'מספר': 'number',
    'תאריך': 'date',
    'חתימה': 'signature',
    'מיקוד': 'zip_code',
    'רחוב': 'street',
  };

  const cleanLabel = label.trim().replace(/[:\s]+$/, '');

  for (const [hebrew, english] of Object.entries(hebrewToEnglish)) {
    if (cleanLabel.includes(hebrew)) {
      return english;
    }
  }

  // Fallback: use index-based name
  return `field_${index + 1}`;
}

/**
 * Check if a text line looks like a form label
 * Hebrew form labels typically end with ":" or are known field names
 */
function isLabelText(text: string): boolean {
  const trimmed = text.trim();
  // Ends with colon (Hebrew or English)
  if (trimmed.endsWith(':') || trimmed.endsWith('׃')) return true;
  // Known Hebrew label patterns (without colon)
  const knownLabels = [
    'שם', 'שם פרטי', 'שם משפחה', 'שם מלא', 'שם הלקוח', 'שם הסוכן',
    'כתובת', 'כתובת העסק', 'כתובת מגורים',
    'עיר', 'מיקוד', 'רחוב',
    'טלפון', 'נייד', 'פקס', 'דוא"ל', 'אימייל',
    'ת.ז', 'ת.ז.', 'תעודת זהות', 'מספר זהות',
    'תאריך', 'חתימה', 'איש קשר',
    'הערות', 'הערה', 'פרטים', 'תיאור',
    'ענף', 'סוג', 'מספר', 'מס\'',
    'חשבון', 'בנק', 'סניף',
    'משפחה', 'פרטי',
  ];
  for (const label of knownLabels) {
    if (trimmed === label || trimmed.startsWith(label + ' ')) return true;
  }
  return false;
}

/**
 * Determine field type from label text
 */
function getFieldTypeFromLabel(label: string): ExtractedField['type'] {
  const lower = label.trim().replace(/:$/, '');
  if (lower.includes('חתימה')) return 'signature';
  if (lower.includes('תאריך')) return 'text'; // Date is still text input
  return 'text';
}

/**
 * Create an input field positioned relative to a label
 * For RTL Hebrew forms: input area is to the LEFT of the label
 */
function createFieldFromLabel(
  labelText: string,
  labelBox: { x: number; y: number; width: number; height: number },
  pageInfo: PageInfo,
  fieldIndex: number,
  allLabelsOnRow: Array<{ x: number; width: number }>,
): ExtractedField {
  const isRtl = isHebrewText(labelText);
  const leftMargin = pageInfo.width * 0.05;
  const rightMargin = pageInfo.width * 0.95;
  const fieldType = getFieldTypeFromLabel(labelText);
  const fieldHeight = fieldType === 'signature' ? 30 : 20;

  let inputX: number;
  let inputWidth: number;

  if (isRtl) {
    // RTL: input is to the LEFT of the label
    // Find the nearest element to the left (another label or left margin)
    let leftBoundary = leftMargin;
    for (const other of allLabelsOnRow) {
      // Other label's right edge (x + width) could be our left boundary
      const otherRightEdge = other.x + other.width;
      if (otherRightEdge < labelBox.x && otherRightEdge > leftBoundary) {
        leftBoundary = otherRightEdge + 5; // 5pt gap
      }
    }

    inputX = leftBoundary;
    inputWidth = labelBox.x - inputX - 3;
    // Ensure minimum width
    if (inputWidth < 50) {
      inputX = Math.max(leftMargin, labelBox.x - 120);
      inputWidth = labelBox.x - inputX - 3;
    }
  } else {
    // LTR: input is to the RIGHT of the label
    inputX = labelBox.x + labelBox.width + 5;
    let rightBoundary = rightMargin;
    for (const other of allLabelsOnRow) {
      if (other.x > inputX && other.x < rightBoundary) {
        rightBoundary = other.x - 5;
      }
    }
    inputWidth = rightBoundary - inputX;
    if (inputWidth < 50) inputWidth = 120;
  }

  return {
    type: fieldType,
    name: generateFieldName(labelText, fieldIndex),
    label: labelText.trim().replace(/:$/, ''),
    x: Math.round(inputX * 100) / 100,
    y: Math.round(labelBox.y * 100) / 100,
    width: Math.round(Math.max(inputWidth, 50) * 100) / 100,
    height: fieldHeight,
    pageNumber: 0, // Will be set by caller
    direction: isRtl ? 'rtl' : 'ltr',
    required: false,
    confidence: 0.7,
    _pageWidth: pageInfo.width,
    _pageHeight: pageInfo.height,
  };
}

/**
 * Process Azure Document Intelligence results into our field format
 *
 * Strategy: Use text lines (OCR) to find labels, then create input fields.
 * This is more reliable than keyValuePairs for Hebrew underline-based forms.
 */
function processAzureResults(
  result: AnalyzeResultOutput,
  pageInfoMap: Map<number, PageInfo>,
): ExtractedField[] {
  const fields: ExtractedField[] = [];
  let fieldIndex = 0;

  console.log(`[Azure DI] Processing results...`);

  // Track which Y positions already have fields (to avoid duplicates)
  const fieldPositions = new Set<string>();
  const posKey = (pageNum: number, x: number, y: number) =>
    `${pageNum}_${Math.round(x / 10)}_${Math.round(y / 5)}`;

  // === PHASE 1: Process key-value pairs WITH value regions (highest quality) ===
  if (result.keyValuePairs && result.keyValuePairs.length > 0) {
    console.log(`[Azure DI] Found ${result.keyValuePairs.length} key-value pairs`);

    for (const kvPair of result.keyValuePairs) {
      const key = kvPair.key;
      const value = kvPair.value;

      // Only use KV pairs that have actual value bounding regions
      if (!value?.boundingRegions?.length) continue;

      const valueRegion = value.boundingRegions[0];
      const pageInfo = pageInfoMap.get(valueRegion.pageNumber) || {
        pageNumber: valueRegion.pageNumber,
        width: PAGE_SIZES.A4.width,
        height: PAGE_SIZES.A4.height,
        unit: 'point' as const,
      };

      const valueBox = convertBoundingPolygon(
        valueRegion.polygon || [],
        pageInfo,
      );

      console.log(
        `[Azure DI] KV with value: "${key?.content}" → ` +
        `x=${valueBox.x.toFixed(1)}, y=${valueBox.y.toFixed(1)}, ` +
        `w=${valueBox.width.toFixed(1)}, h=${valueBox.height.toFixed(1)}`,
      );

      const pk = posKey(valueRegion.pageNumber, valueBox.x, valueBox.y);
      fieldPositions.add(pk);

      fields.push({
        type: 'text',
        name: generateFieldName(key?.content || '', fieldIndex),
        label: key?.content,
        x: valueBox.x,
        y: valueBox.y,
        width: valueBox.width,
        height: valueBox.height,
        pageNumber: valueRegion.pageNumber,
        direction: isHebrewText(key?.content || '') ? 'rtl' : 'ltr',
        required: false,
        confidence: kvPair.confidence || 0.8,
        _boundingRegion: valueRegion.polygon,
        _pageWidth: pageInfo.width,
        _pageHeight: pageInfo.height,
      });
      fieldIndex++;
    }
    console.log(
      `[Azure DI] Phase 1 (KV with value): ${fields.length} fields`,
    );
  }

  // === PHASE 2: Scan ALL text lines to find labels and create fields ===
  if (result.pages) {
    for (const page of result.pages) {
      const pageNumber = page.pageNumber;
      const pageInfo = pageInfoMap.get(pageNumber) || {
        pageNumber,
        width: PAGE_SIZES.A4.width,
        height: PAGE_SIZES.A4.height,
        unit: 'point' as const,
      };

      if (!page.lines || page.lines.length === 0) {
        console.log(
          `[Azure DI] Page ${pageNumber}: No text lines found`,
        );
        continue;
      }

      console.log(
        `[Azure DI] Page ${pageNumber}: Scanning ${page.lines.length} ` +
        `text lines for labels`,
      );

      // First pass: identify all labels and their positions
      interface LabelInfo {
        text: string;
        box: { x: number; y: number; width: number; height: number };
        lineIndex: number;
      }
      const labels: LabelInfo[] = [];

      for (let i = 0; i < page.lines.length; i++) {
        const line = page.lines[i];
        const content = line.content?.trim();
        if (!content) continue;

        // Check if this line (or parts of it) is a label
        if (!line.polygon || line.polygon.length < 8) continue;

        const lineBox = convertBoundingPolygon(line.polygon, pageInfo);

        // Check if the entire line is a label
        if (isLabelText(content)) {
          labels.push({ text: content, box: lineBox, lineIndex: i });
          continue;
        }

        // Check if the line contains multiple labels separated by spaces
        // Common in Hebrew forms: "שם הסוכן:     מס׳ הסוכן:"
        // Use words within the line for finer-grained detection
        if (page.words) {
          const lineWords = page.words.filter((w: any) => {
            if (!w.polygon || w.polygon.length < 8) return false;
            const wBox = convertBoundingPolygon(w.polygon, pageInfo);
            // Word belongs to this line if Y overlaps
            return (
              Math.abs(wBox.y - lineBox.y) < lineBox.height * 1.5 &&
              wBox.x >= lineBox.x - 2 &&
              wBox.x <= lineBox.x + lineBox.width + 2
            );
          });

          // Look for colon-ending words (label terminators)
          let labelBuffer = '';
          let labelStartX = 0;
          let labelStartY = 0;
          let labelMaxX = 0;

          for (const word of lineWords) {
            const wordContent = word.content?.trim();
            if (!wordContent) continue;
            const wBox = convertBoundingPolygon(word.polygon, pageInfo);

            if (!labelBuffer) {
              labelStartX = wBox.x;
              labelStartY = wBox.y;
            }
            labelBuffer += (labelBuffer ? ' ' : '') + wordContent;
            labelMaxX = wBox.x + wBox.width;

            if (
              wordContent.endsWith(':') ||
              wordContent.endsWith('׃') ||
              isLabelText(labelBuffer)
            ) {
              const labelWidth = labelMaxX - labelStartX;
              labels.push({
                text: labelBuffer,
                box: {
                  x: labelStartX,
                  y: labelStartY,
                  width: labelWidth,
                  height: lineBox.height,
                },
                lineIndex: i,
              });
              labelBuffer = '';
            }
          }
        }
      }

      console.log(
        `[Azure DI] Page ${pageNumber}: Found ${labels.length} labels`,
      );

      // Group labels by Y position (same row)
      const rowTolerance = 8; // points
      const rows: LabelInfo[][] = [];
      const usedLabels = new Set<number>();

      for (let i = 0; i < labels.length; i++) {
        if (usedLabels.has(i)) continue;
        const row: LabelInfo[] = [labels[i]];
        usedLabels.add(i);

        for (let j = i + 1; j < labels.length; j++) {
          if (usedLabels.has(j)) continue;
          if (Math.abs(labels[j].box.y - labels[i].box.y) < rowTolerance) {
            row.push(labels[j]);
            usedLabels.add(j);
          }
        }
        // Sort row by X position (right to left for RTL)
        row.sort((a, b) => b.box.x - a.box.x);
        rows.push(row);
      }

      // Create fields for each label
      for (const row of rows) {
        const allLabelsOnRow = row.map((l) => ({
          x: l.box.x,
          width: l.box.width,
        }));

        for (const label of row) {
          // Skip if we already have a field at this position (from KV pairs)
          const pk = posKey(pageNumber, label.box.x, label.box.y);
          // Check nearby positions too (within tolerance)
          let alreadyExists = false;
          for (const existing of fieldPositions) {
            const [ep, ex, ey] = existing.split('_').map(Number);
            if (
              ep === pageNumber &&
              Math.abs(ex - Math.round(label.box.x / 10)) <= 2 &&
              Math.abs(ey - Math.round(label.box.y / 5)) <= 2
            ) {
              alreadyExists = true;
              break;
            }
          }
          if (alreadyExists) {
            console.log(
              `[Azure DI] Skipping "${label.text}" - already covered`,
            );
            continue;
          }

          const field = createFieldFromLabel(
            label.text,
            label.box,
            pageInfo,
            fieldIndex,
            allLabelsOnRow,
          );
          field.pageNumber = pageNumber;

          const fieldPk = posKey(pageNumber, field.x, field.y);
          fieldPositions.add(fieldPk);

          console.log(
            `[Azure DI] Label→Field: "${label.text}" → ` +
            `input at x=${field.x.toFixed(1)}, y=${field.y.toFixed(1)}, ` +
            `w=${field.width.toFixed(1)}`,
          );

          fields.push(field);
          fieldIndex++;
        }
      }
    }

    console.log(
      `[Azure DI] Phase 2 (text line labels): ${fields.length} total fields`,
    );
  }

  // === PHASE 3: Process selection marks (checkboxes, radio buttons) ===
  if (result.pages) {
    for (const page of result.pages) {
      const pageNumber = page.pageNumber;
      const pageInfo = pageInfoMap.get(pageNumber) || {
        pageNumber,
        width: PAGE_SIZES.A4.width,
        height: PAGE_SIZES.A4.height,
        unit: 'point' as const,
      };

      if (page.selectionMarks && page.selectionMarks.length > 0) {
        console.log(
          `[Azure DI] Found ${page.selectionMarks.length} selection ` +
          `marks on page ${pageNumber}`,
        );

        for (const mark of page.selectionMarks) {
          if (!mark.polygon || mark.polygon.length < 8) continue;

          const box = convertBoundingPolygon(mark.polygon, pageInfo);

          fields.push({
            type: 'checkbox',
            name: `checkbox_${fieldIndex + 1}`,
            x: box.x,
            y: box.y,
            width: Math.max(box.width, 15),
            height: Math.max(box.height, 15),
            pageNumber,
            direction: 'ltr',
            required: false,
            confidence: mark.confidence || 0.8,
            _boundingRegion: mark.polygon,
            _pageWidth: pageInfo.width,
            _pageHeight: pageInfo.height,
          });
          fieldIndex++;
        }
      }
    }
  }

  // === PHASE 4: Process tables for empty cells (potential fields) ===
  if (result.tables && result.tables.length > 0) {
    console.log(`[Azure DI] Found ${result.tables.length} tables`);
  }

  console.log(`[Azure DI] Total fields extracted: ${fields.length}`);
  return fields;
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
    const endpoint = process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT;
    const apiKey = process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY;

    if (!endpoint || !apiKey) {
      return res.status(500).json({
        error: 'Azure Document Intelligence not configured. Set AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT and AZURE_DOCUMENT_INTELLIGENCE_KEY in environment variables.',
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
    console.log(`[Azure DI] Extracted dimensions for ${pageInfoList.length} page(s)`);

    // Create Azure Document Intelligence client
    const client = DocumentIntelligence(endpoint, new AzureKeyCredential(apiKey));

    console.log('[Azure DI] Sending request to Azure...');

    // Analyze document with prebuilt-layout model
    // Enable keyValuePairs to detect form fields
    const initialResponse = await client
      .path('/documentModels/{modelId}:analyze', 'prebuilt-layout')
      .post({
        contentType: 'application/json',
        body: {
          base64Source: pdfBase64,
        },
        queryParameters: {
          features: ['keyValuePairs'], // Enable form field detection
        },
      });

    if (isUnexpected(initialResponse)) {
      console.error('[Azure DI] Error:', initialResponse.body);
      throw new Error(`Azure API error: ${JSON.stringify(initialResponse.body)}`);
    }

    // Poll for completion
    const poller = getLongRunningPoller(client, initialResponse);
    const result = await poller.pollUntilDone();

    if (isUnexpected(result)) {
      throw new Error(`Azure analysis failed: ${JSON.stringify(result.body)}`);
    }

    // Type assertion for the result body
    const resultBody = result.body as { analyzeResult?: AnalyzeResultOutput };
    const analyzeResult = resultBody.analyzeResult;
    if (!analyzeResult) {
      throw new Error('No analysis result returned from Azure');
    }

    console.log('[Azure DI] Analysis complete');
    console.log(`[Azure DI] Pages: ${analyzeResult.pages?.length || 0}`);
    console.log(`[Azure DI] Key-Value Pairs: ${analyzeResult.keyValuePairs?.length || 0}`);
    console.log(`[Azure DI] Tables: ${analyzeResult.tables?.length || 0}`);

    // Log Azure-reported page dimensions vs pdf-lib dimensions
    if (analyzeResult.pages) {
      for (const azurePage of analyzeResult.pages) {
        const pdfLibPage = pageInfoMap.get(azurePage.pageNumber);
        console.log(`[Azure DI DEBUG] Azure page ${azurePage.pageNumber}: ${azurePage.width}x${azurePage.height} ${azurePage.unit}`);
        if (pdfLibPage) {
          console.log(`[Azure DI DEBUG] pdf-lib page ${azurePage.pageNumber}: ${pdfLibPage.width}x${pdfLibPage.height} points`);
        }
      }
    }

    // Log KV pair details
    const kvWithValue = analyzeResult.keyValuePairs?.filter(kv => kv.value?.boundingRegions?.length) || [];
    const kvWithoutValue = analyzeResult.keyValuePairs?.filter(kv => !kv.value?.boundingRegions?.length) || [];
    console.log(`[Azure DI DEBUG] KV pairs WITH value region: ${kvWithValue.length}`);
    console.log(`[Azure DI DEBUG] KV pairs WITHOUT value region: ${kvWithoutValue.length}`);

    // Log text line counts per page
    if (analyzeResult.pages) {
      for (const p of analyzeResult.pages) {
        console.log(`[Azure DI DEBUG] Page ${p.pageNumber}: ${p.lines?.length || 0} text lines, ${p.words?.length || 0} words`);
      }
    }

    // Process results into our field format
    const fields = processAzureResults(analyzeResult, pageInfoMap);

    // Generate page stats
    const pageStats: Record<number, number> = {};
    fields.forEach(f => {
      pageStats[f.pageNumber] = (pageStats[f.pageNumber] || 0) + 1;
    });

    return res.status(200).json({
      fields,
      guidanceTexts: [],
      anchorPoints: [],
      formMetadata: {
        companyName: 'Unknown',
        formName: 'Document',
        confidence: 'medium',
      },
      pageDimensions: pageInfoList,
      stats: {
        totalFields: fields.length,
        fieldsPerPage: pageStats,
        pageCount: pageInfoList.length,
      },
      _source: 'azure_document_intelligence',
      _model: 'prebuilt-layout',
      _debug: {
        pdfLibPageDimensions: pageInfoList.map(p => ({
          page: p.pageNumber,
          width: p.width,
          height: p.height,
          unit: 'points',
        })),
        azurePageInfo: analyzeResult.pages?.map(p => ({
          pageNumber: p.pageNumber,
          width: p.width,
          height: p.height,
          unit: p.unit,
          lineCount: p.lines?.length || 0,
          wordCount: p.words?.length || 0,
        })),
        kvPairCount: analyzeResult.keyValuePairs?.length || 0,
        kvPairsWithValue: kvWithValue.length,
        kvPairsWithoutValue: kvWithoutValue.length,
        approach: 'text-line-scanning',
      },
    });
  } catch (error) {
    console.error('[Azure DI] Error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Azure Document Intelligence extraction failed',
    });
  }
}
