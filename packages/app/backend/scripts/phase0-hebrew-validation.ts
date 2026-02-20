/**
 * Phase 0: Hebrew Font Embedding Validation Test
 *
 * This script validates that Hebrew text renders correctly in PDFs using pdf-lib.
 * It tests the core assumptions required for the Cowork MCP Connector.
 *
 * Run: npx ts-node scripts/phase0-hebrew-validation.ts
 */

import { PDFDocument, rgb, PDFFont } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import * as fs from 'fs';
import * as path from 'path';

// Test cases for Hebrew rendering
const TEST_CASES = [
  { id: 'simple', input: 'שלום עולם', description: 'Simple Hebrew text' },
  { id: 'nikud', input: 'שָׁלוֹם', description: 'Hebrew with nikud (vowels)' },
  { id: 'mixed', input: 'טופס 101 Form', description: 'Mixed Hebrew/English/Numbers' },
  { id: 'email', input: 'מייל: user@example.com', description: 'Email in Hebrew context' },
  { id: 'parens', input: '(א) ו-(ב) ו-(ג)', description: 'Hebrew with parentheses' },
  { id: 'acronym', input: 'צה"ל ורפ"ק', description: 'Hebrew acronyms with quotes' },
  { id: 'currency', input: 'סכום: ₪1,234.56', description: 'Currency with Hebrew' },
  { id: 'address', input: 'רחוב הרצל 15, תל אביב 6100001', description: 'Full Hebrew address' },
  { id: 'long', input: 'זהו טקסט ארוך יותר בעברית שמטרתו לבדוק את הטיפול בטקסטים ארוכים יותר ולוודא שהם נשמרים בסדר הנכון', description: 'Long Hebrew text' },
  { id: 'date', input: 'תאריך: כ"ב באדר תשפ"ו', description: 'Hebrew date format' },
];

interface TestResult {
  id: string;
  description: string;
  input: string;
  success: boolean;
  error?: string;
  outputFile?: string;
}

async function findHebrewFont(): Promise<string> {
  const possiblePaths = [
    path.join(__dirname, '../../../public/fonts/NotoSansHebrew-Regular.ttf'),
    path.join(__dirname, '../../public/fonts/NotoSansHebrew-Regular.ttf'),
    path.join(process.cwd(), 'public/fonts/NotoSansHebrew-Regular.ttf'),
    path.join(process.cwd(), '../public/fonts/NotoSansHebrew-Regular.ttf'),
    'c:/Dev/Dev/RightFlow/packages/app/public/fonts/NotoSansHebrew-Regular.ttf',
    'c:/Dev/Dev/RightFlow/public/fonts/NotoSansHebrew-Regular.ttf',
  ];

  for (const fontPath of possiblePaths) {
    if (fs.existsSync(fontPath)) {
      console.log(`Found Hebrew font at: ${fontPath}`);
      return fontPath;
    }
  }

  throw new Error(`Hebrew font not found. Searched:\n${possiblePaths.join('\n')}`);
}

async function generateTestPdf(
  testCases: typeof TEST_CASES,
  hebrewFont: PDFFont,
  outputPath: string
): Promise<void> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]); // Letter size

  // Title
  page.drawText('Phase 0: Hebrew Font Embedding Validation', {
    x: 50,
    y: 750,
    size: 16,
    color: rgb(0, 0, 0),
  });

  page.drawText(`Generated: ${new Date().toISOString()}`, {
    x: 50,
    y: 730,
    size: 10,
    color: rgb(0.5, 0.5, 0.5),
  });

  // Draw separator
  page.drawLine({
    start: { x: 50, y: 720 },
    end: { x: 562, y: 720 },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.8),
  });

  let yPosition = 690;
  const lineHeight = 45;

  for (const testCase of testCases) {
    if (yPosition < 100) {
      // Add new page if needed
      const newPage = pdfDoc.addPage([612, 792]);
      yPosition = 750;
    }

    // Test label
    page.drawText(`[${testCase.id}] ${testCase.description}:`, {
      x: 50,
      y: yPosition,
      size: 10,
      color: rgb(0.3, 0.3, 0.3),
    });

    // Hebrew text (right-aligned for RTL)
    try {
      page.drawText(testCase.input, {
        x: 50,
        y: yPosition - 18,
        size: 14,
        font: hebrewFont,
        color: rgb(0, 0, 0),
      });
    } catch (error) {
      page.drawText(`ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`, {
        x: 50,
        y: yPosition - 18,
        size: 10,
        color: rgb(1, 0, 0),
      });
    }

    yPosition -= lineHeight;
  }

  // Validation notes
  page.drawText('VALIDATION INSTRUCTIONS:', {
    x: 50,
    y: 80,
    size: 10,
    color: rgb(0, 0, 0.8),
  });

  page.drawText('1. Open this PDF and verify Hebrew text is NOT reversed', {
    x: 50,
    y: 65,
    size: 9,
    color: rgb(0.3, 0.3, 0.3),
  });

  page.drawText('2. Check nikud (vowels) display correctly above/below letters', {
    x: 50,
    y: 52,
    size: 9,
    color: rgb(0.3, 0.3, 0.3),
  });

  page.drawText('3. Verify mixed Hebrew/English maintains logical order', {
    x: 50,
    y: 39,
    size: 9,
    color: rgb(0.3, 0.3, 0.3),
  });

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(outputPath, pdfBytes);
}

