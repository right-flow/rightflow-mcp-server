/**
 * Global Test Setup
 *
 * Runs before all tests
 */

import { beforeAll, afterAll } from "vitest";

beforeAll(() => {
  // Set test environment
  process.env.NODE_ENV = "test";

  // Disable audit logging in tests
  process.env.AUDIT_LOG_ENABLED = "false";

  // Set test timeouts
  process.env.TEST_TIMEOUT = "10000";
});

afterAll(() => {
  // Cleanup
});
