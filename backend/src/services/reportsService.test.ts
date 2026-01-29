/**
 * Reports Service - Unit Tests
 *
 * Following TDD (Test-Driven Development):
 * 1. RED: Write failing tests
 * 2. GREEN: Implement minimal code to pass
 * 3. REFACTOR: Improve code quality
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { reportsService } from './reportsService';
import { query } from '../config/database';

describe('ReportsService', () => {
  const testOrgId = '11111111-1111-1111-1111-111111111111';
  const testOrgId2 = '22222222-2222-2222-2222-222222222222';
  const testUserId = '00000000-0000-0000-0000-000000000011'; // Valid UUID for user 1
  const testUserId2 = '00000000-0000-0000-0000-000000000022'; // Valid UUID for user 2

  beforeEach(async () => {
    // Clean up test data
    await query(
      'DELETE FROM submissions WHERE organization_id = $1 OR organization_id = $2',
      [testOrgId, testOrgId2],
    );
    await query(
      'DELETE FROM users WHERE id = $1 OR id = $2',
      [testUserId, testUserId2],
    );
    await query(
      'DELETE FROM organizations WHERE id = $1 OR id = $2',
      [testOrgId, testOrgId2],
    );

    // Set up test organizations and users
    await query(
      `INSERT INTO organizations (id, clerk_organization_id, name)
       VALUES ($1, $2, $3), ($4, $5, $6)`,
      [testOrgId, 'clerk-org-1', 'Test Org 1', testOrgId2, 'clerk-org-2', 'Test Org 2'],
    );

    await query(
      `INSERT INTO users (id, organization_id, clerk_user_id, email, name, role)
       VALUES ($1, $2, $3, $4, $5, $6), ($7, $8, $9, $10, $11, $12)`,
      [
        testUserId,
        testOrgId,
        'clerk-user-1',
        'user1@test.com',
        'Test User 1',
        'worker',
        testUserId2,
        testOrgId,
        'clerk-user-2',
        'user2@test.com',
        'Test User 2',
        'worker',
      ],
    );
  });

  afterEach(async () => {
    // Clean up after tests (reverse order due to foreign keys)
    await query(
      'DELETE FROM submissions WHERE organization_id = $1 OR organization_id = $2',
      [testOrgId, testOrgId2],
    );
    await query(
      'DELETE FROM users WHERE id = $1 OR id = $2',
      [testUserId, testUserId2],
    );
    await query(
      'DELETE FROM organizations WHERE id = $1 OR id = $2',
      [testOrgId, testOrgId2],
    );
  });

  /**
   * Test Suite: Daily Activity Report
   */
  describe('getDailyActivityReport', () => {
    /**
     * TC-DAR-001: Happy Path - Normal Data
     */
    it('should return submissions count for today', async () => {
      // Arrange: Seed 24 submissions for today
      const today = new Date().toISOString().split('T')[0];
      await seedSubmissions(testOrgId, today, 24);

      // Act
      const result = await reportsService.getDailyActivityReport(testOrgId, today);

      // Assert
      expect(result.submissionsToday).toBe(24);
    });

    /**
     * TC-DAR-002: Display Active Users Count
     */
    it('should return count of active users today', async () => {
      // Arrange: 3 different users submitted forms today
      const today = new Date().toISOString().split('T')[0];
      await seedSubmissions(testOrgId, today, 5, testUserId);
      await seedSubmissions(testOrgId, today, 3, testUserId2);
      await seedSubmissions(testOrgId, today, 2, 'user-test-003');

      // Act
      const result = await reportsService.getDailyActivityReport(testOrgId, today);

      // Assert
      expect(result.activeUsers).toBe(3);
    });

    /**
     * TC-DAR-003: Calculate Average Completion Time
     */
    it('should calculate average completion time correctly', async () => {
      // Arrange: 3 submissions with completion times 100, 200, 300 seconds
      const today = new Date().toISOString().split('T')[0];
      await createSubmission(testOrgId, today, { totalSeconds: 100 });
      await createSubmission(testOrgId, today, { totalSeconds: 200 });
      await createSubmission(testOrgId, today, { totalSeconds: 300 });

      // Act
      const result = await reportsService.getDailyActivityReport(testOrgId, today);

      // Assert
      expect(result.avgCompletionTime).toBe(200);
    });

    /**
     * TC-DAR-004: Display Approval Rate
     */
    it('should calculate approval rate correctly', async () => {
      // Arrange: 10 submissions - 7 approved, 2 rejected, 1 pending
      const today = new Date().toISOString().split('T')[0];
      await seedSubmissionsWithStatus(testOrgId, today, 7, 'approved');
      await seedSubmissionsWithStatus(testOrgId, today, 2, 'rejected');
      await seedSubmissionsWithStatus(testOrgId, today, 1, 'pending');

      // Act
      const result = await reportsService.getDailyActivityReport(testOrgId, today);

      // Assert
      expect(result.approvalRate).toBe(70); // 7/10 = 70%
    });

    /**
     * TC-DAR-005: Compare with Yesterday
     */
    it('should calculate percent change from yesterday', async () => {
      // Arrange: Yesterday 20 submissions, Today 30 submissions
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const todayStr = today.toISOString().split('T')[0];
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      await seedSubmissions(testOrgId, yesterdayStr, 20);
      await seedSubmissions(testOrgId, todayStr, 30);

      // Act
      const result = await reportsService.getDailyActivityReport(testOrgId, todayStr);

      // Assert
      expect(result.submissionsToday).toBe(30);
      expect(result.submissionsYesterday).toBe(20);
      expect(result.percentChange).toBe(50); // (30-20)/20 = 50%
    });

    /**
     * TC-DAR-006: Submissions by Hour
     */
    it('should return hourly submission breakdown', async () => {
      // Arrange: Create submissions at different hours
      const today = new Date().toISOString().split('T')[0];
      const baseDate = new Date(today);

      // 5 submissions at 9AM, 3 at 2PM
      for (let i = 0; i < 5; i++) {
        const date = new Date(baseDate);
        date.setHours(9, 0, 0, 0);
        await createSubmissionAtTime(testOrgId, date);
      }
      for (let i = 0; i < 3; i++) {
        const date = new Date(baseDate);
        date.setHours(14, 0, 0, 0);
        await createSubmissionAtTime(testOrgId, date);
      }

      // Act
      const result = await reportsService.getDailyActivityReport(testOrgId, today);

      // Assert
      expect(result.submissionsByHour).toHaveLength(24);
      expect(result.submissionsByHour[9].count).toBe(5);
      expect(result.submissionsByHour[14].count).toBe(3);
    });

    /**
     * TC-DAR-007: Recent Submissions List
     */
    it('should return last 10 recent submissions', async () => {
      // Arrange: Create 15 submissions
      const today = new Date().toISOString().split('T')[0];
      await seedSubmissions(testOrgId, today, 15);

      // Act
      const result = await reportsService.getDailyActivityReport(testOrgId, today);

      // Assert
      expect(result.recentSubmissions).toHaveLength(10);
      expect(result.recentSubmissions[0]).toHaveProperty('id');
      expect(result.recentSubmissions[0]).toHaveProperty('formType');
      expect(result.recentSubmissions[0]).toHaveProperty('submittedBy');
    });

    /**
     * TC-DAR-008: Empty Data - No Submissions Today
     * Edge Case #3
     */
    it('should handle no submissions gracefully', async () => {
      // Arrange: No submissions
      const today = new Date().toISOString().split('T')[0];

      // Act
      const result = await reportsService.getDailyActivityReport(testOrgId, today);

      // Assert
      expect(result.submissionsToday).toBe(0);
      expect(result.activeUsers).toBe(0);
      expect(result.avgCompletionTime).toBe(0);
      expect(result.approvalRate).toBe(0);
      expect(result.submissionsByHour).toHaveLength(24);
      expect(result.recentSubmissions).toHaveLength(0);
    });

    /**
     * TC-DAR-009: Edge Case - Missing Metadata (Null/Empty)
     * Edge Case #21
     */
    it('should handle missing metadata gracefully', async () => {
      // Arrange: Create submissions with null, empty, and valid metadata
      const today = new Date().toISOString().split('T')[0];
      await createSubmission(testOrgId, today, null);
      await createSubmission(testOrgId, today, {});
      await createSubmission(testOrgId, today, { totalSeconds: 100 });

      // Act
      const result = await reportsService.getDailyActivityReport(testOrgId, today);

      // Assert
      expect(isNaN(result.avgCompletionTime)).toBe(false);
      expect(result.avgCompletionTime).toBe(100); // Only valid one counted
    });

    /**
     * TC-DAR-010: CRITICAL SECURITY - Cross-Organization Access
     * Edge Case #10
     */
    it('should only return data for specified organization', async () => {
      // Arrange: Org1 has 20 submissions, Org2 has 30
      const today = new Date().toISOString().split('T')[0];
      await seedSubmissions(testOrgId, today, 20);
      await seedSubmissions(testOrgId2, today, 30);

      // Act
      const result = await reportsService.getDailyActivityReport(testOrgId, today);

      // Assert
      expect(result.submissionsToday).toBe(20); // Only Org1 data
    });

    /**
     * TC-DAR-011: Zero Submissions Yesterday
     */
    it('should handle zero submissions yesterday correctly', async () => {
      // Arrange: 0 yesterday, 10 today
      const today = new Date().toISOString().split('T')[0];
      await seedSubmissions(testOrgId, today, 10);

      // Act
      const result = await reportsService.getDailyActivityReport(testOrgId, today);

      // Assert
      expect(result.submissionsYesterday).toBe(0);
      expect(result.percentChange).toBe(100); // From 0 to 10 = 100% increase
    });

    /**
     * TC-DAR-012: Negative Percent Change (Decline)
     */
    it('should calculate negative percent change correctly', async () => {
      // Arrange: Yesterday 50 submissions, Today 25 submissions
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const todayStr = today.toISOString().split('T')[0];
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      await seedSubmissions(testOrgId, yesterdayStr, 50);
      await seedSubmissions(testOrgId, todayStr, 25);

      // Act
      const result = await reportsService.getDailyActivityReport(testOrgId, todayStr);

      // Assert
      expect(result.percentChange).toBe(-50); // (25-50)/50 = -50%
    });
  });

  /**
   * Test Suite: Team Performance Report
   */
  describe('getTeamPerformanceReport', () => {
    /**
     * TC-TPR-001: Basic Team Performance
     */
    it('should aggregate submissions by team member', async () => {
      // Arrange: User1 = 10 submissions, User2 = 5 submissions
      const from = '2026-01-01';
      const to = '2026-01-31';
      await seedSubmissions(testOrgId, '2026-01-15', 10, testUserId);
      await seedSubmissions(testOrgId, '2026-01-20', 5, testUserId2);

      // Act
      const result = await reportsService.getTeamPerformanceReport(testOrgId, from, to);

      // Assert
      expect(result.members).toHaveLength(2);
      expect(result.summary.totalMembers).toBe(2);
      expect(result.summary.totalSubmissions).toBe(15);

      const user1 = result.members.find((m) => m.userId === testUserId);
      expect(user1?.totalSubmissions).toBe(10);
      expect(user1?.userName).toBe('Test User 1'); // Should display actual name from users table
    });

    /**
     * TC-TPR-002: Approval Rate Per Member
     */
    it('should calculate approval rate per team member', async () => {
      // Arrange: User1 has 8/10 approved (80%), User2 has 3/5 approved (60%)
      const from = '2026-01-01';
      const to = '2026-01-31';
      await seedSubmissionsWithStatus(testOrgId, '2026-01-15', 8, 'approved', testUserId);
      await seedSubmissionsWithStatus(testOrgId, '2026-01-15', 2, 'rejected', testUserId);
      await seedSubmissionsWithStatus(testOrgId, '2026-01-20', 3, 'approved', testUserId2);
      await seedSubmissionsWithStatus(testOrgId, '2026-01-20', 2, 'rejected', testUserId2);

      // Act
      const result = await reportsService.getTeamPerformanceReport(testOrgId, from, to);

      // Assert
      const user1 = result.members.find((m) => m.userId === testUserId);
      const user2 = result.members.find((m) => m.userId === testUserId2);
      expect(user1?.approvalRate).toBe(80);
      expect(user2?.approvalRate).toBe(60);
    });

    /**
     * TC-TPR-003: Average Completion Time Per Member
     */
    it('should calculate average completion time per member', async () => {
      // Arrange: User1 avg = 150s, User2 avg = 300s
      const from = '2026-01-01';
      const to = '2026-01-31';
      await createSubmission(testOrgId, '2026-01-15', { totalSeconds: 100 }, testUserId);
      await createSubmission(testOrgId, '2026-01-15', { totalSeconds: 200 }, testUserId);
      await createSubmission(testOrgId, '2026-01-20', { totalSeconds: 300 }, testUserId2);
      await createSubmission(testOrgId, '2026-01-20', { totalSeconds: 300 }, testUserId2);

      // Act
      const result = await reportsService.getTeamPerformanceReport(testOrgId, from, to);

      // Assert
      const user1 = result.members.find((m) => m.userId === testUserId);
      const user2 = result.members.find((m) => m.userId === testUserId2);
      expect(user1?.avgCompletionTime).toBe(150); // (100+200)/2
      expect(user2?.avgCompletionTime).toBe(300);
    });

    /**
     * TC-TPR-004: Team Summary Stats
     */
    it('should calculate team-wide summary stats', async () => {
      // Arrange: 2 members, 15 total submissions, 10 approved
      const from = '2026-01-01';
      const to = '2026-01-31';
      await seedSubmissionsWithStatus(testOrgId, '2026-01-15', 6, 'approved', testUserId);
      await seedSubmissionsWithStatus(testOrgId, '2026-01-15', 4, 'rejected', testUserId);
      await seedSubmissionsWithStatus(testOrgId, '2026-01-20', 4, 'approved', testUserId2);
      await seedSubmissionsWithStatus(testOrgId, '2026-01-20', 1, 'pending', testUserId2);

      // Act
      const result = await reportsService.getTeamPerformanceReport(testOrgId, from, to);

      // Assert
      expect(result.summary.totalMembers).toBe(2);
      expect(result.summary.totalSubmissions).toBe(15);
      expect(result.summary.avgTeamApprovalRate).toBe(66.67); // 10/15
    });

    /**
     * TC-TPR-005: SECURITY - Cross-Organization Isolation
     * Edge Case #10
     */
    it('should only return team data for specified organization', async () => {
      // Arrange: Org1 has User1, Org2 has User2
      const from = '2026-01-01';
      const to = '2026-01-31';
      await seedSubmissions(testOrgId, '2026-01-15', 10, testUserId);
      await seedSubmissions(testOrgId2, '2026-01-20', 20, testUserId2);

      // Act
      const result = await reportsService.getTeamPerformanceReport(testOrgId, from, to);

      // Assert
      expect(result.summary.totalSubmissions).toBe(10); // Only Org1
      expect(result.members.some((m) => m.userId === testUserId2)).toBe(false);
    });
  });

  /**
   * Test Suite: Forms Status Report
   */
  describe('getFormsStatusReport', () => {
    /**
     * TC-FSR-001: Count by Status
     */
    it('should count submissions by status', async () => {
      // Arrange: 10 approved, 5 rejected, 3 pending
      const from = '2026-01-01';
      const to = '2026-01-31';
      await seedSubmissionsWithStatus(testOrgId, '2026-01-15', 10, 'approved');
      await seedSubmissionsWithStatus(testOrgId, '2026-01-15', 5, 'rejected');
      await seedSubmissionsWithStatus(testOrgId, '2026-01-15', 3, 'pending');

      // Act
      const result = await reportsService.getFormsStatusReport(testOrgId, from, to);

      // Assert
      expect(result.byStatus).toHaveLength(3);
      const approved = result.byStatus.find((s) => s.status === 'approved');
      const rejected = result.byStatus.find((s) => s.status === 'rejected');
      const pending = result.byStatus.find((s) => s.status === 'pending');
      expect(approved?.count).toBe(10);
      expect(rejected?.count).toBe(5);
      expect(pending?.count).toBe(3);
    });

    /**
     * TC-FSR-002: Status Percentages
     */
    it('should calculate percentage for each status', async () => {
      // Arrange: 70 approved, 20 rejected, 10 pending (100 total)
      const from = '2026-01-01';
      const to = '2026-01-31';
      await seedSubmissionsWithStatus(testOrgId, '2026-01-15', 70, 'approved');
      await seedSubmissionsWithStatus(testOrgId, '2026-01-15', 20, 'rejected');
      await seedSubmissionsWithStatus(testOrgId, '2026-01-15', 10, 'pending');

      // Act
      const result = await reportsService.getFormsStatusReport(testOrgId, from, to);

      // Assert
      const approved = result.byStatus.find((s) => s.status === 'approved');
      const rejected = result.byStatus.find((s) => s.status === 'rejected');
      const pending = result.byStatus.find((s) => s.status === 'pending');
      expect(approved?.percentage).toBe(70);
      expect(rejected?.percentage).toBe(20);
      expect(pending?.percentage).toBe(10);
    });

    /**
     * TC-FSR-003: Long-Waiting Forms (> 48 hours)
     * Edge Case #4
     */
    it('should count forms pending for more than 48 hours', async () => {
      // Arrange: 2 pending > 48h, 3 pending < 48h
      const now = new Date();
      const threeDaysAgo = new Date(now.getTime() - 72 * 60 * 60 * 1000); // 72 hours ago
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago

      await createSubmissionAtTime(testOrgId, threeDaysAgo, 'pending');
      await createSubmissionAtTime(testOrgId, threeDaysAgo, 'pending');
      await createSubmissionAtTime(testOrgId, oneDayAgo, 'pending');
      await createSubmissionAtTime(testOrgId, oneDayAgo, 'pending');
      await createSubmissionAtTime(testOrgId, oneDayAgo, 'pending');

      const from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const to = now.toISOString().split('T')[0];

      // Act
      const result = await reportsService.getFormsStatusReport(testOrgId, from, to);

      // Assert
      expect(result.longWaitingCount).toBe(2);
    });
  });
});

