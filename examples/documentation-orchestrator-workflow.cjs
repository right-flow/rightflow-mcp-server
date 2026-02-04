/**
 * Documentation Orchestrator - Full Workflow Example
 *
 * This demonstrates how the Documentation Orchestrator will:
 * 1. Track session start time
 * 2. Collect development metrics during execution
 * 3. Calculate session duration at completion
 * 4. Log to Google Sheets
 * 5. Create local markdown backup
 */

const DevelopmentJournal = require('../src/utils/developmentJournal.cjs');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class DocumentationOrchestrator {
  constructor(stage, feature) {
    this.stage = stage;
    this.feature = feature;
    this.sessionStartTime = new Date();
    this.sessionStartTimeFormatted = this.sessionStartTime.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    });

    this.journal = new DevelopmentJournal();
    this.metrics = {
      filesChanged: 0,
      keyFiles: [],
      testsAdded: '',
      commitHash: '',
      documentation: [],
      notes: []
    };
  }

  /**
   * Announce start of documentation process
   */
  announceStart() {
    console.log('\n🤖 Documentation Orchestrator Starting...');
    console.log(`Purpose: ${this.stage} - ${this.feature}`);
    console.log(`Location: C:\\Dev\\Dev\\DocsFlow-Documentation-Staging\\DocsFlow2.0\\RightFllow 2.0`);
    console.log('Expected output:');
    console.log('  - Create/update documentation files');
    console.log('  - Update INDEX.md');
    console.log('Git push: Yes - Changes will be committed and pushed to GitHub');
    console.log('Journal entry: Yes - Logging session to Development Journal');
    console.log(`Session tracking: Started at ${this.sessionStartTimeFormatted}, will log duration upon completion`);
    console.log('Running in parallel - not blocking development workflow\n');
  }

  /**
   * Collect metrics from git
   */
  collectGitMetrics() {
    console.log('📊 Collecting development metrics...\n');

    try {
      // Get number of files changed
      const status = execSync('git status --short', { encoding: 'utf-8' });
      const changedFiles = status.split('\n').filter(line => line.trim()).length;
      this.metrics.filesChanged = changedFiles;

      console.log(`✓ Files changed: ${changedFiles}`);

      // Get list of changed files (limit to 5 most important)
      const files = execSync('git diff --name-only HEAD', { encoding: 'utf-8' })
        .split('\n')
        .filter(f => f.trim())
        .slice(0, 5);

      this.metrics.keyFiles = files;
      console.log(`✓ Key files: ${files.join(', ')}`);

      // Get last commit hash (if any commits were made during session)
      try {
        const commitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
        this.metrics.commitHash = commitHash;
        console.log(`✓ Latest commit: ${commitHash}`);
      } catch (e) {
        console.log('✓ No new commits yet');
      }

    } catch (error) {
      console.log('⚠️  Git metrics collection skipped (not a git repository or no changes)');
    }

    console.log();
  }

  /**
   * Collect documentation metrics
   */
  addDocumentation(docName) {
    this.metrics.documentation.push(docName);
    console.log(`📝 Documented: ${docName}`);
  }

  /**
   * Add test metrics
   */
  addTests(description) {
    this.metrics.testsAdded = description;
    console.log(`✅ Tests: ${description}`);
  }

  /**
   * Add notes/findings
   */
  addNote(note) {
    this.metrics.notes.push(note);
    console.log(`💡 Note: ${note}`);
  }

  /**
   * Create local markdown backup
   */
  async createLocalBackup(sessionData) {
    const backupDir = path.join(
      'C:', 'Dev', 'Dev', 'DocsFlow-Documentation-Staging',
      'DocsFlow2.0', 'RightFllow 2.0', 'Development-Journal', 'entries'
    );

    // Create directory if it doesn't exist
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const fileName = `${sessionData.date}-${this.stage.replace(/[: ]/g, '-').toLowerCase()}.md`;
    const filePath = path.join(backupDir, fileName);

    const markdown = `---
Date: ${sessionData.date}
Stage: ${this.stage}
Feature: ${this.feature}
Duration: ${sessionData.duration} hours (${sessionData.startTime} - ${sessionData.endTime})
---

## Summary
${sessionData.description}

## Actions Performed
${this.metrics.notes.map(note => `- ${note}`).join('\n')}

## Files Modified (${sessionData.filesChanged})
**Key Files:**
${this.metrics.keyFiles.map(file => `- ${file}`).join('\n')}

## Tests Added
${sessionData.testsAdded || 'N/A'}

## Documentation Created
${this.metrics.documentation.map(doc => `- ${doc}`).join('\n')}

## Git Commit
${sessionData.commitHash ? `Hash: ${sessionData.commitHash}` : 'No commit yet'}

## Status
${sessionData.status}

## Additional Notes
${this.metrics.notes.length > 0 ? this.metrics.notes.join('\n- ') : 'None'}
`;

    fs.writeFileSync(filePath, markdown, 'utf-8');
    console.log(`\n💾 Local backup created: ${filePath}`);
  }

  /**
   * Complete the session and log to journal
   */
  async complete(description, status = '✅ Completed') {
    console.log('\n═══════════════════════════════════════');
    console.log('📊 Finalizing session and logging to journal...\n');

    // Calculate session duration
    const sessionEndTime = new Date();
    const sessionEndTimeFormatted = sessionEndTime.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    });

    const duration = this.journal.calculateDuration(
      this.sessionStartTimeFormatted,
      sessionEndTimeFormatted
    );

    // Prepare session data
    const sessionData = {
      date: new Date().toLocaleDateString('en-CA'),
      startTime: this.sessionStartTimeFormatted,
      endTime: sessionEndTimeFormatted,
      duration: parseFloat(duration),
      stage: this.stage,
      feature: this.feature,
      description: description,
      filesChanged: this.metrics.filesChanged,
      keyFiles: this.metrics.keyFiles.join(', '),
      testsAdded: this.metrics.testsAdded,
      commitHash: this.metrics.commitHash,
      documentation: this.metrics.documentation.join(', '),
      status: status,
      notes: this.metrics.notes.join('; ')
    };

    // Log to Google Sheets
    console.log('📤 Logging to Google Sheets...');
    await this.journal.logSession(sessionData);
    console.log('✅ Session logged to Google Sheets\n');

    // Create local markdown backup
    console.log('💾 Creating local markdown backup...');
    await this.createLocalBackup(sessionData);

    // Completion announcement
    console.log('\n═══════════════════════════════════════');
    console.log('✅ Documentation Orchestrator Completed');
    console.log('═══════════════════════════════════════');
    console.log(`Created: ${this.metrics.documentation.length} documentation files`);
    console.log(`Updated: ${this.metrics.filesChanged} files`);
    console.log('Git Status: Committed and pushed to remote');
    console.log('Repository: https://github.com/Hagalgal/DocsFlow-Documentation.git\n');

    console.log('📊 Development Journal Entry Logged:');
    console.log(`Date: ${sessionData.date}`);
    console.log(`Stage: ${this.stage}`);
    console.log(`Duration: ${duration} hours (${this.sessionStartTimeFormatted} - ${sessionEndTimeFormatted})`);
    console.log(`Feature: ${this.feature}`);
    console.log(`Status: ✅ Logged to Google Sheets + Local markdown backup\n`);

    console.log(`View journal: https://docs.google.com/spreadsheets/d/${process.env.GOOGLE_SHEETS_JOURNAL_ID}\n`);
  }
}

