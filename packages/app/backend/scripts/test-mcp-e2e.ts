/**
 * End-to-End Test for MCP PDF Generation
 *
 * Tests the full flow:
 * 1. Get template details
 * 2. Generate PDF from scratch
 * 3. Save to local storage
 * 4. Verify file exists
 *
 * Run: npx ts-node scripts/test-mcp-e2e.ts
 */

import { query } from '../src/config/database';
import { generateSimplePdf } from '../src/services/pdf/hebrewPdfService';
import { localStorage } from '../src/services/storage/localStorageProvider';
import logger from '../src/utils/logger';

async function testMCPEndToEnd(): Promise<void> {
  logger.info('Starting MCP End-to-End Test');

  try {
    // Step 1: Get a template
    const templates = await query(
      `SELECT id, name, name_he, fields FROM mcp_templates
       WHERE deleted_at IS NULL
       LIMIT 1`
    );

    if (templates.length === 0) {
      logger.error('No templates found. Run seed script first.');
      process.exit(1);
    }

    const template = templates[0];
    logger.info(`Using template: ${template.name_he}`, { template_id: template.id });

    // Step 2: Prepare test data
    const fields = template.fields;
    const testData: Record<string, unknown> = {};

    // Fill with sample data
    for (const field of fields) {
      switch (field.type) {
        case 'text':
        case 'textarea':
          testData[field.id] = field.label_he || field.label || 'Test Value';
          break;
        case 'number':
        case 'currency':
          testData[field.id] = 12345;
          break;
        case 'date':
          testData[field.id] = '2026-02-19';
          break;
        case 'checkbox':
          testData[field.id] = true;
          break;
        case 'select':
          if (field.options && field.options.length > 0) {
            testData[field.id] = field.options[0].value;
          }
          break;
      }
    }

    logger.info('Test data prepared', { field_count: Object.keys(testData).length });

    // Step 3: Generate PDF
    logger.info('Generating PDF from scratch...');
    const pdfResult = await generateSimplePdf(fields, testData, {
      language: 'he',
      title: template.name,
      title_he: template.name_he,
    });

    if (!pdfResult.success || !pdfResult.pdfBuffer) {
      logger.error('PDF generation failed', { error: pdfResult.error });
      process.exit(1);
    }

    logger.info('PDF generated successfully', {
      size: pdfResult.pdfBuffer.length,
      generation_time_ms: pdfResult.generationTimeMs,
    });

    // Step 4: Save to local storage
    logger.info('Saving to local storage...');

    // Get organization
    const orgs = await query('SELECT id FROM organizations LIMIT 1');
    if (orgs.length === 0) {
      logger.error('No organization found');
      process.exit(1);
    }

    const organizationId = orgs[0].id;
    const fileName = `test_${template.name}_${Date.now()}.pdf`;

    const storedFile = await localStorage.save(
      organizationId,
      fileName,
      pdfResult.pdfBuffer,
      'application/pdf',
      60 * 60 // 1 hour TTL
    );

    logger.info('File saved to local storage', {
      path: storedFile.path,
      url: storedFile.url,
      size: storedFile.size,
    });

    // Step 5: Verify file exists
    logger.info('Verifying file exists...');
    const exists = await localStorage.exists(organizationId, storedFile.path);

    if (!exists) {
      logger.error('File verification failed');
      process.exit(1);
    }

    logger.info('File verified successfully');

    // Step 6: Get file metadata
    const metadata = await localStorage.getMetadata(organizationId, storedFile.path);
    logger.info('File metadata', { metadata });

    // Step 7: Clean up (optional)
    logger.info('Cleaning up test file...');
    await localStorage.delete(organizationId, storedFile.path);
    logger.info('Test file deleted');

    logger.info('✅ MCP End-to-End Test PASSED');

    console.log('\n' + '='.repeat(60));
    console.log('MCP PDF Generation - End-to-End Test Results');
    console.log('='.repeat(60));
    console.log(`Template: ${template.name_he}`);
    console.log(`Fields: ${fields.length}`);
    console.log(`PDF Size: ${(pdfResult.pdfBuffer.length / 1024).toFixed(2)} KB`);
    console.log(`Generation Time: ${pdfResult.generationTimeMs}ms`);
    console.log(`Storage Path: ${storedFile.path}`);
    console.log(`Storage Base: ${localStorage.getBasePath()}`);
    console.log('Status: ✅ SUCCESS');
    console.log('='.repeat(60));

    process.exit(0);
  } catch (error: any) {
    logger.error('MCP End-to-End Test FAILED', {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
}

// Run test
testMCPEndToEnd();