async function runValidation(): Promise<void> {
  console.log('='.repeat(60));
  console.log('Phase 0: Hebrew Font Embedding Validation');
  console.log('='.repeat(60));
  console.log();

  const results: TestResult[] = [];
  const outputDir = path.join(__dirname, '../output');

  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  try {
    // Step 1: Find Hebrew font
    console.log('Step 1: Locating Hebrew font...');
    const fontPath = await findHebrewFont();
    const fontBytes = fs.readFileSync(fontPath);
    console.log(`Font size: ${(fontBytes.length / 1024 / 1024).toFixed(2)} MB`);
    console.log();

    // Step 2: Create PDF document
    console.log('Step 2: Creating PDF document...');
    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);
    console.log('Fontkit registered successfully');
    console.log();

    // Step 3: Embed Hebrew font (CRITICAL: subset: false)
    console.log('Step 3: Embedding Hebrew font (subset: false)...');
    const hebrewFont = await pdfDoc.embedFont(fontBytes, { subset: false });
    console.log('Font embedded successfully!');
    console.log();

    // Step 4: Generate test PDF
    console.log('Step 4: Generating test PDF with all test cases...');
    const outputPath = path.join(outputDir, 'phase0-hebrew-validation.pdf');
    await generateTestPdf(TEST_CASES, hebrewFont, outputPath);
    console.log(`Test PDF saved to: ${outputPath}`);
    console.log();

    // Step 5: Generate individual test PDFs
    console.log('Step 5: Generating individual test PDFs...');
    for (const testCase of TEST_CASES) {
      try {
        const doc = await PDFDocument.create();
        doc.registerFontkit(fontkit);
        const font = await doc.embedFont(fontBytes, { subset: false });
        const page = doc.addPage([400, 200]);

        page.drawText(`Test: ${testCase.description}`, {
          x: 20,
          y: 170,
          size: 12,
        });

        page.drawText(testCase.input, {
          x: 20,
          y: 100,
          size: 24,
          font: font,
        });

        const bytes = await doc.save();
        const filePath = path.join(outputDir, `test-${testCase.id}.pdf`);
        fs.writeFileSync(filePath, bytes);

        results.push({
          id: testCase.id,
          description: testCase.description,
          input: testCase.input,
          success: true,
          outputFile: filePath,
        });

        console.log(`  [PASS] ${testCase.id}: ${testCase.description}`);
      } catch (error) {
        results.push({
          id: testCase.id,
          description: testCase.description,
          input: testCase.input,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        console.log(`  [FAIL] ${testCase.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    console.log();
    console.log('='.repeat(60));
    console.log('VALIDATION SUMMARY');
    console.log('='.repeat(60));

    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`Total tests: ${results.length}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log();

    if (failed === 0) {
      console.log('STATUS: ALL TESTS PASSED');
      console.log();
      console.log('NEXT STEPS:');
      console.log('1. Open the generated PDFs and visually verify Hebrew text');
      console.log('2. Check that text is NOT reversed (should read right-to-left naturally)');
      console.log('3. Verify nikud renders correctly');
      console.log('4. If visual inspection passes, Phase 0 validation is COMPLETE');
      console.log();
      console.log(`Output directory: ${outputDir}`);
    } else {
      console.log('STATUS: SOME TESTS FAILED');
      console.log();
      console.log('FAILED TESTS:');
      results.filter(r => !r.success).forEach(r => {
        console.log(`  - ${r.id}: ${r.error}`);
      });
    }

    // Write results to JSON
    const resultsPath = path.join(outputDir, 'validation-results.json');
    fs.writeFileSync(resultsPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      fontPath,
      fontSizeBytes: fontBytes.length,
      testCases: results,
      summary: { total: results.length, passed, failed },
    }, null, 2));
    console.log();
    console.log(`Results saved to: ${resultsPath}`);

  } catch (error) {
    console.error('CRITICAL ERROR:', error);
    process.exit(1);
  }
}

// Run validation
runValidation().catch(console.error);
