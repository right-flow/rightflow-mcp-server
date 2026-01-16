/**
 * Database Connection Module (Phase 0)
 * Railway PostgreSQL connection using Knex.js
 *
 * Aligned with DocsFlow backend architecture for future integration
 */

import knex, { Knex } from 'knex';

let db: Knex | null = null;

/**
 * Get database instance (singleton pattern)
 * Uses Railway PostgreSQL connection from environment
 */
export function getDb(): Knex {
  if (db) {
    return db;
  }

  const databaseUrl = process.env.DATABASE_URL || process.env.DATABASE_PRIVATE_URL;

  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL or DATABASE_PRIVATE_URL environment variable is required. ' +
      'Configure Railway PostgreSQL connection string.',
    );
  }

  // Create Knex instance with PostgreSQL configuration
  db = knex({
    client: 'pg',
    connection: databaseUrl,
    pool: {
      min: 2,
      max: 10,
      // Connection timeout for serverless environments
      acquireTimeoutMillis: 30000,
      // Idle timeout
      idleTimeoutMillis: 30000,
    },
    // Enable debug logging in development
    debug: process.env.NODE_ENV === 'development',
    // Use native SQL string escaping
    useNullAsDefault: false,
  });

  return db;
}

/**
 * Test database connection
 * Returns true if connection successful, false otherwise
 */
export async function testConnection(): Promise<boolean> {
  try {
    const db = getDb();
    await db.raw('SELECT 1');
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

/**
 * Close database connection
 * Important for cleaning up in tests and serverless functions
 */
export async function closeDb(): Promise<void> {
  if (db) {
    await db.destroy();
    db = null;
  }
}

/**
 * Run database migrations
 * Used in deployment and setup scripts
 */
export async function runMigrations(): Promise<void> {
  const db = getDb();
  await db.migrate.latest({
    directory: './src/db/migrations',
  });
}

/**
 * Rollback last migration batch
 * Used for development and testing
 */
export async function rollbackMigrations(): Promise<void> {
  const db = getDb();
  await db.migrate.rollback({
    directory: './src/db/migrations',
  });
}

/**
 * Helper to filter queries by tenant type
 * DocsFlow-ready: supports multi-tenant architecture
 *
 * @param table - Table name
 * @param tenantType - 'rightflow' | 'docsflow'
 */
export function getTenantQuery(table: string, tenantType: 'rightflow' | 'docsflow' = 'rightflow') {
  const db = getDb();
  return db(table).where({ tenant_type: tenantType });
}

/**
 * Export the database instance type for use in other modules
 */
export type Database = Knex;
