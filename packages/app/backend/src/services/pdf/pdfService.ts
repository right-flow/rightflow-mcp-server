/**
 * PDF Service
 * Handles PDF generation for workflow actions
 */

import { PDFDocument } from 'pdf-lib';
import logger from '../../utils/logger';

// ── Types ─────────────────────────────────────────────────────────

export interface GeneratePDFInput {
  templateId: string;
  data: Record<string, unknown>;
  outputName?: string;
}

export interface PDFGenerationResult {
  buffer: Buffer;
  filename: string;
  pageCount: number;
}

// ── PDF Generation ────────────────────────────────────────────────

/**
 * Generate a PDF from a template and form data
 */
export async function generatePDF(input: GeneratePDFInput): Promise<Buffer> {
  const { templateId, data, outputName } = input;

  logger.info('Generating PDF', {
    templateId,
    outputName,
    dataKeys: Object.keys(data),
  });

  try {
    // Create a new PDF document
    // In a real implementation, this would load a template and fill it
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();

    // Add basic content (placeholder implementation)
    page.drawText(`Generated PDF for template: ${templateId}`, {
      x: 50,
      y: page.getHeight() - 50,
      size: 14,
    });

    page.drawText(`Output: ${outputName || 'document.pdf'}`, {
      x: 50,
      y: page.getHeight() - 80,
      size: 12,
    });

    // Serialize the PDF to bytes
    const pdfBytes = await pdfDoc.save();

    logger.info('PDF generated successfully', {
      templateId,
      outputName,
      size: pdfBytes.length,
    });

    return Buffer.from(pdfBytes);
  } catch (error) {
    logger.error('PDF generation failed', {
      templateId,
      error: (error as Error).message,
    });
    throw error;
  }
}

/**
 * Fill a PDF form with data
 */
export async function fillPDFForm(
  pdfBuffer: Buffer,
  formData: Record<string, string>
): Promise<Buffer> {
  try {
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const form = pdfDoc.getForm();

    // Fill each field with corresponding data
    for (const [fieldName, value] of Object.entries(formData)) {
      try {
        const field = form.getTextField(fieldName);
        if (field) {
          field.setText(value);
        }
      } catch {
        // Field not found, skip
        logger.debug(`PDF form field not found: ${fieldName}`);
      }
    }

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  } catch (error) {
    logger.error('PDF form filling failed', {
      error: (error as Error).message,
    });
    throw error;
  }
}

export default {
  generatePDF,
  fillPDFForm,
};
