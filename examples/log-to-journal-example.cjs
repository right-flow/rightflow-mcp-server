/**
 * Example: How to use the Development Journal Logger
 * This demonstrates how the Documentation Orchestrator will log sessions
 */

const DevelopmentJournal = require('../src/utils/developmentJournal.cjs');

async function exampleLogging() {
  console.log('📊 Development Journal - Example Usage\n');

  const journal = new DevelopmentJournal();

  // Example 1: Log a Stage 4 (Implementation) session
  console.log('Example 1: Logging an implementation session...');
  await journal.logSession({
    date: new Date().toLocaleDateString('en-CA'),  // Today's date
    startTime: '14:30',
    endTime: '16:45',
    duration: journal.calculateDuration('14:30', '16:45'),
    stage: 'Stage 4: Implementation',
    feature: 'Hebrew Font Embedding',
    description: 'Implemented full font embedding with subset:false for Hebrew text rendering in PDF-lib. Fixed BiDi text direction issues.',
    filesChanged: 8,
    keyFiles: 'src/pdf/fontLoader.ts, src/utils/hebrewText.ts, src/components/PDFViewer.tsx',
    testsAdded: '12 unit tests, 3 integration tests',
    commitHash: 'a1b2c3d',
    documentation: 'ADR-002: Hebrew Font Embedding Strategy, features/hebrew-font-embedding.md',
    status: '✅ Completed',
    notes: 'Discovered font subsetting breaks Hebrew character mapping - must use subset:false'
  });
  console.log('✅ Implementation session logged\n');

  // Example 2: Log a Stage 2 (Architecture) session
  console.log('Example 2: Logging an architecture design session...');
  await journal.logSession({
    date: new Date().toLocaleDateString('en-CA'),
    startTime: '10:00',
    endTime: '12:30',
    duration: journal.calculateDuration('10:00', '12:30'),
    stage: 'Stage 2: Architecture',
    feature: 'State Management Design',
    description: 'Designed state management architecture using React Context + useReducer pattern. Defined data flow and component hierarchy.',
    filesChanged: 3,
    keyFiles: 'Documents/Architecture/ADRs/ADR-005-state-management.md',
    testsAdded: 'N/A',
    commitHash: '',
    documentation: 'ADR-005: State Management Approach, System-Design/component-architecture.md',
    status: '✅ Completed',
    notes: 'Decided against Redux to keep dependencies minimal for MVP'
  });
  console.log('✅ Architecture session logged\n');

  // Example 3: Log a Stage 1 (Planning) session
  console.log('Example 3: Logging a planning session...');
  await journal.logSession({
    date: new Date().toLocaleDateString('en-CA'),
    startTime: '09:00',
    endTime: '10:30',
    duration: journal.calculateDuration('09:00', '10:30'),
    stage: 'Stage 1: Product Requirements',
    feature: 'Multi-page PDF Form Support',
    description: 'Created PRD for multi-page PDF form handling. Defined user stories, acceptance criteria, and success metrics.',
    filesChanged: 1,
    keyFiles: 'Documents/Development-Process/PRDs/multi-page-pdf-forms-PRD.md',
    testsAdded: 'N/A',
    commitHash: '',
    documentation: 'PRD: Multi-page PDF Form Support',
    status: '✅ Completed',
    notes: 'Identified need for memory optimization when handling large PDFs'
  });
  console.log('✅ Planning session logged\n');

  // Example 4: Get all entries
  console.log('Example 4: Retrieving all journal entries...');
  const allEntries = await journal.getAllEntries();
  console.log(`Total entries in journal: ${allEntries.length - 1}`);  // -1 for header row
  console.log();

  // Example 5: Get entries for today
  console.log('Example 5: Getting entries for today...');
  const todaysEntries = await journal.getEntriesByDate(new Date().toLocaleDateString('en-CA'));
  console.log(`Entries for today: ${todaysEntries.length}`);
  console.log();

  // Example 6: Calculate total hours this week
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());  // Sunday

  console.log('Example 6: Calculating total hours this week...');
  const totalHours = await journal.getTotalHours(
    startOfWeek.toLocaleDateString('en-CA'),
    today.toLocaleDateString('en-CA')
  );
  console.log(`Total hours this week: ${totalHours.toFixed(2)} hours\n`);

  // Success summary
  console.log('═══════════════════════════════════════');
  console.log('✅ ALL EXAMPLES COMPLETED!');
  console.log('═══════════════════════════════════════');
  console.log(`View your journal: https://docs.google.com/spreadsheets/d/${process.env.GOOGLE_SHEETS_JOURNAL_ID}\n`);
}

// Run examples
exampleLogging().catch(console.error);
