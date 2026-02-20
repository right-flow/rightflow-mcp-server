/**
 * MCP (Model Context Protocol) API Routes
 *
 * These endpoints provide the backend API for the Cowork MCP Connector.
 * They can also be used directly as a REST API for Hebrew PDF generation.
 *
 * Endpoints:
 * - GET  /api/v1/mcp/templates - List available templates
 * - GET  /api/v1/mcp/templates/:id - Get template details
 * - GET  /api/v1/mcp/templates/:id/fields - Get template field definitions
 * - POST /api/v1/mcp/fill - Fill a PDF template with data
 * - POST /api/v1/mcp/batch - Batch fill multiple PDFs
 *
 * @module routes/v1/mcp
 */

import express, { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticateMcpApiKey, requireMcpPermission } from '../../middleware/mcp-auth';
import { query } from '../../config/database';
import { validateRequest } from '../../utils/validation';
import {
  ValidationError,
  NotFoundError,
} from '../../utils/errors';
import logger from '../../utils/logger';
import {
  fillPdfForm,
  generateFillablePdf,
  generateSimplePdf,
  validateHebrewFontSetup,
  sanitizeHebrewInput,
  validateIsraeliId,
  containsHebrew,
} from '../../services/pdf/hebrewPdfService';
import { localStorage } from '../../services/storage/localStorageProvider';

const router = express.Router();

// ✅ Apply MCP API Key authentication to all MCP routes
// This ensures organization status is checked before allowing access
router.use(authenticateMcpApiKey);

// ============================================================================
// Validation Schemas
// ============================================================================

