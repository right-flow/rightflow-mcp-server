/**
 * Response Service (Phase 3)
 * Handles form response submissions, retrieval, and export
 */

import { getDb } from '../../lib/db';
import crypto from 'crypto';
import { UsageService } from '../billing/usage.service';

export interface SubmitResponseParams {
  formId: string;
  data: Record<string, any>;
  submitterIp?: string;
  submitterUserAgent?: string;
}

export interface Response {
  id: string;
  formId: string;
  data: Record<string, any>;
  filledPdfPath?: string | null;
  submitterIp?: string | null;
  submitterUserAgent?: string | null;
  metadata: Record<string, any>;
  submittedAt: Date;
}

export class ResponsesService {
  private usageService: UsageService;

  constructor() {
    this.usageService = new UsageService();
  }

  /**
   * Submit a form response
   * Validates required fields, sanitizes input, and tracks usage
   */
  async submitResponse(params: SubmitResponseParams): Promise<Response> {
    const db = getDb();

    // Get the form to validate against
    const form = await db('forms')
      .where({ id: params.formId })
      .whereNull('deleted_at')
      .first();

    if (!form) {
      throw new Error('Form not found');
    }

    // Parse form fields
    const fields = typeof form.fields === 'string' ? JSON.parse(form.fields) : form.fields;

    // Validate required fields
    for (const field of fields) {
      if (field.required && !params.data[field.id]) {
        throw new Error(`Missing required field: ${field.label}`);
      }
    }

    // Sanitize HTML in text fields
    const sanitizedData = this.sanitizeData(params.data);

    // Create response record
    const responseId = crypto.randomUUID();
    const responseRecord = {
      id: responseId,
      form_id: params.formId,
      data: JSON.stringify(sanitizedData),
      filled_pdf_path: null,
      submitter_ip: params.submitterIp || null,
      submitter_user_agent: params.submitterUserAgent || null,
      metadata: JSON.stringify({}),
      submitted_at: new Date(),
    };

    await db('responses').insert(responseRecord);

    // Increment response count for the form owner
    await this.usageService.incrementResponsesCount(form.user_id);

    // Return the created response
    return {
      id: responseId,
      formId: params.formId,
      data: sanitizedData,
      filledPdfPath: null,
      submitterIp: params.submitterIp || null,
      submitterUserAgent: params.submitterUserAgent || null,
      metadata: {},
      submittedAt: responseRecord.submitted_at,
    };
  }

  /**
   * Get a single response by ID
   */
  async getResponse(responseId: string): Promise<Response> {
    const db = getDb();

    const response = await db('responses')
      .where({ id: responseId })
      .first();

    if (!response) {
      throw new Error('Response not found');
    }

    return this.parseResponseRecord(response);
  }

  /**
   * Get all responses for a form
   * Ordered by submitted_at DESC (most recent first)
   */
  async getFormResponses(formId: string): Promise<Response[]> {
    const db = getDb();

    const responses = await db('responses')
      .where({ form_id: formId })
      .orderBy('submitted_at', 'desc');

    return responses.map(r => this.parseResponseRecord(r));
  }

  /**
   * Delete a response
   * Decrements the user's response count
   */
  async deleteResponse(responseId: string): Promise<void> {
    const db = getDb();

    // Get the response to find the form owner
    const response = await db('responses')
      .where({ id: responseId })
      .first();

    if (!response) {
      return; // Already deleted or doesn't exist
    }

    // Get the form to find the owner
    const form = await db('forms')
      .where({ id: response.form_id })
      .first();

    // Delete the response
    await db('responses')
      .where({ id: responseId })
      .del();

    // Decrement response count for the form owner
    if (form) {
      await this.usageService.decrementResponsesCount(form.user_id);
    }
  }

  /**
   * Export responses in specified format
   * Supports JSON and CSV formats
   */
  async exportResponses(formId: string, format: 'json' | 'csv'): Promise<string> {
    const responses = await this.getFormResponses(formId);

    if (format === 'json') {
      return this.exportAsJson(responses);
    } else if (format === 'csv') {
      return this.exportAsCsv(responses, formId);
    }

    throw new Error(`Unsupported export format: ${format}`);
  }

