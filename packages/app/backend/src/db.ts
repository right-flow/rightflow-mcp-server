/**
 * Database Module - Knex instance for workflow operations
 * Provides a query builder interface for the backend services
 */

import knex, { Knex } from 'knex';
import logger from './utils/logger';

let dbInstance: Knex | null = null;

/**
 * Get database instance (singleton pattern)
 * Uses Railway PostgreSQL connection from environment
 */
export function getDb(): Knex {
  if (dbInstance) {
    return dbInstance;
  }

  const databaseUrl = process.env.DATABASE_URL || process.env.DATABASE_PRIVATE_URL;

  if (!databaseUrl) {
    logger.error('Database URL not configured');
    throw new Error(
      'DATABASE_URL or DATABASE_PRIVATE_URL environment variable is required.'
    );
  }

  // Create Knex instance with PostgreSQL configuration
  dbInstance = knex({
    client: 'pg',
    connection: {
      connectionString: databaseUrl,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    },
    pool: {
      min: 0,
      max: 10,
      acquireTimeoutMillis: 30000,
      idleTimeoutMillis: 10000,
    },
    debug: process.env.NODE_ENV === 'development',
  });

  logger.info('Database connection initialized');
  return dbInstance;
}

/**
 * Close database connection
 */
export async function closeDb(): Promise<void> {
  if (dbInstance) {
    await dbInstance.destroy();
    dbInstance = null;
    logger.info('Database connection closed');
  }
}

// Export the database instance
export const db = getDb();
