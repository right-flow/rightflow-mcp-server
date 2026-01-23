import { Pool, QueryResult, QueryResultRow } from 'pg';
import { config } from './env';
import logger from '../utils/logger';

// Create PostgreSQL connection pool
export const pool = new Pool({
  connectionString: config.DATABASE_URL,
  ssl: config.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20, // Max connections in pool (Railway free tier limit: 100)
  idleTimeoutMillis: 30000, // Close idle connections after 30s
  connectionTimeoutMillis: 2000, // Fail fast if no connection available
});

// Pool error handling
pool.on('error', (err) => {
  logger.error('Unexpected database error', { error: err.message, stack: err.stack });
});

// Pool connection event (for debugging)
pool.on('connect', () => {
  logger.debug('New database connection established');
});

// Type-safe query helper
export async function query<T extends QueryResultRow = any>(
  sql: string,
  params: any[] = [],
): Promise<T[]> {
  const start = Date.now();
  try {
    const result: QueryResult<T> = await pool.query<T>(sql, params);
    const duration = Date.now() - start;

    logger.debug('Database query executed', {
      sql: sql.substring(0, 100), // Log first 100 chars
      params: params.length,
      rows: result.rowCount,
      duration: `${duration}ms`,
    });

    return result.rows;
  } catch (error: any) {
    const duration = Date.now() - start;
    logger.error('Database query failed', {
      sql: sql.substring(0, 100),
      params,
      error: error.message,
      duration: `${duration}ms`,
    });
    throw error;
  }
}

// Query helper that returns full QueryResult (with rowCount)
export async function queryWithMeta<T extends QueryResultRow = any>(
  sql: string,
  params: any[] = [],
): Promise<QueryResult<T>> {
  const start = Date.now();
  try {
    const result: QueryResult<T> = await pool.query<T>(sql, params);
    const duration = Date.now() - start;

    logger.debug('Database query executed', {
      sql: sql.substring(0, 100),
      params: params.length,
      rows: result.rowCount,
      duration: `${duration}ms`,
    });

    return result;
  } catch (error: any) {
    const duration = Date.now() - start;
    logger.error('Database query failed', {
      sql: sql.substring(0, 100),
      params,
      error: error.message,
      duration: `${duration}ms`,
    });
    throw error;
  }
}

// Health check function
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await pool.query('SELECT 1');
    logger.info('✅ Database connection healthy');
    return true;
  } catch (error: any) {
    logger.error('❌ Database connection failed', { error: error.message });
    return false;
  }
}

// Graceful shutdown
export async function closeDatabaseConnection(): Promise<void> {
  await pool.end();
  logger.info('Database connection pool closed');
}
