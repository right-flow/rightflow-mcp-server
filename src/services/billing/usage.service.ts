/**
 * Usage Tracking Service
 * Centralized service for tracking user usage metrics
 * - Forms count (total active forms)
 * - Responses count (monthly submissions)
 * - Storage used (total bytes)
 */

import { getDb } from '../../lib/db';
import type { Knex } from 'knex';

export interface UsageMetrics {
  forms_count: number;
  responses_count: number;
  storage_used_bytes: number;
  period_start: Date;
  period_end: Date;
}

export class UsageService {
  private db: Knex;

  constructor() {
    this.db = getDb();
  }

  /**
   * Get user's current monthly usage
   * Creates a new usage record if one doesn't exist for the current period
   */
  async getCurrentUsage(userId: string): Promise<UsageMetrics> {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Use transaction to prevent race condition when creating/updating records
    const usage = await this.db.transaction(async (trx) => {
      // Try to get existing usage record for current period (with row lock)
      const existingUsage = await trx('usage_metrics')
        .where({ user_id: userId })
        .forUpdate()
        .first();

      // Create new record if doesn't exist or period expired
      if (!existingUsage || new Date(existingUsage.period_end) < now) {
        // If old record exists, preserve forms_count and storage_used_bytes
        const preservedFormsCount = existingUsage?.forms_count || 0;
        const preservedStorage = existingUsage?.storage_used_bytes || 0;

        // Delete old record if exists
        if (existingUsage) {
          await trx('usage_metrics').where({ id: existingUsage.id }).del();
        }

        // Create new record
        const [newUsage] = await trx('usage_metrics')
          .insert({
            id: crypto.randomUUID(),
            user_id: userId,
            forms_count: preservedFormsCount,
            responses_count: 0, // Reset monthly counter
            storage_used_bytes: preservedStorage,
            period_start: periodStart,
            period_end: periodEnd,
          })
          .returning('*');

        return newUsage;
      }

      return existingUsage;
    });

    return {
      forms_count: Number(usage.forms_count),
      responses_count: Number(usage.responses_count),
      storage_used_bytes: Number(usage.storage_used_bytes),
      period_start: new Date(usage.period_start),
      period_end: new Date(usage.period_end),
    };
  }

  /**
   * Increment forms count (call when form is created)
   */
  async incrementFormsCount(userId: string): Promise<void> {
    await this.ensureUsageRecord(userId);

    // Use subquery to target most recent record atomically
    const subquery = this.db('usage_metrics')
      .where({ user_id: userId })
      .orderBy('period_end', 'desc')
      .limit(1)
      .select('id');

    await this.db('usage_metrics')
      .where('id', 'in', subquery)
      .increment('forms_count', 1);
  }

  /**
   * Decrement forms count (call when form is deleted)
   * Does not go below zero
   */
  async decrementFormsCount(userId: string): Promise<void> {
    await this.ensureUsageRecord(userId);

    // Use conditional decrement with orderBy to target most recent record
    // This prevents race condition by using a single atomic query
    const subquery = this.db('usage_metrics')
      .where({ user_id: userId })
      .orderBy('period_end', 'desc')
      .limit(1)
      .select('id');

    await this.db('usage_metrics')
      .where('id', 'in', subquery)
      .where('forms_count', '>', 0)
      .decrement('forms_count', 1);
  }

  /**
   * Increment responses count (call when form is submitted)
   */
  async incrementResponsesCount(userId: string): Promise<void> {
    await this.ensureUsageRecord(userId);

    // Use subquery to target most recent record atomically
    const subquery = this.db('usage_metrics')
      .where({ user_id: userId })
      .orderBy('period_end', 'desc')
      .limit(1)
      .select('id');

    await this.db('usage_metrics')
      .where('id', 'in', subquery)
      .increment('responses_count', 1);
  }

  /**
   * Decrement responses count (call when response is deleted)
   * Does not go below zero
   */
  async decrementResponsesCount(userId: string): Promise<void> {
    await this.ensureUsageRecord(userId);

    // Use conditional decrement with orderBy to target most recent record
    const subquery = this.db('usage_metrics')
      .where({ user_id: userId })
      .orderBy('period_end', 'desc')
      .limit(1)
      .select('id');

    await this.db('usage_metrics')
      .where('id', 'in', subquery)
      .where('responses_count', '>', 0)
      .decrement('responses_count', 1);
  }

  /**
   * Update storage usage
   * @param bytesChange - Positive for additions, negative for deletions
   */
  async updateStorageUsage(userId: string, bytesChange: number): Promise<void> {
    await this.ensureUsageRecord(userId);

    // Use subquery to target most recent record and raw SQL to prevent race conditions
    const subquery = this.db('usage_metrics')
      .where({ user_id: userId })
      .orderBy('period_end', 'desc')
      .limit(1)
      .select('id');

    await this.db('usage_metrics')
      .where('id', 'in', subquery)
      .update({
        storage_used_bytes: this.db.raw('GREATEST(0, storage_used_bytes + ?)', [bytesChange]),
      });
  }

  /**
   * Reset monthly counters (scheduled job)
   * Resets responses_count for all users
   * Preserves forms_count and storage_used_bytes
   */
  async resetMonthlyCounters(): Promise<void> {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Reset responses_count for all expired records
    await this.db('usage_metrics')
      .where('period_end', '<', now)
      .update({
        responses_count: 0,
        period_start: periodStart,
        period_end: periodEnd,
      });
  }

  /**
   * Ensure usage record exists for user and is current
   * Helper method for increment operations
   * Creates a new record if none exists or if the current period has expired
   * Uses transaction to prevent race condition
   */
  private async ensureUsageRecord(userId: string): Promise<void> {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Use transaction to prevent race condition when checking/creating records
    await this.db.transaction(async (trx) => {
      // Get the most recent usage record for this user (with row lock)
      const existing = await trx('usage_metrics')
        .where({ user_id: userId })
        .orderBy('period_end', 'desc')
        .forUpdate()
        .first();

      // Create new record if doesn't exist or period has expired
      if (!existing || new Date(existing.period_end) < now) {
        // If old record exists, preserve forms_count and storage_used_bytes
        const preservedFormsCount = existing?.forms_count || 0;
        const preservedStorage = existing?.storage_used_bytes || 0;

        // Delete old expired records to prevent accumulation
        if (existing) {
          await trx('usage_metrics')
            .where({ user_id: userId })
            .where('period_end', '<', now)
            .del();
        }

        // Create new record for current period
        await trx('usage_metrics').insert({
          id: crypto.randomUUID(),
          user_id: userId,
          forms_count: preservedFormsCount,
          responses_count: 0, // Reset monthly counter
          storage_used_bytes: preservedStorage,
          period_start: periodStart,
          period_end: periodEnd,
        });
      }
    });
  }
}
