import { FieldDefinition } from '@/types/fields';
import { PDFDocument } from 'pdf-lib';

interface GeminiFieldResponse {
  type: 'text' | 'checkbox' | 'radio' | 'dropdown' | 'signature';
  x: number;
  y: number;
  width: number;
  height: number;
  pageNumber: number;
  label?: string;
  name: string;
  required: boolean;
  direction: 'ltr' | 'rtl';
}

interface PageExtractionResult {
  pageNumber: number;
  fields: GeminiFieldResponse[];
  error?: string;
}

// Cache for PDF pages as base64
const pageCache = new Map<string, string>();

/**
 * Generate cache key for a PDF page
 */
function getCacheKey(pdfName: string, pageNumber: number): string {
  return `${pdfName}_page_${pageNumber}`;
}

/**
 * Convert ArrayBuffer to base64 string in chunks to avoid stack overflow
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 8192;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

/**
 * Extract a single page from PDF and convert to base64
 */
async function extractPageAsBase64(
  pdfDoc: PDFDocument,
  pageIndex: number,
  pdfName: string
): Promise<string> {
  const cacheKey = getCacheKey(pdfName, pageIndex + 1);

  // Check cache first
  if (pageCache.has(cacheKey)) {
    console.log(`[Cache] Using cached page ${pageIndex + 1}`);
    return pageCache.get(cacheKey)!;
  }

  // Create a new PDF with just this page
  const singlePagePdf = await PDFDocument.create();
  const [copiedPage] = await singlePagePdf.copyPages(pdfDoc, [pageIndex]);
  singlePagePdf.addPage(copiedPage);

  // Save to bytes and convert to base64
  const pdfBytes = await singlePagePdf.save();
  const base64 = arrayBufferToBase64(pdfBytes.buffer as ArrayBuffer);

  // Cache the result
  pageCache.set(cacheKey, base64);
  console.log(`[Cache] Cached page ${pageIndex + 1}`);

  return base64;
}

/**
 * Process a single page with AI
 */