  /**
   * Export responses as JSON
   */
  private exportAsJson(responses: Response[]): string {
    const data = responses.map(r => r.data);
    return JSON.stringify(data, null, 2);
  }

  /**
   * Export responses as CSV
   * Follows RFC 4180 standard: values are wrapped in quotes and internal quotes are escaped
   */
  private async exportAsCsv(responses: Response[], formId: string): Promise<string> {
    if (responses.length === 0) {
      return '';
    }

    const db = getDb();

    // Get form to extract field labels
    const form = await db('forms')
      .where({ id: formId })
      .first();

    const fields = form ? (typeof form.fields === 'string' ? JSON.parse(form.fields) : form.fields) : [];

    // Create CSV headers from field labels (wrapped in quotes for consistency)
    const headers = fields.map((f: any) => `"${String(f.label).replace(/"/g, '""')}"`).join(',');

    // Create CSV rows
    const rows = responses.map(response => {
      return fields.map((field: any) => {
        const value = response.data[field.id] || '';
        // Escape quotes by doubling them, then wrap in quotes (RFC 4180)
        const escaped = String(value).replace(/"/g, '""');
        return `"${escaped}"`;
      }).join(',');
    });

    return [headers, ...rows].join('\n');
  }

  /**
   * Sanitize data to prevent XSS attacks
   * Removes ALL HTML tags and dangerous characters
   * Since this is form data, we don't need to preserve any HTML
   */
  private sanitizeData(data: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        let cleaned = value;

        // Step 1: Remove ALL HTML tags (script, img, iframe, object, embed, etc.)
        // This prevents: <img src=x onerror="alert(1)"> and similar attacks
        cleaned = cleaned.replace(/<[^>]*>/g, '');

        // Step 2: Remove any remaining angle brackets that might form partial tags
        // This prevents: <script without closing tag
        cleaned = cleaned.replace(/[<>]/g, '');

        // Step 3: Remove javascript: protocol and data: URIs
        // This prevents: javascript:alert(1) and data:text/html,<script>...
        cleaned = cleaned.replace(/javascript:/gi, '');
        cleaned = cleaned.replace(/data:text\/html/gi, '');

        // Step 4: Remove dangerous Unicode control characters (RTL marks can hide malicious code)
        // This prevents: RTL override attacks that hide malicious content
        cleaned = cleaned.replace(/[\u202A-\u202E\u2066-\u2069]/g, '');

        // Step 5: Remove NULL bytes and other control characters
        cleaned = cleaned.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');

        sanitized[key] = cleaned;
      } else if (typeof value === 'object' && value !== null) {
        // Recursively sanitize nested objects and arrays
        sanitized[key] = this.sanitizeData(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Parse response record from database
   * Handles malformed JSON gracefully to prevent crashes
   */
  private parseResponseRecord(dbResponse: any): Response {
    let data: Record<string, any>;
    let metadata: Record<string, any>;

    // Parse data field with error handling
    if (typeof dbResponse.data === 'string') {
      try {
        data = JSON.parse(dbResponse.data);
      } catch (error) {
        console.error(`Failed to parse response data for ID ${dbResponse.id}:`, error);
        // Return empty object as fallback for malformed data
        data = {};
      }
    } else {
      data = dbResponse.data || {};
    }

    // Parse metadata field with error handling
    if (typeof dbResponse.metadata === 'string') {
      try {
        metadata = JSON.parse(dbResponse.metadata);
      } catch (error) {
        console.error(`Failed to parse response metadata for ID ${dbResponse.id}:`, error);
        // Return empty object as fallback for malformed metadata
        metadata = {};
      }
    } else {
      metadata = dbResponse.metadata || {};
    }

    return {
      id: dbResponse.id,
      formId: dbResponse.form_id,
      data,
      filledPdfPath: dbResponse.filled_pdf_path,
      submitterIp: dbResponse.submitter_ip,
      submitterUserAgent: dbResponse.submitter_user_agent,
      metadata,
      submittedAt: new Date(dbResponse.submitted_at),
    };
  }
}

// Export singleton instance
export const responsesService = new ResponsesService();
