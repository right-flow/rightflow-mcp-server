/**
 * Development Journal Logger
 * Logs development sessions to Google Sheets for tracking time and progress
 */

const { google } = require('googleapis');
const fs = require('fs');
require('dotenv').config();

class DevelopmentJournal {
  constructor() {
    this.spreadsheetId = process.env.GOOGLE_SHEETS_JOURNAL_ID;
    this.tabName = process.env.GOOGLE_SHEETS_TAB_NAME || 'Development Journal';
    this.credentialsPath = process.env.GOOGLE_SHEETS_CREDENTIALS_PATH?.replace(/\\/g, '/');
    this.sheets = null;
  }

  /**
   * Initialize Google Sheets API
   */
  async initialize() {
    if (!this.credentialsPath || !fs.existsSync(this.credentialsPath)) {
      throw new Error(`Google Sheets credentials not found at: ${this.credentialsPath}`);
    }

    const credentials = JSON.parse(fs.readFileSync(this.credentialsPath, 'utf8'));

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const authClient = await auth.getClient();
    this.sheets = google.sheets({ version: 'v4', auth: authClient });

    return this;
  }

  /**
   * Log a development session to the journal
   * @param {Object} entry - The journal entry
   * @param {string} entry.date - Date (YYYY-MM-DD)
   * @param {string} entry.startTime - Start time (HH:MM)
   * @param {string} entry.endTime - End time (HH:MM)
   * @param {number} entry.duration - Duration in hours
   * @param {string} entry.stage - Development stage (e.g., "Stage 4: Implementation")
   * @param {string} entry.feature - Feature/task name
   * @param {string} entry.description - Detailed description
   * @param {number} entry.filesChanged - Number of files changed
   * @param {string} entry.keyFiles - List of key files (comma-separated)
   * @param {string} entry.testsAdded - Tests added (e.g., "12 unit, 3 integration")
   * @param {string} entry.commitHash - Git commit hash
   * @param {string} entry.documentation - Documentation created/updated
   * @param {string} entry.status - Status (e.g., "✅ Completed", "🔄 In Progress")
   * @param {string} entry.notes - Additional notes
   */
  async logSession(entry) {
    if (!this.sheets) {
      await this.initialize();
    }

    // Ensure all required fields are present
    const row = [
      entry.date || new Date().toLocaleDateString('en-CA'),
      entry.startTime || '',
      entry.endTime || '',
      entry.duration || 0,
      entry.stage || '',
      entry.feature || '',
      entry.description || '',
      entry.filesChanged || 0,
      entry.keyFiles || '',
      entry.testsAdded || '',
      entry.commitHash || '',
      entry.documentation || '',
      entry.status || '🔄 In Progress',
      entry.notes || ''
    ];

    await this.sheets.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: `${this.tabName}!A:N`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [row]
      }
    });

    return true;
  }

  /**
   * Calculate duration in hours from start and end times
   * @param {string} startTime - Start time (HH:MM)
   * @param {string} endTime - End time (HH:MM)
   * @returns {number} Duration in hours
   */
  calculateDuration(startTime, endTime) {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    const durationMinutes = endMinutes - startMinutes;
    return (durationMinutes / 60).toFixed(2);
  }

  /**
   * Get all journal entries
   * @returns {Array} Array of journal entries
   */
  async getAllEntries() {
    if (!this.sheets) {
      await this.initialize();
    }

    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${this.tabName}!A:N`,
    });

    return response.data.values || [];
  }

  /**
   * Get entries for a specific date
   * @param {string} date - Date in YYYY-MM-DD format
   * @returns {Array} Array of entries for that date
   */
  async getEntriesByDate(date) {
    const allEntries = await this.getAllEntries();

    // Skip header row
    return allEntries.slice(1).filter(entry => entry[0] === date);
  }

  /**
   * Get total hours worked in a date range
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   * @returns {number} Total hours
   */
  async getTotalHours(startDate, endDate) {
    const allEntries = await this.getAllEntries();

    return allEntries
      .slice(1)  // Skip header
      .filter(entry => entry[0] >= startDate && entry[0] <= endDate)
      .reduce((total, entry) => total + parseFloat(entry[3] || 0), 0);
  }
}

module.exports = DevelopmentJournal;
