import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

async function testExtraction() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('GEMINI_API_KEY is missing in .env');
        return;
    }

    // Try to find a sample PDF in RightFlow
    const samplePdfPath = path.join(__dirname, 'Phase0-Testing/test-samples/sample-form.pdf');
    if (!fs.existsSync(samplePdfPath)) {
        console.error('Sample PDF not found at:', samplePdfPath);
        // List directory to help find a PDF
        return;
    }

    console.log('Testing RightFlow Field Extraction with Improved Gemini Logic...');
    const pdfBase64 = fs.readFileSync(samplePdfPath).toString('base64');

    // In a real test we'd hit the API, but here we'll test the Analyzer directly 
    // to ensure logic is correct
    import('./api/lib/ai/DocumentAnalyzer.js').then(async (module) => {
        const analyzer = new module.DocumentAnalyzer(apiKey);
        try {
            const result = await analyzer.analyze(pdfBase64);
            console.log('Extraction Success!');
            console.log('Metadata:', result.formMetadata);
            console.log(`Fields Found: ${result.fields.length}`);
            if (result.fields.length > 0) {
                console.log('First Field Sample:', JSON.stringify(result.fields[0], null, 2));
            }
        } catch (error) {
            console.error('Extraction Failed:', error.message);
        }
    }).catch(err => {
        console.error('Failed to load module. Make sure to build first if needed or use tsx.', err.message);
    });
}

testExtraction();
