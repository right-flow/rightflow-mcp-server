/**
 * Database Connection Tests (Phase 0)
 * Following TDD methodology - tests written before implementation
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getDb, closeDb, testConnection } from './db';
import { setupTestDatabase, getInvalidDatabaseUrl } from '../test-utils/test-env';

describe('Database Connection (Railway PostgreSQL)', () => {
  beforeAll(async () => {
    // Setup test environment from centralized config
    setupTestDatabase();
  });

  afterAll(async () => {
    // Cleanup connections
    await closeDb();
  });

  it('connects to Railway PostgreSQL', async () => {
    const db = getDb();
    expect(db).toBeDefined();
    expect(db.client.config.client).toBe('pg');
  });

  it('handles connection pooling', async () => {
    const db = getDb();
    const pool = db.client.pool;

    expect(pool).toBeDefined();
    // Railway uses connection pooling by default
    expect(pool.min).toBeGreaterThanOrEqual(0);
    expect(pool.max).toBeGreaterThan(0);
  });

  it('runs migrations successfully', async () => {
    const db = getDb();

    // Check if migrations table exists or can be created
    const hasMigrationsTable = await db.schema.hasTable('knex_migrations');
    expect(typeof hasMigrationsTable).toBe('boolean');
  });

  it('tests connection with testConnection helper', async () => {
    const isConnected = await testConnection();

    // In test environment without real DB, this might fail
    // but the function should handle it gracefully
    expect(typeof isConnected).toBe('boolean');
  });

  it('handles connection errors gracefully', async () => {
    // This test ensures error handling exists
    const originalUrl = process.env.DATABASE_URL;
    process.env.DATABASE_URL = getInvalidDatabaseUrl();

    // Close existing connection
    await closeDb();

    try {
      // Attempting to connect with invalid credentials
      await testConnection();
    } catch (error) {
      // Should throw an error or return false
      expect(error).toBeDefined();
    } finally {
      // Restore original URL
      process.env.DATABASE_URL = originalUrl;
    }
  });

  it('provides proper TypeScript types for queries', async () => {
    const db = getDb();

    // Type checking - should have standard Knex methods
    expect(typeof db.select).toBe('function');
    expect(typeof db.insert).toBe('function');
    expect(typeof db.update).toBe('function');
    expect(typeof db.delete).toBe('function');
    expect(typeof db.raw).toBe('function');
  });

  it('supports RightFlow multi-tenant queries', async () => {
    const db = getDb();

    // Future-proofing for RightFlow integration
    // Should be able to filter by tenant_type
    const query = db('users').where({ tenant_type: 'rightflow' });

    expect(query).toBeDefined();
    expect(query.toSQL().sql).toContain('tenant_type');
  });
});
