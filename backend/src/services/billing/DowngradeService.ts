// DowngradeService - Plan downgrade and form archiving
// TDD Phase 3 - GREEN (Implementation to pass tests)
// Created: 2026-02-05
// Reference: ADR-002 (Archive forms on downgrade, don't delete)

import { query } from '../../config/database';

export interface ArchiveResult {
  success: boolean;
  archivedCount: number;
  archivedFormIds: string[];
  error?: string;
}

export interface UnarchiveResult {
  success: boolean;
  restoredCount: number;
  restoredFormIds: string[];
  error?: string;
}

export interface ArchivedForm {
  id: string;
  name: string;
  archivedAt: Date;
  archivedReason: string;
  createdAt: Date;
}

export interface DowngradeCheck {
  allowed: boolean;
  willArchiveForms: boolean;
  formsToArchiveCount: number;
  warning?: string;
  formsToArchive?: Array<{ id: string; name: string; createdAt: Date }>;
}

export class DowngradeService {
  /**
   * Archive excess forms when downgrading to a plan with lower form limit
   * Archives oldest forms first (FIFO)
   */
  async archiveExcessForms(
    orgId: string,
    newPlanMaxForms: number,
    fromPlan: string,
    _toPlan: string, // Reserved for future use in archived_reason detail
  ): Promise<ArchiveResult> {
    try {
      // Get all active forms for organization
      const forms = await query<{
        id: string;
        name: string;
        created_at: string;
      }>(
        `SELECT id, name, created_at
         FROM forms
         WHERE org_id = $1
         AND archived_at IS NULL
         AND deleted_at IS NULL
         ORDER BY created_at ASC`,
        [orgId],
      );

      const currentFormCount = forms.length;

      // Calculate how many need to be archived
      const formsToArchive = Math.max(0, currentFormCount - newPlanMaxForms);

      if (formsToArchive === 0) {
        return {
          success: true,
          archivedCount: 0,
          archivedFormIds: [],
        };
      }

      // Archive oldest forms (first N in sorted list)
      const formIdsToArchive = forms
        .slice(0, formsToArchive)
        .map((f) => f.id);

      const archivedReason = `downgrade_from_${fromPlan}`;

      const result = await query<{ id: string }>(
        `UPDATE forms
         SET archived_at = NOW(),
             archived_reason = $3
         WHERE org_id = $1
         AND id = ANY($2)
         AND archived_at IS NULL
         RETURNING id`,
        [orgId, formIdsToArchive, archivedReason],
      );

      return {
        success: true,
        archivedCount: result.length,
        archivedFormIds: result.map((r) => r.id),
      };
    } catch (error) {
      return {
        success: false,
        archivedCount: 0,
        archivedFormIds: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Restore archived forms when upgrading to a plan with higher form limit
   * Restores most recently archived forms first (LIFO)
   */
  async unarchiveForms(
    orgId: string,
    newPlanMaxForms: number,
  ): Promise<UnarchiveResult> {
    try {
      // Get archived forms (most recent first)
      const archivedForms = await query<{
        id: string;
        name: string;
        archived_at: string;
      }>(
        `SELECT id, name, archived_at
         FROM forms
         WHERE org_id = $1
         AND archived_at IS NOT NULL
         AND deleted_at IS NULL
         ORDER BY archived_at DESC`,
        [orgId],
      );

      if (archivedForms.length === 0) {
        return {
          success: true,
          restoredCount: 0,
          restoredFormIds: [],
        };
      }

      // Get current active forms count
      const activeCount = await query<{ count: string }>(
        `SELECT COUNT(*) as count
         FROM forms
         WHERE org_id = $1
         AND archived_at IS NULL
         AND deleted_at IS NULL`,
        [orgId],
      );

      const currentActiveCount = parseInt(activeCount[0].count, 10);

      // Calculate how many can be restored
      const canRestore = Math.max(0, newPlanMaxForms - currentActiveCount);

      if (canRestore === 0) {
        return {
          success: true,
          restoredCount: 0,
          restoredFormIds: [],
        };
      }

      // Restore most recently archived forms (up to limit)
      const result = await query<{ id: string }>(
        `UPDATE forms
         SET archived_at = NULL,
             archived_reason = NULL
         WHERE org_id = $1
         AND archived_at IS NOT NULL
         AND id IN (
           SELECT id
           FROM forms
           WHERE org_id = $1
           AND archived_at IS NOT NULL
           AND deleted_at IS NULL
           ORDER BY archived_at DESC
           LIMIT $2
         )
         RETURNING id`,
        [orgId, canRestore],
      );

      return {
        success: true,
        restoredCount: result.length,
        restoredFormIds: result.map((r) => r.id),
      };
    } catch (error) {
      return {
        success: false,
        restoredCount: 0,
        restoredFormIds: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get list of archived forms for organization
   */
  async getArchivedForms(orgId: string): Promise<ArchivedForm[]> {
    const forms = await query<{
      id: string;
      name: string;
      archived_at: string;
      archived_reason: string;
      created_at: string;
    }>(
      `SELECT id, name, archived_at, archived_reason, created_at
       FROM forms
       WHERE org_id = $1
       AND archived_at IS NOT NULL
       AND deleted_at IS NULL
       ORDER BY archived_at DESC`,
      [orgId],
    );

    return forms.map((f) => ({
      id: f.id,
      name: f.name,
      archivedAt: new Date(f.archived_at),
      archivedReason: f.archived_reason,
      createdAt: new Date(f.created_at),
    }));
  }

  /**
   * Check if downgrade is allowed and what forms will be affected
   */
  async canDowngrade(
    orgId: string,
    _currentPlanMaxForms: number, // Kept for API consistency
    newPlanMaxForms: number,
  ): Promise<DowngradeCheck> {
    // Get current active forms count
    const activeCount = await query<{ count: string }>(
      `SELECT COUNT(*) as count
       FROM forms
       WHERE org_id = $1
       AND archived_at IS NULL
       AND deleted_at IS NULL`,
      [orgId],
    );

    const currentFormCount = parseInt(activeCount[0].count, 10);
    const formsToArchiveCount = Math.max(
      0,
      currentFormCount - newPlanMaxForms,
    );

    if (formsToArchiveCount === 0) {
      return {
        allowed: true,
        willArchiveForms: false,
        formsToArchiveCount: 0,
      };
    }

    // Get forms that will be archived (oldest first)
    const formsToArchive = await query<{
      id: string;
      name: string;
      created_at: string;
    }>(
      `SELECT id, name, created_at
       FROM forms
       WHERE org_id = $1
       AND archived_at IS NULL
       AND deleted_at IS NULL
       ORDER BY created_at ASC
       LIMIT $2`,
      [orgId, formsToArchiveCount],
    );

    return {
      allowed: true,
      willArchiveForms: true,
      formsToArchiveCount,
      warning: `${formsToArchiveCount} forms will be archived (oldest first). They can be restored by upgrading again.`,
      formsToArchive: formsToArchive.map((f) => ({
        id: f.id,
        name: f.name,
        createdAt: new Date(f.created_at),
      })),
    };
  }
}