const listTemplatesSchema = z.object({
  category: z.string().optional(),
  search: z.string().optional(),
  language: z.enum(['he', 'en']).default('he'),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

const fillPdfSchema = z.object({
  template_id: z.string().uuid(),
  data: z.record(z.unknown()),
  output_format: z.enum(['url', 'base64', 'buffer']).default('url'),
  file_name: z.string().max(200).optional(),
  language: z.enum(['he', 'en']).default('he'),
});

const batchFillSchema = z.object({
  template_id: z.string().uuid(),
  data_array: z.array(z.record(z.unknown())).min(1).max(100),
  output_format: z.enum(['zip', 'urls']).default('urls'),
  naming_pattern: z.string().optional(),
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Validate and sanitize field data based on field definitions
 */
function validateFieldData(
  data: Record<string, unknown>,
  fields: Array<{ id: string; type: string; required?: boolean; validation?: Record<string, unknown> }>
): { valid: boolean; errors: string[]; sanitizedData: Record<string, unknown> } {
  const errors: string[] = [];
  const sanitizedData: Record<string, unknown> = {};

  for (const field of fields) {
    const value = data[field.id];

    // Check required fields
    if (field.required && (value === undefined || value === null || value === '')) {
      errors.push(`Missing required field: ${field.id}`);
      continue;
    }

    if (value === undefined || value === null) {
      continue;
    }

    // Sanitize and validate based on type
    switch (field.type) {
      case 'text':
      case 'textarea':
        if (typeof value === 'string') {
          sanitizedData[field.id] = sanitizeHebrewInput(value);
        } else {
          errors.push(`Field ${field.id} must be a string`);
        }
        break;

      case 'number':
      case 'currency':
        if (typeof value === 'number' || (typeof value === 'string' && !isNaN(Number(value)))) {
          sanitizedData[field.id] = Number(value);
        } else {
          errors.push(`Field ${field.id} must be a number`);
        }
        break;

      case 'date':
        if (typeof value === 'string') {
          const date = new Date(value);
          if (isNaN(date.getTime())) {
            errors.push(`Field ${field.id} must be a valid date`);
          } else {
            sanitizedData[field.id] = date.toISOString().split('T')[0];
          }
        } else {
          errors.push(`Field ${field.id} must be a date string`);
        }
        break;

      case 'checkbox':
        sanitizedData[field.id] = Boolean(value);
        break;

      default:
        // For unknown types, just sanitize if string
        if (typeof value === 'string') {
          sanitizedData[field.id] = sanitizeHebrewInput(value);
        } else {
          sanitizedData[field.id] = value;
        }
    }

    // Apply custom validation rules
    if (field.validation) {
      const val = sanitizedData[field.id];

      if (field.validation.custom === 'israeli_id' && typeof val === 'string') {
        if (!validateIsraeliId(val)) {
          errors.push(`Field ${field.id}: Invalid Israeli ID number`);
        }
      }

      if (field.validation.min_length && typeof val === 'string') {
        if (val.length < (field.validation.min_length as number)) {
          errors.push(`Field ${field.id}: Minimum length is ${field.validation.min_length}`);
        }
      }

      if (field.validation.max_length && typeof val === 'string') {
        if (val.length > (field.validation.max_length as number)) {
          errors.push(`Field ${field.id}: Maximum length is ${field.validation.max_length}`);
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitizedData,
  };
}

// ============================================================================
// Routes
// ============================================================================

/**
 * GET /api/v1/mcp/health
 * Check MCP service health including Hebrew font setup
 */
router.get('/health', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const fontStatus = await validateHebrewFontSetup();

    res.json({
      status: fontStatus.success ? 'healthy' : 'degraded',
      service: 'mcp',
      hebrew_font: fontStatus,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/mcp/templates
 * List available PDF templates
 */
router.get('/templates', requireMcpPermission('templates.read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const params = listTemplatesSchema.parse(req.query);
    const { category, search, language, limit, offset } = params;

    // Build query conditions
    const conditions: string[] = ['deleted_at IS NULL', 'is_active = true'];
    const queryParams: (string | number)[] = [];
    let paramIndex = 1;

    if (category) {
      conditions.push(`category = $${paramIndex++}`);
      queryParams.push(category);
    }

    if (search) {
      conditions.push(`(name ILIKE $${paramIndex} OR name_he ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    // Count total
    const countResult = await query(
      `SELECT COUNT(*) as total FROM mcp_templates WHERE ${conditions.join(' AND ')}`,
      queryParams
    );
    const total = parseInt(countResult[0]?.total || '0', 10);

    // Fetch templates
    queryParams.push(limit, offset);
    const templates = await query(
      `
      SELECT
        id,
        name,
        name_he,
        description,
        description_he,
        category,
        language,
        version,
        fill_count,
        jsonb_array_length(fields) as field_count,
        created_at,
        updated_at
      FROM mcp_templates
      WHERE ${conditions.join(' AND ')}
      ORDER BY fill_count DESC, name ASC
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
      `,
      queryParams
    );

    // Format response based on language preference
    const formattedTemplates = templates.map((t: Record<string, unknown>) => ({
      id: t.id,
      name: language === 'he' && t.name_he ? t.name_he : t.name,
      name_en: t.name,
      name_he: t.name_he,
      description: language === 'he' && t.description_he ? t.description_he : t.description,
      category: t.category,
      field_count: t.field_count,
      language: t.language,
      version: t.version,
      usage_count: t.fill_count,
    }));

    res.json({
      success: true,
      data: {
        templates: formattedTemplates,
        pagination: {
          total,
          limit,
          offset,
          has_more: offset + limit < total,
        },
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: {
          code: 2000,
          message: 'Invalid request parameters',
          details: error.errors,
        },
      });
    }
    next(error);
  }
});

/**
 * GET /api/v1/mcp/templates/:id
 * Get specific template details
 */
router.get('/templates/:id', requireMcpPermission('templates.read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const language = (req.query.language as string) || 'he';

    const result = await query(
      `
      SELECT
        id,
        name,
        name_he,
        description,
        description_he,
        category,
        language,
        version,
        fields,
        crm_mappings,
        erp_mappings,
        supported_crms,
        supported_erps,
        fill_count,
        created_at,
        updated_at
      FROM mcp_templates
      WHERE id = $1 AND deleted_at IS NULL
      `,
      [id]
    );

    if (result.length === 0) {
      throw new NotFoundError('Template not found');
    }

    const template = result[0];

    res.json({
      success: true,
      data: {
        id: template.id,
        name: language === 'he' && template.name_he ? template.name_he : template.name,
        name_en: template.name,
        name_he: template.name_he,
        description: language === 'he' && template.description_he ? template.description_he : template.description,
        category: template.category,
        language: template.language,
        version: template.version,
        fields: template.fields,
        integrations: {
          crm_mappings: template.crm_mappings,
          erp_mappings: template.erp_mappings,
          supported_crms: template.supported_crms,
          supported_erps: template.supported_erps,
        },
        usage_count: template.fill_count,
        created_at: template.created_at,
        updated_at: template.updated_at,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/mcp/templates/:id/fields
 * Get template field definitions for form building
 */
router.get('/templates/:id/fields', requireMcpPermission('templates.read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const language = (req.query.language as string) || 'he';

    const result = await query(
      `
      SELECT
        id,
        name,
        name_he,
        fields
      FROM mcp_templates
      WHERE id = $1 AND deleted_at IS NULL
      `,
      [id]
    );

    if (result.length === 0) {
      throw new NotFoundError('Template not found');
    }

    const template = result[0];
    const fields = template.fields || [];

    // Format fields with localized labels
    const formattedFields = fields.map((field: Record<string, unknown>) => ({
      id: field.id,
      name: field.name,
      label: language === 'he' && field.label_he ? field.label_he : field.label,
      label_en: field.label,
      label_he: field.label_he,
      type: field.type,
      required: field.required || false,
      validation: field.validation,
      placeholder: language === 'he' && field.placeholder_he ? field.placeholder_he : field.placeholder,
      default_value: field.default_value,
      options: field.options,
      crm_mapping: field.crm_mapping,
    }));

    res.json({
      success: true,
      data: {
        template_id: template.id,
        template_name: language === 'he' && template.name_he ? template.name_he : template.name,
        fields: formattedFields,
        field_count: formattedFields.length,
        required_fields: formattedFields.filter((f: { required: boolean }) => f.required).map((f: { id: string }) => f.id),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/mcp/fill
 * Fill a PDF template with provided data
 */
router.post('/fill', requireMcpPermission('fill'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const startTime = Date.now();
    const params = fillPdfSchema.parse(req.body);
    const { template_id, data, output_format, file_name, language } = params;

    // Get template
    const templateResult = await query(
      `
      SELECT
        id,
        name,
        name_he,
        s3_key,
        s3_bucket,
        fields
      FROM mcp_templates
      WHERE id = $1 AND deleted_at IS NULL AND is_active = true
      `,
      [template_id]
    );

    if (templateResult.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 2001,
          message: 'Template not found',
          message_he: 'התבנית לא נמצאה',
        },
      });
    }

    const template = templateResult[0];
    const fields = template.fields || [];

    // Validate and sanitize input data
    const validation = validateFieldData(data, fields);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 2002,
          message: 'Invalid field data',
          message_he: 'נתוני שדות לא תקינים',
          details: validation.errors,
        },
      });
    }

    // Generate PDF from scratch (no template)
    const pdfResult = await generateSimplePdf(
      fields,
      validation.sanitizedData,
      {
        language,
        title: template.name,
        title_he: template.name_he,
      }
    );

    if (!pdfResult.success || !pdfResult.pdfBuffer) {
      return res.status(500).json({
        success: false,
        error: {
          code: 2003,
          message: 'PDF generation failed',
          message_he: 'יצירת PDF נכשלה',
          details: pdfResult.error,
        },
      });
    }

    // Save to local storage
    const fileName = file_name || `${template.name}_${Date.now()}.pdf`;
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Organization ID not found',
        },
      });
    }

    const storedFile = await localStorage.save(
      organizationId,
      fileName,
      pdfResult.pdfBuffer,
      'application/pdf',
      24 * 60 * 60 // 24 hours TTL
    );

    const generationTime = Date.now() - startTime;

    // Log the fill operation
    logger.info('MCP PDF generated successfully', {
      template_id,
      field_count: Object.keys(validation.sanitizedData).length,
      language,
      file_size: storedFile.size,
      generation_time_ms: generationTime,
    });

    // Increment template usage counter
    await query(
      `UPDATE mcp_templates SET fill_count = fill_count + 1, last_used_at = NOW() WHERE id = $1`,
      [template_id]
    );

    // Return response based on output format
    const responseData: Record<string, unknown> = {
      template_id,
      template_name: language === 'he' && template.name_he ? template.name_he : template.name,
      fields_filled: Object.keys(validation.sanitizedData).length,
      output_format,
      generation_time_ms: generationTime,
      file_url: storedFile.url,
      file_path: storedFile.path,
      file_size: storedFile.size,
      expires_at: storedFile.expiresAt?.toISOString(),
    };

    // Include base64 if requested
    if (output_format === 'base64' || output_format === 'buffer') {
      responseData.file_base64 = pdfResult.pdfBuffer.toString('base64');
    }

    res.json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: {
          code: 2000,
          message: 'Invalid request parameters',
          message_he: 'פרמטרי בקשה לא תקינים',
          details: error.errors,
        },
      });
    }
    next(error);
  }
});

/**
 * POST /api/v1/mcp/batch
 * Batch fill multiple PDFs from an array of data
 */
router.post('/batch', requireMcpPermission('batch'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const startTime = Date.now();
    const params = batchFillSchema.parse(req.body);
    const { template_id, data_array, output_format, naming_pattern } = params;

    // Get template
    const templateResult = await query(
      `
      SELECT id, name, name_he, fields
      FROM mcp_templates
      WHERE id = $1 AND deleted_at IS NULL AND is_active = true
      `,
      [template_id]
    );

    if (templateResult.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 2001,
          message: 'Template not found',
          message_he: 'התבנית לא נמצאה',
        },
      });
    }

    const template = templateResult[0];
    const fields = template.fields || [];

    // Validate all data entries
    const results: Array<{
      index: number;
      success: boolean;
      error?: string;
    }> = [];

    for (let i = 0; i < data_array.length; i++) {
      const validation = validateFieldData(data_array[i], fields);
      results.push({
        index: i,
        success: validation.valid,
        error: validation.valid ? undefined : validation.errors.join(', '),
      });
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;
    const generationTime = Date.now() - startTime;

    logger.info('MCP batch fill requested', {
      template_id,
      total: data_array.length,
      success_count: successCount,
      failure_count: failureCount,
      generation_time_ms: generationTime,
    });

    // TODO: Create batch job record and process asynchronously
    res.json({
      success: true,
      data: {
        message: 'Batch processing endpoint ready - async processing pending',
        template_id,
        total: data_array.length,
        validated: successCount,
        failed_validation: failureCount,
        output_format,
        validation_results: results.filter(r => !r.success), // Only return failures
        generation_time_ms: generationTime,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: {
          code: 2000,
          message: 'Invalid request parameters',
          message_he: 'פרמטרי בקשה לא תקינים',
          details: error.errors,
        },
      });
    }
    next(error);
  }
});

/**
 * GET /api/v1/mcp/files/:organizationId/:fileName
 * Serve generated PDF files
 */
router.get('/files/:organizationId/:fileName', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId, fileName } = req.params;
    const userOrgId = req.user?.organizationId;

    // Security: Verify user belongs to the organization
    if (organizationId !== userOrgId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 2004,
          message: 'Access denied',
          message_he: 'גישה נדחתה',
        },
      });
    }

    // Security: Sanitize filename to prevent HTTP header injection
    // Remove newlines, carriage returns, and limit to safe filename characters
    const sanitizedFileName = fileName
      .replace(/[\r\n]/g, '') // Remove newlines and carriage returns
      .replace(/[^a-zA-Z0-9_\-\.]/g, '_') // Replace unsafe characters with underscore
      .substring(0, 200); // Limit filename length

    // Get file from storage
    const filePath = `${organizationId}/generated/${fileName}`;
    const fileBuffer = await localStorage.get(organizationId, filePath);

    // Set headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${sanitizedFileName}"`);
    res.setHeader('Cache-Control', 'private, max-age=3600');

    res.send(fileBuffer);
  } catch (error) {
    if (error instanceof Error && error.message === 'File not found') {
      return res.status(404).json({
        success: false,
        error: {
          code: 2005,
          message: 'File not found',
          message_he: 'קובץ לא נמצא',
        },
      });
    }
    next(error);
  }
});

/**
 * GET /api/v1/mcp/categories
 * List available template categories
 */
router.get('/categories', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await query(
      `
      SELECT
        category,
        COUNT(*) as template_count
      FROM mcp_templates
      WHERE deleted_at IS NULL AND is_active = true
      GROUP BY category
      ORDER BY template_count DESC
      `
    );

    const categories = [
      { id: 'legal', name: 'Legal', name_he: 'משפטי', count: 0 },
      { id: 'accounting', name: 'Accounting', name_he: 'הנהלת חשבונות', count: 0 },
      { id: 'hr', name: 'HR', name_he: 'משאבי אנוש', count: 0 },
      { id: 'real_estate', name: 'Real Estate', name_he: 'נדל"ן', count: 0 },
      { id: 'general', name: 'General', name_he: 'כללי', count: 0 },
    ];

    // Update counts from database
    for (const row of result) {
      const cat = categories.find(c => c.id === row.category);
      if (cat) {
        cat.count = parseInt(row.template_count, 10);
      }
    }

    res.json({
      success: true,
      data: {
        categories: categories.filter(c => c.count > 0 || ['legal', 'accounting', 'hr', 'real_estate', 'general'].includes(c.id)),
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
