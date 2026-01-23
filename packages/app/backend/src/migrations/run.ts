import fs from 'fs/promises';
import path from 'path';
import { pool, query } from '../config/database';
import logger from '../utils/logger';

async function runMigrations() {
  try {
    logger.info('🔄 Running database migrations...');

    // Create migrations tracking table if it doesn't exist
    await query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename TEXT UNIQUE NOT NULL,
        applied_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Get list of applied migrations
    const appliedMigrations = await query<{ filename: string }>(
      'SELECT filename FROM migrations ORDER BY id',
    );
    const appliedSet = new Set(appliedMigrations.map(m => m.filename));

    // Read migration files
    const migrationsDir = path.join(__dirname, '../../migrations');
    const files = await fs.readdir(migrationsDir);
    const sqlFiles = files.filter(f => f.endsWith('.sql')).sort();

    logger.info(`Found ${sqlFiles.length} migration files`);

    // Run pending migrations
    for (const filename of sqlFiles) {
      if (appliedSet.has(filename)) {
        logger.info(`⏭️  Skipping ${filename} (already applied)`);
        continue;
      }

      logger.info(`▶️  Applying ${filename}...`);

      const filePath = path.join(migrationsDir, filename);
      const sql = await fs.readFile(filePath, 'utf-8');

      // Run migration in transaction
      await pool.query('BEGIN');
      try {
        await pool.query(sql);
        await pool.query(
          'INSERT INTO migrations (filename) VALUES ($1)',
          [filename],
        );
        await pool.query('COMMIT');
        logger.info(`✅ Applied ${filename}`);
      } catch (error: any) {
        await pool.query('ROLLBACK');
        logger.error(`❌ Failed to apply ${filename}`, { error: error.message });
        throw error;
      }
    }

    logger.info('✅ All migrations completed successfully');
    process.exit(0);
  } catch (error: any) {
    logger.error('❌ Migration failed', { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

runMigrations();