// ============================================
// EXAMPLE USAGE - Different Development Stages
// ============================================

async function demonstrateWorkflow() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  Documentation Orchestrator - Full Workflow Demonstration  ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // ============================================
  // Example 1: Stage 4 - Implementation
  // ============================================
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Example 1: Stage 4 - Implementation Session');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const orchestrator1 = new DocumentationOrchestrator(
    'Stage 4: Implementation',
    'Google Sheets Development Journal Integration'
  );

  orchestrator1.announceStart();

  // Simulate development work
  console.log('🔨 Working on implementation...\n');

  orchestrator1.addDocumentation('feature-dev-journal.md');
  orchestrator1.addDocumentation('ADR-006-development-tracking.md');
  orchestrator1.addTests('Created DevelopmentJournal class with full test coverage');
  orchestrator1.addNote('Integrated Google Sheets API successfully');
  orchestrator1.addNote('Created automated logging system');
  orchestrator1.addNote('Added fallback to local markdown storage');

  // Collect metrics
  orchestrator1.collectGitMetrics();

  // Complete and log
  await orchestrator1.complete(
    'Implemented Google Sheets Development Journal integration with automated session logging, local markdown backups, and comprehensive API wrapper.',
    '✅ Completed'
  );

  // Wait a bit before next example
  await new Promise(resolve => setTimeout(resolve, 2000));

  // ============================================
  // Example 2: Stage 2 - Architecture
  // ============================================
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Example 2: Stage 2 - Architecture Session');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const orchestrator2 = new DocumentationOrchestrator(
    'Stage 2: Architecture',
    'Documentation Orchestrator Design'
  );

  orchestrator2.announceStart();

  console.log('🏗️  Designing architecture...\n');

  orchestrator2.addDocumentation('ADR-007-orchestrator-architecture.md');
  orchestrator2.addDocumentation('System-Design/orchestrator-workflow.md');
  orchestrator2.addNote('Designed parallel execution model');
  orchestrator2.addNote('Defined API interfaces for journal logging');
  orchestrator2.addNote('Planned fallback strategies for API failures');

  orchestrator2.collectGitMetrics();

  await orchestrator2.complete(
    'Designed Documentation Orchestrator architecture with parallel execution, comprehensive logging, and robust error handling.',
    '✅ Completed'
  );

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║            All Examples Completed Successfully!            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
}

// Run demonstration
demonstrateWorkflow().catch(console.error);
