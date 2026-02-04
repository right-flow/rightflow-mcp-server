/**
 * Test Google Sheets API Connection
 * Tests if we can read and write to the Development Journal
 */

const { google } = require('googleapis');
const fs = require('fs');
require('dotenv').config();

async function testGoogleSheetsConnection() {
  console.log('🔍 Testing Google Sheets API Connection...\n');

  try {
    // 1. Load credentials
    console.log('📄 Loading credentials from:', process.env.GOOGLE_SHEETS_CREDENTIALS_PATH);
    const credentialsPath = process.env.GOOGLE_SHEETS_CREDENTIALS_PATH.replace(/\\/g, '/');

    if (!fs.existsSync(credentialsPath)) {
      throw new Error(`Credentials file not found at: ${credentialsPath}`);
    }

    const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    console.log('✅ Credentials loaded successfully');
    console.log('   Service Account:', credentials.client_email);
    console.log('   Project ID:', credentials.project_id, '\n');

    // 2. Authenticate
    console.log('🔐 Authenticating with Google...');
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const authClient = await auth.getClient();
    console.log('✅ Authentication successful\n');

    // 3. Initialize Sheets API
    const sheets = google.sheets({ version: 'v4', auth: authClient });
    const spreadsheetId = process.env.GOOGLE_SHEETS_JOURNAL_ID;

    console.log('📊 Spreadsheet ID:', spreadsheetId);
    console.log('📑 Tab Name:', process.env.GOOGLE_SHEETS_TAB_NAME, '\n');

    // 4. Get spreadsheet metadata
    console.log('📖 Reading spreadsheet metadata...');
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId,
    });

    console.log('✅ Spreadsheet accessed successfully');
    console.log('   Title:', spreadsheet.data.properties.title);
    console.log('   Sheets:');
    spreadsheet.data.sheets.forEach(sheet => {
      console.log(`     - ${sheet.properties.title}`);
    });
    console.log();

    // 5. Check if the Development Journal tab exists
    const tabName = process.env.GOOGLE_SHEETS_TAB_NAME;
    const sheetExists = spreadsheet.data.sheets.some(
      sheet => sheet.properties.title === tabName
    );

    if (!sheetExists) {
      console.log(`⚠️  Tab "${tabName}" does not exist. Creating it...`);

      // Create the tab
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{
            addSheet: {
              properties: {
                title: tabName
              }
            }
          }]
        }
      });

      console.log(`✅ Tab "${tabName}" created successfully\n`);

      // Add headers
      console.log('📝 Adding column headers...');
      const headers = [
        'Date', 'Start Time', 'End Time', 'Duration (hours)',
        'Stage', 'Feature/Task', 'Description', 'Files Changed',
        'Key Files', 'Tests Added', 'Commit Hash', 'Documentation',
        'Status', 'Notes'
      ];

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${tabName}!A1:N1`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [headers]
        }
      });

      console.log('✅ Headers added successfully\n');
    } else {
      console.log(`✅ Tab "${tabName}" exists\n`);
    }

    // 6. Test write - Add a test entry
    console.log('✍️  Testing write operation...');
    const testRow = [
      new Date().toLocaleDateString('en-CA'),  // Date (YYYY-MM-DD)
      new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }), // Start Time
      new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }), // End Time
      '0.0',  // Duration
      'Test',  // Stage
      'Google Sheets API Connection Test',  // Feature/Task
      'Testing connection to Google Sheets API',  // Description
      '1',  // Files Changed
      'test-google-sheets.js',  // Key Files
      '0',  // Tests Added
      'test123',  // Commit Hash
      'N/A',  // Documentation
      '✅ Test',  // Status
      'This is a test entry - can be deleted'  // Notes
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${tabName}!A:N`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [testRow]
      }
    });

    console.log('✅ Test entry added successfully\n');

    // 7. Test read - Read the data back
    console.log('📖 Testing read operation...');
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${tabName}!A:N`,
    });

    const rows = response.data.values;
    console.log('✅ Read successful');
    console.log(`   Total rows: ${rows ? rows.length : 0}\n`);

    // Success summary
    console.log('═══════════════════════════════════════');
    console.log('✅ ALL TESTS PASSED!');
    console.log('═══════════════════════════════════════');
    console.log('Your Google Sheets integration is working correctly.');
    console.log(`View your journal: https://docs.google.com/spreadsheets/d/${spreadsheetId}\n`);

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);

    if (error.code === 403) {
      console.error('\n💡 This usually means:');
      console.error('   1. The Sheet is not shared with the Service Account');
      console.error('   2. Service Account email:', process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT);
      console.error('   3. Make sure you shared the sheet with "Editor" permissions\n');
    } else if (error.code === 404) {
      console.error('\n💡 Spreadsheet not found. Check:');
      console.error('   1. Spreadsheet ID is correct');
      console.error('   2. Sheet exists and is not deleted\n');
    }

    process.exit(1);
  }
}

// Run the test
testGoogleSheetsConnection();