async function processPageWithAI(
  pageBase64: string,
  pageNumber: number,
  totalPages: number
): Promise<PageExtractionResult> {
  try {
    const response = await fetch('/api/extract-fields', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pdfBase64: pageBase64,
        pageCount: 1,
        currentPage: pageNumber,
        totalPages: totalPages,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      return {
        pageNumber,
        fields: [],
        error: error.error || `Failed to process page ${pageNumber}`,
      };
    }

    const { fields } = await response.json();

    // Update page numbers to match actual page in original document
    const fieldsWithCorrectPage = fields.map((f: GeminiFieldResponse) => ({
      ...f,
      pageNumber: pageNumber,
    }));

    return {
      pageNumber,
      fields: fieldsWithCorrectPage,
    };
  } catch (error) {
    return {
      pageNumber,
      fields: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Process pages in batches with concurrency limit
 */
async function processPagesInBatches(
  pdfDoc: PDFDocument,
  pdfName: string,
  totalPages: number,
  batchSize: number,
  onProgress?: (status: string) => void
): Promise<PageExtractionResult[]> {
  const results: PageExtractionResult[] = [];

  for (let batchStart = 0; batchStart < totalPages; batchStart += batchSize) {
    const batchEnd = Math.min(batchStart + batchSize, totalPages);
    const batchPageNumbers = Array.from(
      { length: batchEnd - batchStart },
      (_, i) => batchStart + i
    );

    onProgress?.(`מעבד עמודים ${batchStart + 1}-${batchEnd} מתוך ${totalPages}...`);

    // Extract pages and process in parallel within the batch
    const batchPromises = batchPageNumbers.map(async (pageIndex) => {
      const pageBase64 = await extractPageAsBase64(pdfDoc, pageIndex, pdfName);
      return processPageWithAI(pageBase64, pageIndex + 1, totalPages);
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    // Log progress
    const successCount = batchResults.filter(r => !r.error).length;
    const fieldCount = batchResults.reduce((sum, r) => sum + r.fields.length, 0);
    console.log(`[Batch ${Math.floor(batchStart / batchSize) + 1}] Processed ${successCount}/${batchResults.length} pages, found ${fieldCount} fields`);
  }

  return results;
}

/**
 * Extract form fields from a PDF using Gemini AI
 * Splits large PDFs into individual pages for better accuracy
 *
 * @param pdfFile - The PDF file to analyze
 * @param onProgress - Optional callback for progress updates
 * @returns Array of extracted field definitions
 */
export async function extractFieldsWithAI(
  pdfFile: File,
  onProgress?: (status: string) => void,
): Promise<FieldDefinition[]> {
  onProgress?.('טוען מסמך PDF...');

  // Load PDF document
  const arrayBuffer = await pdfFile.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const pageCount = pdfDoc.getPageCount();

  console.log(`[AI Extraction] PDF "${pdfFile.name}" has ${pageCount} pages`);

  // Configuration
  const PAGE_THRESHOLD = 3; // Process page-by-page if more than this
  const BATCH_SIZE = 3; // Process up to 3 pages in parallel

  let allFields: GeminiFieldResponse[] = [];

  if (pageCount <= PAGE_THRESHOLD) {
    // Small document - process entire PDF at once
    onProgress?.(`שולח מסמך שלם (${pageCount} עמודים) לניתוח...`);

    const base64 = arrayBufferToBase64(arrayBuffer);
    const response = await fetch('/api/extract-fields', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pdfBase64: base64,
        pageCount: pageCount,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || 'AI extraction failed');
    }

    const { fields } = await response.json();
    allFields = fields;
  } else {
    // Large document - process page by page
    onProgress?.(`מסמך גדול (${pageCount} עמודים) - מפצל לעמודים בודדים...`);

    const results = await processPagesInBatches(
      pdfDoc,
      pdfFile.name,
      pageCount,
      BATCH_SIZE,
      onProgress
    );

    // Collect all fields and report errors
    const errors: string[] = [];
    for (const result of results) {
      if (result.error) {
        errors.push(`עמוד ${result.pageNumber}: ${result.error}`);
        console.warn(`[Page ${result.pageNumber}] Error:`, result.error);
      } else {
        allFields.push(...result.fields);
      }
    }

    if (errors.length > 0 && allFields.length === 0) {
      throw new Error(`כל העמודים נכשלו:\n${errors.join('\n')}`);
    }

    // Log summary
    const fieldsPerPage: Record<number, number> = {};
    allFields.forEach(f => {
      fieldsPerPage[f.pageNumber] = (fieldsPerPage[f.pageNumber] || 0) + 1;
    });
    console.log('[AI Extraction] Fields per page:', fieldsPerPage);
  }

  onProgress?.(`עיבוד ${allFields.length} שדות שזוהו...`);

  // Convert to FieldDefinition[]
  const fields: FieldDefinition[] = allFields.map(
    (gf: GeminiFieldResponse, index: number) => ({
      id: crypto.randomUUID(),
      type: gf.type,
      pageNumber: gf.pageNumber,
      x: gf.x,
      y: gf.y,
      width: gf.width,
      height: gf.height,
      name: gf.name || `field_${index + 1}`,
      label: gf.label,
      required: gf.required,
      direction: gf.direction,
      sectionName: 'כללי',
      autoFill: false,
      index: index,
      ...(gf.type === 'text' && {
        font: 'NotoSansHebrew',
        fontSize: 12,
      }),
      ...(gf.type === 'dropdown' && {
        options: ['אפשרות 1', 'אפשרות 2', 'אפשרות 3'],
      }),
      ...(gf.type === 'radio' && {
        options: ['אפשרות 1', 'אפשרות 2'],
        radioGroup: gf.name || `radio_group_${index + 1}`,
        spacing: 25,
        orientation: 'vertical' as const,
      }),
    }),
  );

  onProgress?.(`הושלם! זוהו ${fields.length} שדות מ-${pageCount} עמודים`);
  return fields;
}

/**
 * Clear the page cache (useful when switching PDFs)
 */
export function clearPageCache(): void {
  pageCache.clear();
  console.log('[Cache] Cleared page cache');
}
