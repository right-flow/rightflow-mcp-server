/**
 * Test Setup - Global test configuration
 */

// Setup environment variables for testing
process.env.RIGHTFLOW_API_URL = 'http://localhost:3003/api/v1';
process.env.RIGHTFLOW_API_KEY = 'test_api_key_12345';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: console.error, // Keep errors visible
};
