/**
 * Vitest setup file
 * Runs before all tests
 */

import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Cleanup after each test case (e.g. clearing jsdom)
afterEach(() => {
  cleanup();
});

// Setup global test environment
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
