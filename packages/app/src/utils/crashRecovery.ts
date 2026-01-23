/**
 * Crash Recovery Utilities
 *
 * Provides automatic backup of application state to localStorage
 * every 30 seconds, with recovery on app restart.
 *
 * Features:
 * - Auto-save every 30 seconds
 * - Restore on app load
 * - Clear recovery data after successful restore
 * - Timestamp tracking for staleness detection
 */

import { FieldDefinition } from '@/types/fields';

const STORAGE_KEY = 'rightflow_crash_recovery';
const AUTO_SAVE_INTERVAL = 30000; // 30 seconds
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface RecoveryData {
  timestamp: number;
  pdfFileName: string | null;
  currentPage: number;
  zoomLevel: number;
  fields: FieldDefinition[];
  totalPages: number;
}

/**
 * Save current state to localStorage for crash recovery
 *
 * @param state - Current application state
 */
export function saveRecoveryData(state: {
  pdfFile: File | null;
  currentPage: number;
  zoomLevel: number;
  fields: FieldDefinition[];
  totalPages: number;
}): void {
  try {
    const recoveryData: RecoveryData = {
      timestamp: Date.now(),
      pdfFileName: state.pdfFile?.name || null,
      currentPage: state.currentPage,
      zoomLevel: state.zoomLevel,
      fields: state.fields,
      totalPages: state.totalPages,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(recoveryData));
    console.log('[Recovery] State saved to localStorage');
  } catch (error) {
    console.error('[Recovery] Failed to save state:', error);
    // Don't throw - recovery save failures shouldn't break the app
  }
}

/**
 * Load recovery data from localStorage
 *
 * @returns Recovery data if available and fresh, null otherwise
 */
export function loadRecoveryData(): RecoveryData | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return null;
    }

    const data: RecoveryData = JSON.parse(stored);

    // Check if data is too old (stale)
    const age = Date.now() - data.timestamp;
    if (age > MAX_AGE_MS) {
      console.log('[Recovery] Recovery data is stale (>24h), ignoring');
      clearRecoveryData();
      return null;
    }

    // Validate data structure
    if (!data.timestamp || !Array.isArray(data.fields)) {
      console.warn('[Recovery] Invalid recovery data structure');
      clearRecoveryData();
      return null;
    }

    console.log(`[Recovery] Found recovery data from ${new Date(data.timestamp).toLocaleString()}`);
    return data;
  } catch (error) {
    console.error('[Recovery] Failed to load recovery data:', error);
    return null;
  }
}

/**
 * Clear recovery data from localStorage
 */
export function clearRecoveryData(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log('[Recovery] Recovery data cleared');
  } catch (error) {
    console.error('[Recovery] Failed to clear recovery data:', error);
  }
}

/**
 * Setup auto-save interval for crash recovery
 *
 * @param getState - Function to get current state
 * @returns Cleanup function to stop auto-save
 */
export function setupAutoSave(getState: () => {
  pdfFile: File | null;
  currentPage: number;
  zoomLevel: number;
  fields: FieldDefinition[];
  totalPages: number;
}): () => void {
  const intervalId = setInterval(() => {
    const state = getState();

    // Only save if there's meaningful state (PDF loaded and fields exist)
    if (state.pdfFile && state.fields.length > 0) {
      saveRecoveryData(state);
    }
  }, AUTO_SAVE_INTERVAL);

  console.log('[Recovery] Auto-save started (every 30 seconds)');

  // Return cleanup function
  return () => {
    clearInterval(intervalId);
    console.log('[Recovery] Auto-save stopped');
  };
}

/**
 * Format recovery data timestamp for display
 *
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted date/time string
 */
export function formatRecoveryTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const now = Date.now();
  const age = now - timestamp;

  // Less than 1 minute ago
  if (age < 60000) {
    return 'ממש עכשיו';
  }

  // Less than 1 hour ago
  if (age < 3600000) {
    const minutes = Math.floor(age / 60000);
    return `לפני ${minutes} דקות`;
  }

  // Less than 24 hours ago
  if (age < 86400000) {
    const hours = Math.floor(age / 3600000);
    return `לפני ${hours} שעות`;
  }

  // Full date/time
  return date.toLocaleString('he-IL', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
