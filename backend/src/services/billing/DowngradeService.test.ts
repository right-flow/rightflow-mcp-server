// DowngradeService Unit Tests
// TDD Phase 3 - RED (Tests written first, implementation will follow)
// Created: 2026-02-05
// Purpose: Test plan downgrade and form archiving logic
// Reference: ADR-002 (Archive forms on downgrade, don't delete)

import { DowngradeService } from './DowngradeService';
import { query } from '../../config/database';

// Mock database
jest.mock('../../config/database');
const mockQuery = query as jest.MockedFunction<typeof query>;

describe('DowngradeService', () => {
  let service: DowngradeService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DowngradeService();
  });

  describe('archiveExcessForms', () => {
    it('should archive forms when downgrading from BASIC to FREE', async () => {
      // FREE plan allows 3 forms, BASIC has 5
      const orgId = 'org-123';
      const newPlanMaxForms = 3;

      // Mock forms query (5 active forms)
      mockQuery.mockResolvedValueOnce([
        { id: 'form-1', name: 'Form 1', created_at: '2026-01-01' },
        { id: 'form-2', name: 'Form 2', created_at: '2026-01-02' },
        { id: 'form-3', name: 'Form 3', created_at: '2026-01-03' },
        { id: 'form-4', name: 'Form 4', created_at: '2026-01-04' },
        { id: 'form-5', name: 'Form 5', created_at: '2026-01-05' },
      ]);

      // Mock archive update (oldest 2 forms: form-1, form-2)
      mockQuery.mockResolvedValueOnce([
        { id: 'form-1' },
        { id: 'form-2' },
      ]);

      const result = await service.archiveExcessForms(
        orgId,
        newPlanMaxForms,
        'BASIC',
        'FREE',
      );

      expect(result.success).toBe(true);
      expect(result.archivedCount).toBe(2);
      expect(result.archivedFormIds).toEqual(['form-1', 'form-2']);

      // Verify archive query was called
      expect(mockQuery).toHaveBeenCalledTimes(2); // SELECT + UPDATE

      // Verify UPDATE query parameters
      const calls = mockQuery.mock.calls;
      const updateQueryIndex = calls.findIndex(call =>
        typeof call[0] === 'string' && call[0].includes('UPDATE forms')
      );
      expect(updateQueryIndex).toBeGreaterThan(-1);

      // Check the UPDATE call parameters (archives oldest forms first)
      expect(calls[updateQueryIndex][1]).toEqual([
        orgId,
        ['form-1', 'form-2'],
        'downgrade_from_BASIC'
      ]);
    });

    it('should archive oldest forms first (FIFO)', async () => {
      const orgId = 'org-expanded';
      const newPlanMaxForms = 10;

      // Mock 15 forms (need to archive 5)
      const forms = Array.from({ length: 15 }, (_, i) => ({
        id: `form-${i + 1}`,
        name: `Form ${i + 1}`,
        created_at: new Date(2026, 0, i + 1).toISOString(),
      }));

      mockQuery.mockResolvedValueOnce(forms);

      // Mock archive update (oldest 5 forms)
      mockQuery.mockResolvedValueOnce([
        { id: 'form-1' },
        { id: 'form-2' },
        { id: 'form-3' },
        { id: 'form-4' },
        { id: 'form-5' },
      ]);

      const result = await service.archiveExcessForms(
        orgId,
        newPlanMaxForms,
        'EXPANDED',
        'BASIC',
      );

      expect(result.success).toBe(true);
      expect(result.archivedCount).toBe(5);

      // Verify oldest forms archived (check ORDER BY in query)
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY created_at ASC'),
        expect.any(Array),
      );
    });

    it('should not archive any forms if under new limit', async () => {
      const orgId = 'org-123';
      const newPlanMaxForms = 10;

      // Mock only 3 forms (under limit)
      mockQuery.mockResolvedValueOnce([
        { id: 'form-1', name: 'Form 1', created_at: '2026-01-01' },
        { id: 'form-2', name: 'Form 2', created_at: '2026-01-02' },
        { id: 'form-3', name: 'Form 3', created_at: '2026-01-03' },
      ]);

      const result = await service.archiveExcessForms(
        orgId,
        newPlanMaxForms,
        'BASIC',
        'FREE',
      );

      expect(result.success).toBe(true);
      expect(result.archivedCount).toBe(0);
      expect(result.archivedFormIds).toEqual([]);

      // Should only query forms, not update
      expect(mockQuery).toHaveBeenCalledTimes(1);
    });

    it('should include downgrade reason in archived_reason field', async () => {
      const orgId = 'org-123';
      const newPlanMaxForms = 3;

      mockQuery.mockResolvedValueOnce([
        { id: 'form-1', created_at: '2026-01-01' },
        { id: 'form-2', created_at: '2026-01-02' },
        { id: 'form-3', created_at: '2026-01-03' },
        { id: 'form-4', created_at: '2026-01-04' },
      ]);

      mockQuery.mockResolvedValueOnce([{ id: 'form-4' }]);

      await service.archiveExcessForms(orgId, newPlanMaxForms, 'BASIC', 'FREE');

      // Check that archived_reason includes from and to plans
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('archived_reason'),
        expect.arrayContaining([
          expect.stringMatching(/downgrade_from_BASIC/),
        ]),
      );
    });

    it('should handle database errors gracefully', async () => {
      const orgId = 'org-error';
      const newPlanMaxForms = 3;

      mockQuery.mockRejectedValueOnce(new Error('Database connection failed'));

      const result = await service.archiveExcessForms(
        orgId,
        newPlanMaxForms,
        'BASIC',
        'FREE',
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Database connection failed');
    });
  });

  describe('unarchiveForms', () => {
    it('should restore archived forms on upgrade', async () => {
      const orgId = 'org-123';
      const newPlanMaxForms = 10;

      // Mock 2 archived forms
      mockQuery.mockResolvedValueOnce([
        {
          id: 'form-1',
          name: 'Form 1',
          archived_at: '2026-01-15',
          archived_reason: 'downgrade_from_BASIC',
        },
        {
          id: 'form-2',
          name: 'Form 2',
          archived_at: '2026-01-15',
          archived_reason: 'downgrade_from_BASIC',
        },
      ]);

      // Mock current active forms count (3 active)
      mockQuery.mockResolvedValueOnce([{ count: '3' }]);

      // Mock unarchive update
      mockQuery.mockResolvedValueOnce([{ id: 'form-1' }, { id: 'form-2' }]);

      const result = await service.unarchiveForms(orgId, newPlanMaxForms);

      expect(result.success).toBe(true);
      expect(result.restoredCount).toBe(2);
      expect(result.restoredFormIds).toEqual(['form-1', 'form-2']);
    });

    it('should restore only up to new plan limit', async () => {
      const orgId = 'org-123';
      const newPlanMaxForms = 10;

      // Mock 5 archived forms
      const archivedForms = Array.from({ length: 5 }, (_, i) => ({
        id: `form-${i + 1}`,
        archived_at: '2026-01-15',
        archived_reason: 'downgrade_from_EXPANDED',
      }));
      mockQuery.mockResolvedValueOnce(archivedForms);

      // Mock 8 current active forms (can only restore 2 more)
      mockQuery.mockResolvedValueOnce([{ count: '8' }]);

      // Mock restore only 2 forms
      mockQuery.mockResolvedValueOnce([{ id: 'form-1' }, { id: 'form-2' }]);

      const result = await service.unarchiveForms(orgId, newPlanMaxForms);

      expect(result.success).toBe(true);
      expect(result.restoredCount).toBe(2);

      // Verify LIMIT clause in query
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $2'),
        expect.arrayContaining([orgId, 2]),
      );
    });

    it('should restore most recently archived forms first (LIFO)', async () => {
      const orgId = 'org-123';
      const newPlanMaxForms = 10;

      mockQuery.mockResolvedValueOnce([
        { id: 'form-1', archived_at: '2026-01-10' },
        { id: 'form-2', archived_at: '2026-01-15' },
      ]);

      mockQuery.mockResolvedValueOnce([{ count: '5' }]);
      mockQuery.mockResolvedValueOnce([{ id: 'form-2' }]);

      await service.unarchiveForms(orgId, newPlanMaxForms);

      // Verify ORDER BY archived_at DESC (most recent first)
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY archived_at DESC'),
        expect.any(Array),
      );
    });

    it('should not restore if already at plan limit', async () => {
      const orgId = 'org-full';
      const newPlanMaxForms = 10;

      mockQuery.mockResolvedValueOnce([
        { id: 'form-1', archived_at: '2026-01-15' },
      ]);

      // Mock 10 active forms (at limit)
      mockQuery.mockResolvedValueOnce([{ count: '10' }]);

      const result = await service.unarchiveForms(orgId, newPlanMaxForms);

      expect(result.success).toBe(true);
      expect(result.restoredCount).toBe(0);
      expect(mockQuery).toHaveBeenCalledTimes(2); // Only query archived + count
    });
  });

  describe('getArchivedForms', () => {
    it('should return list of archived forms with metadata', async () => {
      const orgId = 'org-123';

      mockQuery.mockResolvedValueOnce([
        {
          id: 'form-1',
          name: 'Customer Feedback',
          archived_at: '2026-01-15T10:30:00Z',
          archived_reason: 'downgrade_from_BASIC',
          created_at: '2025-12-01',
        },
        {
          id: 'form-2',
          name: 'Event Registration',
          archived_at: '2026-01-15T10:30:00Z',
          archived_reason: 'downgrade_from_BASIC',
          created_at: '2025-12-05',
        },
      ]);

      const forms = await service.getArchivedForms(orgId);

      expect(forms.length).toBe(2);
      expect(forms[0].id).toBe('form-1');
      expect(forms[0].name).toBe('Customer Feedback');
      expect(forms[0].archivedAt).toBeInstanceOf(Date);
      expect(forms[0].archivedReason).toBe('downgrade_from_BASIC');
    });

    it('should return empty array if no archived forms', async () => {
      const orgId = 'org-no-archived';

      mockQuery.mockResolvedValueOnce([]);

      const forms = await service.getArchivedForms(orgId);

      expect(forms).toEqual([]);
    });
  });

  describe('canDowngrade', () => {
    it('should allow downgrade with form archiving warning', async () => {
      const orgId = 'org-123';
      const currentPlanMaxForms = 10;
      const newPlanMaxForms = 3;

      // Mock 7 active forms (count query)
      mockQuery.mockResolvedValueOnce([{ count: '7' }]);

      // Mock forms to be archived (SELECT query for forms)
      mockQuery.mockResolvedValueOnce([
        { id: 'form-1', name: 'Form 1', created_at: '2025-01-01' },
        { id: 'form-2', name: 'Form 2', created_at: '2025-01-02' },
        { id: 'form-3', name: 'Form 3', created_at: '2025-01-03' },
        { id: 'form-4', name: 'Form 4', created_at: '2025-01-04' },
      ]);

      const result = await service.canDowngrade(
        orgId,
        currentPlanMaxForms,
        newPlanMaxForms,
      );

      expect(result.allowed).toBe(true);
      expect(result.willArchiveForms).toBe(true);
      expect(result.formsToArchiveCount).toBe(4);
      expect(result.warning).toContain('4 forms will be archived');
    });

    it('should allow downgrade without archiving if under new limit', async () => {
      const orgId = 'org-123';
      const currentPlanMaxForms = 10;
      const newPlanMaxForms = 5;

      // Mock 3 active forms (under new limit)
      mockQuery.mockResolvedValueOnce([{ count: '3' }]);

      const result = await service.canDowngrade(
        orgId,
        currentPlanMaxForms,
        newPlanMaxForms,
      );

      expect(result.allowed).toBe(true);
      expect(result.willArchiveForms).toBe(false);
      expect(result.formsToArchiveCount).toBe(0);
    });

    it('should provide list of forms that will be archived', async () => {
      const orgId = 'org-123';
      const currentPlanMaxForms = 10;
      const newPlanMaxForms = 3;

      mockQuery.mockResolvedValueOnce([{ count: '5' }]);

      // Mock forms to be archived (oldest 2)
      mockQuery.mockResolvedValueOnce([
        { id: 'form-1', name: 'Old Form 1', created_at: '2025-01-01' },
        { id: 'form-2', name: 'Old Form 2', created_at: '2025-01-02' },
      ]);

      const result = await service.canDowngrade(
        orgId,
        currentPlanMaxForms,
        newPlanMaxForms,
      );

      expect(result.formsToArchive).toHaveLength(2);
      expect(result.formsToArchive?.[0].name).toBe('Old Form 1');
    });
  });
});
