/**
 * Gemini HTML Generation Client
 * Client-side wrapper for calling the generate-html API endpoint
 */

import type { FieldDefinition } from '@/types/fields';
import type {
  HtmlGenerationOptions,
  GeneratedHtmlResult,
  HtmlGenerationResponse,
} from './types';
import {
  mapFieldsToHtml,
  createFieldGroups,
  detectFormDirection,
} from './field-mapper';

/**
 * API endpoint URL for HTML generation
 */
const API_ENDPOINT = '/api/generate-html';

/**
 * Generates HTML form using Gemini AI via the API endpoint
 */
export async function generateHtmlWithGemini(
  fields: FieldDefinition[],
  options: Partial<HtmlGenerationOptions> = {},
): Promise<GeneratedHtmlResult> {
  // Prepare data for API
  const htmlFields = mapFieldsToHtml(fields);
  const groups = createFieldGroups(fields);
  const rtl = options.rtl ?? detectFormDirection(fields) === 'rtl';

  const requestBody = {
    fields: htmlFields,
    groups,
    options: {
      formTitle: options.formTitle || 'טופס',
      formDescription: options.formDescription,
      language: options.language || (rtl ? 'hebrew' : 'english'),
      rtl,
      theme: options.theme || {
        primaryColor: '#003399',
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        spacing: 'normal',
        style: 'modern',
      },
      includeValidation: options.includeValidation ?? true,
    },
  };

  const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || `API request failed with status ${response.status}`,
    );
  }

  const data: HtmlGenerationResponse = await response.json();

  if (!data.success || !data.data) {
    throw new Error(data.error || 'Failed to generate HTML');
  }

  return data.data;
}
