#!/usr/bin/env node
/**
 * RightFlow MCP Server
 *
 * Model Context Protocol server for Hebrew PDF generation.
 * Connects Claude Code to RightFlow's Hebrew PDF API.
 *
 * @see https://modelcontextprotocol.io
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import axios, { AxiosInstance } from 'axios';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration
const API_BASE_URL = process.env.RIGHTFLOW_API_URL || 'http://localhost:3003/api/v1';
const API_KEY = process.env.RIGHTFLOW_API_KEY;

if (!API_KEY) {
  console.error('ERROR: RIGHTFLOW_API_KEY environment variable is required');
  process.exit(1);
}

// API Client
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
  },
  timeout: 60000, // 60 seconds
});

// MCP Server
const server = new Server(
  {
    name: 'rightflow-hebrew-pdf',
    version: '2.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// ============================================================================
// Tools - Functions that Claude can call
// ============================================================================

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'list_templates',
        description: 'List available Hebrew PDF templates (legal, accounting, HR, real estate)',
        inputSchema: {
          type: 'object',
          properties: {
            category: {
              type: 'string',
              enum: ['legal', 'accounting', 'hr', 'real_estate', 'general'],
              description: 'Filter by template category',
            },
            search: {
              type: 'string',
              description: 'Search templates by name',
            },
            language: {
              type: 'string',
              enum: ['he', 'en'],
              default: 'he',
              description: 'Response language',
            },
          },
        },
      },
      {
        name: 'get_template_fields',
        description: 'Get field definitions for a specific template',
        inputSchema: {
          type: 'object',
          properties: {
            template_id: {
              type: 'string',
              description: 'Template UUID',
            },
            language: {
              type: 'string',
              enum: ['he', 'en'],
              default: 'he',
              description: 'Response language',
            },
          },
          required: ['template_id'],
        },
      },
      {
        name: 'fill_pdf',
        description: 'Generate a filled PDF from a template with Hebrew text support',
        inputSchema: {
          type: 'object',
          properties: {
            template_id: {
              type: 'string',
              description: 'Template UUID',
            },
            data: {
              type: 'object',
              description: 'Field data as key-value pairs',
              additionalProperties: true,
            },
            file_name: {
              type: 'string',
              description: 'Optional output file name',
            },
            language: {
              type: 'string',
              enum: ['he', 'en'],
              default: 'he',
              description: 'PDF language',
            },
          },
          required: ['template_id', 'data'],
        },
      },
      {
        name: 'list_categories',
        description: 'List all available template categories with counts',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'list_templates': {
        const params = new URLSearchParams();
        if (args && typeof args === 'object') {
          const argsObj = args as Record<string, unknown>;
          if (argsObj.category) params.append('category', argsObj.category as string);
          if (argsObj.search) params.append('search', argsObj.search as string);
          if (argsObj.language) params.append('language', argsObj.language as string);
        }

        const response = await apiClient.get(`/mcp/templates?${params.toString()}`);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response.data, null, 2),
            },
          ],
        };
      }

      case 'get_template_fields': {
        if (!args || typeof args !== 'object') {
          throw new Error('Missing required arguments');
        }
        const argsObj = args as Record<string, unknown>;
        const template_id = argsObj.template_id as string;
        const language = (argsObj.language as string) || 'he';

        const response = await apiClient.get(
          `/mcp/templates/${template_id}?language=${language}`
        );

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response.data, null, 2),
            },
          ],
        };
      }

      case 'fill_pdf': {
        if (!args || typeof args !== 'object') {
          throw new Error('Missing required arguments');
        }
        const argsObj = args as Record<string, unknown>;
        const template_id = argsObj.template_id as string;
        const data = argsObj.data as Record<string, unknown>;
        const file_name = argsObj.file_name as string | undefined;
        const language = (argsObj.language as string) || 'he';

        const response = await apiClient.post('/mcp/fill', {
          template_id,
          data,
          file_name,
          language,
          output_format: 'url',
        });

        // Extract useful information with safe property access
        const result = response.data?.data;

        if (!result) {
          throw new Error('Invalid API response: missing data object');
        }

        const summary = {
          success: true,
          template_name: result.template_name ?? 'Unknown',
          fields_filled: result.fields_filled ?? 0,
          file_url: result.file_url ?? '',
          file_size_kb: result.file_size ? (result.file_size / 1024).toFixed(2) : '0.00',
          generation_time_ms: result.generation_time_ms ?? 0,
          expires_at: result.expires_at ?? 'Unknown',
        };

        return {
          content: [
            {
              type: 'text',
              text: `✅ PDF generated successfully!\n\n${JSON.stringify(summary, null, 2)}\n\nDownload: ${result.file_url}`,
            },
          ],
        };
      }

      case 'list_categories': {
        const response = await apiClient.get('/mcp/categories');

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response.data, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: any) {
    const errorMessage = error.response?.data?.error?.message || error.message;
    const errorDetails = error.response?.data?.error?.details || '';

    return {
      content: [
        {
          type: 'text',
          text: `❌ Error: ${errorMessage}\n${errorDetails ? `\nDetails: ${JSON.stringify(errorDetails, null, 2)}` : ''}`,
        },
      ],
      isError: true,
    };
  }
});

// ============================================================================
// Resources - Data that Claude can read
// ============================================================================

server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: 'rightflow://templates',
        name: 'Hebrew PDF Templates',
        description: 'Available Hebrew document templates',
        mimeType: 'application/json',
      },
      {
        uri: 'rightflow://categories',
        name: 'Template Categories',
        description: 'Available template categories',
        mimeType: 'application/json',
      },
    ],
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  try {
    if (uri === 'rightflow://templates') {
      const response = await apiClient.get('/mcp/templates?language=he');
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(response.data, null, 2),
          },
        ],
      };
    }

    if (uri === 'rightflow://categories') {
      const response = await apiClient.get('/mcp/categories');
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(response.data, null, 2),
          },
        ],
      };
    }

    throw new Error(`Unknown resource: ${uri}`);
  } catch (error: any) {
    throw new Error(`Failed to read resource: ${error.message}`);
  }
});

// ============================================================================
// Start Server
// ============================================================================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('RightFlow MCP Server running');
  console.error(`API URL: ${API_BASE_URL}`);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