// Helper Functions

/**
 * Seed multiple submissions for testing
 */
async function seedSubmissions(
  orgId: string,
  date: string,
  count: number,
  userId: string = 'user-test-001',
): Promise<void> {
  for (let i = 0; i < count; i++) {
    await createSubmission(orgId, date, { totalSeconds: 120 }, userId, 'approved');
  }
}

/**
 * Seed submissions with specific status
 */
async function seedSubmissionsWithStatus(
  orgId: string,
  date: string,
  count: number,
  status: string,
  userId: string = 'user-test-001',
): Promise<void> {
  for (let i = 0; i < count; i++) {
    await createSubmission(orgId, date, { totalSeconds: 120 }, userId, status);
  }
}

/**
 * Create a single submission
 */
async function createSubmission(
  orgId: string,
  date: string,
  metadata: any,
  userId: string = '00000000-0000-0000-0000-000000000011', // Default to testUserId
  status: string = 'approved',
): Promise<void> {
  await query(
    `INSERT INTO submissions
     (organization_id, form_id, submitted_by_id, status, created_at, metadata, data)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      orgId,
      '00000000-0000-0000-0000-000000000001', // Test form_id (UUID) - could be null for testing
      userId, // User UUID (foreign key to users.id)
      status,
      `${date}T12:00:00Z`,
      metadata ? JSON.stringify(metadata) : null,
      '{}', // Empty data JSONB
    ],
  );
}

/**
 * Create submission at specific time
 */
async function createSubmissionAtTime(
  orgId: string,
  date: Date,
  status: string = 'approved',
): Promise<void> {
  await query(
    `INSERT INTO submissions
     (organization_id, form_id, submitted_by_id, status, created_at, metadata, data)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      orgId,
      '00000000-0000-0000-0000-000000000001', // Test form_id (UUID)
      '00000000-0000-0000-0000-000000000011', // Default testUserId
      status,
      date.toISOString(),
      JSON.stringify({ totalSeconds: 120 }),
      '{}', // Empty data JSONB
    ],
  );
}
