/**
 * Unit Tests for Onboarding Helper Functions
 * TDD Approach - Tests written first
 * Date: 2026-02-06
 */

import {
  calculateDaysSince,
  getQuotaPercentage,
  shouldShowQuotaWarning,
  isPowerUser,
  shouldShowHybridPrompt,
} from '../onboardingHelpers';

describe('onboardingHelpers', () => {
  describe('calculateDaysSince', () => {
    test('returns 0 for today', () => {
      const today = new Date().toISOString();
      expect(calculateDaysSince(today)).toBe(0);
    });

    test('returns 7 for 7 days ago', () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      expect(calculateDaysSince(sevenDaysAgo.toISOString())).toBe(7);
    });

    test('returns 30 for 30 days ago', () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      expect(calculateDaysSince(thirtyDaysAgo.toISOString())).toBe(30);
    });

    test('returns 1 for yesterday', () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      expect(calculateDaysSince(yesterday.toISOString())).toBe(1);
    });

    test('handles edge case of exactly midnight', () => {
      const todayMidnight = new Date();
      todayMidnight.setHours(0, 0, 0, 0);
      const result = calculateDaysSince(todayMidnight.toISOString());
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(1);
    });
  });

  describe('getQuotaPercentage', () => {
    test('returns 0% for no usage', () => {
      expect(getQuotaPercentage(0, 50)).toBe(0);
    });

    test('returns 50% for half usage', () => {
      expect(getQuotaPercentage(25, 50)).toBe(50);
    });

    test('returns 80% for 80% usage', () => {
      expect(getQuotaPercentage(40, 50)).toBe(80);
    });

    test('returns 100% for full usage', () => {
      expect(getQuotaPercentage(50, 50)).toBe(100);
    });

    test('returns > 100% for over usage', () => {
      expect(getQuotaPercentage(60, 50)).toBe(120);
    });

    test('handles decimal results', () => {
      expect(getQuotaPercentage(33, 50)).toBe(66);
    });

    test('handles zero max (edge case)', () => {
      expect(getQuotaPercentage(0, 0)).toBe(0);
    });
  });

  describe('shouldShowQuotaWarning', () => {
    test('returns true for exactly 80% usage', () => {
      expect(shouldShowQuotaWarning(80)).toBe(true);
    });

    test('returns true for 90% usage', () => {
      expect(shouldShowQuotaWarning(90)).toBe(true);
    });

    test('returns true for 100% usage', () => {
      expect(shouldShowQuotaWarning(100)).toBe(true);
    });

    test('returns false for 79% usage', () => {
      expect(shouldShowQuotaWarning(79)).toBe(false);
    });

    test('returns false for 70% usage', () => {
      expect(shouldShowQuotaWarning(70)).toBe(false);
    });

    test('returns false for 50% usage', () => {
      expect(shouldShowQuotaWarning(50)).toBe(false);
    });

    test('returns false for 0% usage', () => {
      expect(shouldShowQuotaWarning(0)).toBe(false);
    });
  });

  describe('isPowerUser', () => {
    test('returns true for exactly 5 forms', () => {
      expect(isPowerUser(5, 10)).toBe(true);
    });

    test('returns true for more than 5 forms', () => {
      expect(isPowerUser(10, 5)).toBe(true);
    });

    test('returns true for exactly 40 responses', () => {
      expect(isPowerUser(2, 40)).toBe(true);
    });

    test('returns true for more than 40 responses', () => {
      expect(isPowerUser(1, 50)).toBe(true);
    });

    test('returns true when both thresholds met', () => {
      expect(isPowerUser(5, 40)).toBe(true);
    });

    test('returns false for 4 forms and 39 responses', () => {
      expect(isPowerUser(4, 39)).toBe(false);
    });

    test('returns false for low usage', () => {
      expect(isPowerUser(2, 20)).toBe(false);
    });

    test('returns false for zero usage', () => {
      expect(isPowerUser(0, 0)).toBe(false);
    });
  });

  describe('shouldShowHybridPrompt', () => {
    test('returns true for exactly 14 days and 3 forms', () => {
      expect(shouldShowHybridPrompt(14, 3, 10)).toBe(true);
    });

    test('returns true for exactly 14 days and 20 responses', () => {
      expect(shouldShowHybridPrompt(14, 1, 20)).toBe(true);
    });

    test('returns true for 20 days and 5 forms', () => {
      expect(shouldShowHybridPrompt(20, 5, 10)).toBe(true);
    });

    test('returns true for 30 days and 30 responses', () => {
      expect(shouldShowHybridPrompt(30, 1, 30)).toBe(true);
    });

    test('returns true when both engagement thresholds met', () => {
      expect(shouldShowHybridPrompt(14, 3, 20)).toBe(true);
    });

    test('returns false for 13 days (time threshold not met)', () => {
      expect(shouldShowHybridPrompt(13, 5, 30)).toBe(false);
    });

    test('returns false for 10 days even with high engagement', () => {
      expect(shouldShowHybridPrompt(10, 10, 50)).toBe(false);
    });

    test('returns false for 14+ days but low engagement', () => {
      expect(shouldShowHybridPrompt(20, 2, 15)).toBe(false);
    });

    test('returns false for 14+ days but zero engagement', () => {
      expect(shouldShowHybridPrompt(20, 0, 0)).toBe(false);
    });

    test('returns false for edge case: 14 days, 2 forms, 19 responses', () => {
      expect(shouldShowHybridPrompt(14, 2, 19)).toBe(false);
    });
  });
});
