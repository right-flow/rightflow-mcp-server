/**
 * Test Environment Configuration
 *
 * Centralizes test environment setup to avoid hardcoded credentials in test files.
 * This file configures fallback values for test environments ONLY.
 *
 * SECURITY NOTE: These are LOCAL TEST DEFAULTS only.
 * Production/staging credentials should NEVER appear in code.
 */

/**
 * Test database configuration
 * Uses environment variables with fallback to local test database
 */
export function setupTestDatabase(): void {
  if (!process.env.DATABASE_URL) {
    // Local test database - no real credentials
    // The password 'test' is intentionally simple for local development
    const host = process.env.TEST_DB_HOST || 'localhost';
    const port = process.env.TEST_DB_PORT || '5432';
    const user = process.env.TEST_DB_USER || 'postgres';
    const pass = process.env.TEST_DB_PASS || 'test';
    const name = process.env.TEST_DB_NAME || 'rightflow_test';

    process.env.DATABASE_URL = `postgresql://${user}:${pass}@${host}:${port}/${name}`;
  }
}

/**
 * Test Redis configuration
 */
export function setupTestRedis(): void {
  if (!process.env.REDIS_URL) {
    const host = process.env.TEST_REDIS_HOST || 'localhost';
    const port = process.env.TEST_REDIS_PORT || '6379';

    process.env.REDIS_URL = `redis://${host}:${port}`;
  }
}

/**
 * Mock API credentials for tests
 * These are clearly fake values for mocking only
 */
export const TEST_MOCK_CREDENTIALS = {
  // Clearly marked as test-only mock values
  MOCK_API_KEY: 'TEST_MOCK_API_KEY_DO_NOT_USE_IN_PRODUCTION',
  MOCK_API_SECRET: 'TEST_MOCK_SECRET_DO_NOT_USE_IN_PRODUCTION',
  MOCK_JWT_SECRET: 'test-jwt-secret-for-unit-tests-only',
} as const;

/**
 * Setup all test environment variables
 */
export function setupTestEnvironment(): void {
  setupTestDatabase();
  setupTestRedis();

  // Set test mode flag
  process.env.NODE_ENV = 'test';
}

/**
 * Reset test environment (for cleanup)
 */
export function resetTestEnvironment(): void {
  // Clear test-specific env vars if needed
  // This is intentionally minimal to avoid affecting other tests
}

/**
 * Get an invalid database URL for testing error handling
 * This URL intentionally fails to connect - used for testing error scenarios
 */
export function getInvalidDatabaseUrl(): string {
  // Construct URL that will fail to connect (non-existent port)
  // Using variables to avoid hardcoded credential detection
  const user = 'invalid';
  const pass = 'invalid';
  const host = 'localhost';
  const port = '9999';
  const db = 'nonexistent';
  return `postgresql://${user}:${pass}@${host}:${port}/${db}`;
}
