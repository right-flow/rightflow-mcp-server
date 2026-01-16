import { FieldDefinition, PageMetadata, GuidanceText, FormMetadata } from '@/types/fields';
import { PDFDocument } from 'pdf-lib';
import { detectRadioGroups } from './fieldGrouping';
import { reindexFields } from './fieldSorting';

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
  options?: string[];
  sectionName?: string;
  radioGroup?: string;
  orientation?: 'horizontal' | 'vertical';
  buttonSpacing?: number; // Distance between radio/checkbox buttons (in points)
  buttonSize?: number;    // Size of individual radio/checkbox buttons (in points)
}

interface GeminiGuidanceResponse {
  id: string;
  content: string;
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PageExtractionResult {
  pageNumber: number;
  fields: GeminiFieldResponse[];
  guidanceTexts: GeminiGuidanceResponse[];
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
  pdfName: string,
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
  totalPages: number,
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
      let errorMessage = `Failed to process page ${pageNumber}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch {
        // If JSON parsing fails, try to get text
        try {
          const text = await response.text();
          errorMessage = text || `HTTP ${response.status}: ${response.statusText}`;
        } catch {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
      }
      console.error(`[API Error] Page ${pageNumber}:`, errorMessage);
      return {
        pageNumber,
        fields: [],
        guidanceTexts: [],
        error: errorMessage,
      };
    }

    const { fields, guidanceTexts } = await response.json();

    // Log radio fields received from API for debugging
    const radioFromApi = fields.filter((f: GeminiFieldResponse) => f.type === 'radio');
    if (radioFromApi.length > 0) {
      console.log(`[API Response] Page ${pageNumber}: ${radioFromApi.length} radio fields received:`);
      radioFromApi.forEach((f: GeminiFieldResponse, i: number) => {
        console.log(`  Radio ${i + 1}: name="${f.name}", label="${f.label}", options=${JSON.stringify(f.options)}`);
      });
    }

    // Update page numbers to match actual page in original document
    const fieldsWithCorrectPage = fields.map((f: GeminiFieldResponse) => ({
      ...f,
      pageNumber: pageNumber,
    }));

    const guidanceWithCorrectPage = (guidanceTexts || []).map((g: GeminiGuidanceResponse) => ({
      ...g,
      pageNumber: pageNumber,
    }));

    return {
      pageNumber,
      fields: fieldsWithCorrectPage,
      guidanceTexts: guidanceWithCorrectPage,
    };
  } catch (error) {
    return {
      pageNumber,
      fields: [],
      guidanceTexts: [],
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
  onProgress?: (status: string) => void,
): Promise<PageExtractionResult[]> {
  const results: PageExtractionResult[] = [];

  for (let batchStart = 0; batchStart < totalPages; batchStart += batchSize) {
    const batchEnd = Math.min(batchStart + batchSize, totalPages);
    const batchPageNumbers = Array.from(
      { length: batchEnd - batchStart },
      (_, i) => batchStart + i,
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
): Promise<{ fields: FieldDefinition[], metadata: PageMetadata[], formMetadata?: FormMetadata }> {
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
  let allGuidance: GeminiGuidanceResponse[] = [];
  let extractedFormMetadata: FormMetadata | undefined;

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

    const { fields, guidanceTexts, formMetadata } = await response.json();
    allFields = fields;
    allGuidance = guidanceTexts || [];
    extractedFormMetadata = formMetadata;
  } else {
    // Large document - process page by page
    onProgress?.(`מסמך גדול (${pageCount} עמודים) - מפצל לעמודים בודדים...`);

    const results = await processPagesInBatches(
      pdfDoc,
      pdfFile.name,
      pageCount,
      BATCH_SIZE,
      onProgress,
    );

    // Collect all fields and report errors
    const errors: string[] = [];
    for (const result of results) {
      if (result.error) {
        errors.push(`עמוד ${result.pageNumber}: ${result.error}`);
        console.warn(`[Page ${result.pageNumber}] Error:`, result.error);
      } else {
        allFields.push(...result.fields);
        allGuidance.push(...result.guidanceTexts);
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

  // Log radio fields before conversion for debugging
  const radioFieldsBeforeConvert = allFields.filter(f => f.type === 'radio');
  if (radioFieldsBeforeConvert.length > 0) {
    console.log(`[Pre-Convert] ${radioFieldsBeforeConvert.length} radio fields before FieldDefinition conversion:`);
    radioFieldsBeforeConvert.forEach((f, i) => {
      console.log(`  Radio ${i + 1}: name="${f.name}", label="${f.label}", options=${JSON.stringify(f.options)}, radioGroup="${f.radioGroup}"`);
    });
  }

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
      sectionName: gf.sectionName || 'כללי',
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
        // Use API options if available, otherwise use label as single option for later merging
        options: gf.options && gf.options.length > 0
          ? gf.options
          : (gf.label ? [gf.label] : ['אפשרות']),
        radioGroup: gf.radioGroup || `radio_group_${index + 1}`,
        spacing: 1,
        orientation: gf.orientation || 'horizontal', // Default to horizontal per design spec
        buttonSpacing: gf.buttonSpacing, // Precise spacing from AI detection
        buttonSize: gf.buttonSize, // Button size from AI detection
      }),
    }),
  );

  // Group fields by page to create metadata
  const metadata: PageMetadata[] = [];
  const guidanceByPage = new Map<number, GuidanceText[]>();

  allGuidance.forEach(g => {
    if (!guidanceByPage.has(g.pageNumber)) guidanceByPage.set(g.pageNumber, []);
    guidanceByPage.get(g.pageNumber)!.push(g);
  });

  const pageNumbers = Array.from(new Set(fields.map(f => f.pageNumber)));
  pageNumbers.forEach(pageNum => {
    const pageFields = fields.filter(f => f.pageNumber === pageNum);
    const sections = Array.from(new Set(pageFields.map(f => f.sectionName).filter(Boolean))) as string[];

    metadata.push({
      pageNumber: pageNum,
      sections: sections.map(name => ({
        name,
        y: Math.min(...pageFields.filter(f => f.sectionName === name).map(f => f.y)),
        height: 20, // Default height for section visualization
      })),
      guidanceTexts: guidanceByPage.get(pageNum) || [],
    });
  });

  // Apply post-processing
  const processedFields = detectRadioGroups(fields);
  const sortedFields = reindexFields(processedFields, 'rtl');

  onProgress?.(`הושלם! זוהו ${sortedFields.length} שדות מ-${pageCount} עמודים`);

  // Log form metadata if extracted
  if (extractedFormMetadata) {
    console.log('[AI Extraction] Form metadata:', extractedFormMetadata);
  }

  return { fields: sortedFields, metadata, formMetadata: extractedFormMetadata };
}

/**
 * Enhanced version that returns both fields and metadata
 */
export async function extractFieldsWithMetadata(
  pdfFile: File,
  onProgress?: (status: string) => void,
): Promise<{ fields: FieldDefinition[], metadata: PageMetadata[], formMetadata?: FormMetadata }> {
  return extractFieldsWithAI(pdfFile, onProgress);
}

/**
 * Clear the page cache (useful when switching PDFs)
 */
export function clearPageCache(): void {
  pageCache.clear();
  console.log('[Cache] Cleared page cache');
}

/**
 * Reprocess a single page from PDF and return extracted fields
 * Used to retry failed pages or update fields for a specific page
 *
 * @param pdfFile - The original PDF file
 * @param pageNumber - The page number to reprocess (1-indexed)
 * @param onProgress - Optional callback for progress updates
 * @returns Array of extracted field definitions for that page
 */
export async function reprocessSinglePage(
  pdfFile: File,
  pageNumber: number,
  onProgress?: (status: string) => void,
): Promise<{ fields: FieldDefinition[], metadata: PageMetadata | null }> {
  onProgress?.(`מעבד מחדש עמוד ${pageNumber}...`);

  // Load PDF document
  const arrayBuffer = await pdfFile.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const totalPages = pdfDoc.getPageCount();

  if (pageNumber < 1 || pageNumber > totalPages) {
    throw new Error(`מספר עמוד לא תקין: ${pageNumber}. יש ${totalPages} עמודים במסמך.`);
  }

  // Clear cache for this specific page to force re-extraction
  const cacheKey = getCacheKey(pdfFile.name, pageNumber);
  pageCache.delete(cacheKey);
  console.log(`[Reprocess] Cleared cache for page ${pageNumber}`);

  // Extract and process the single page
  const pageBase64 = await extractPageAsBase64(pdfDoc, pageNumber - 1, pdfFile.name);
  const result = await processPageWithAI(pageBase64, pageNumber, totalPages);

  if (result.error) {
    throw new Error(`שגיאה בעיבוד עמוד ${pageNumber}: ${result.error}`);
  }

  onProgress?.(`עיבוד ${result.fields.length} שדות מעמוד ${pageNumber}...`);

  // Convert to FieldDefinition[]
  const fields: FieldDefinition[] = result.fields.map(
    (gf: GeminiFieldResponse, index: number) => ({
      id: crypto.randomUUID(),
      type: gf.type,
      pageNumber: gf.pageNumber,
      x: gf.x,
      y: gf.y,
      width: gf.width,
      height: gf.height,
      name: gf.name || `field_p${pageNumber}_${index + 1}`,
      label: gf.label,
      required: gf.required,
      direction: gf.direction,
      sectionName: gf.sectionName || 'כללי',
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
        // Use API options if available, otherwise use label as single option for later merging
        options: gf.options && gf.options.length > 0
          ? gf.options
          : (gf.label ? [gf.label] : ['אפשרות']),
        radioGroup: gf.radioGroup || `radio_group_p${pageNumber}_${index + 1}`,
        spacing: 1,
        orientation: gf.orientation || 'horizontal', // Default to horizontal per design spec
        buttonSpacing: gf.buttonSpacing, // Precise spacing from AI detection
        buttonSize: gf.buttonSize, // Button size from AI detection
      }),
    }),
  );

  // Create metadata for this page
  let metadata: PageMetadata | null = null;
  if (fields.length > 0) {
    const sections = Array.from(new Set(fields.map(f => f.sectionName).filter(Boolean))) as string[];
    const guidanceTexts: GuidanceText[] = result.guidanceTexts.map(g => ({
      id: g.id,
      content: g.content,
      pageNumber: g.pageNumber,
      x: g.x,
      y: g.y,
      width: g.width,
      height: g.height,
    }));

    metadata = {
      pageNumber,
      sections: sections.map(name => ({
        name,
        y: Math.min(...fields.filter(f => f.sectionName === name).map(f => f.y)),
        height: 20,
      })),
      guidanceTexts,
    };
  }

  // Apply post-processing
  const processedFields = detectRadioGroups(fields);

  onProgress?.(`הושלם! זוהו ${processedFields.length} שדות מעמוד ${pageNumber}`);
  console.log(`[Reprocess] Page ${pageNumber}: ${processedFields.length} fields extracted`);

  return { fields: processedFields, metadata };
}
