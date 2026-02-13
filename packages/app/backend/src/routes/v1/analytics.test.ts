/**
 * Unit Tests for Analytics API Routes
 * Tests for dashboard-stats, team-performance, and form-performance endpoints
 *
 * Test Coverage:
 * - Dashboard stats calculation with trends
 * - Team performance metrics
 * - Form performance (completion rates)
 * - Organization isolation
 * - Hebrew label support
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import express, { Application } from 'express';
import { query } from '../../config/database';
import analyticsRouter from './analytics';

let app: Application;
let testOrgId: string;
let testOrgId2: string;
let testUserId: string;
let testUserId2: string;
let testFormId: string;

beforeAll(async () => {
  // Create test Express app
  app = express();
  app.use(express.json());

  // Mock authentication middleware (manager role for analytics access)
  app.use((req, _res, next) => {
    req.user = {
      id: testUserId,
      organizationId: testOrgId,
      role: 'manager',
      email: 'test@analytics.com',
      name: 'Test Manager',
    };
    next();
  });

  app.use('/api/v1/analytics', analyticsRouter);

  // Error handler
  app.use((err: any, _req: any, res: any, _next: any) => {
    res.status(err.statusCode || 500).json(
      err.toJSON ? err.toJSON() : { error: { message: err.message } }
    );
  });

  // Create test organizations
  const org1 = await query<{ id: string }>(
    `INSERT INTO organizations (clerk_org_id, name)
     VALUES ($1, $2) RETURNING id`,
    ['test-analytics-org1', 'Analytics Test Org 1'],
  );
  testOrgId = org1[0].id;

  const org2 = await query<{ id: string }>(
    `INSERT INTO organizations (clerk_org_id, name)
     VALUES ($1, $2) RETURNING id`,
    ['test-analytics-org2', 'Analytics Test Org 2'],
  );
  testOrgId2 = org2[0].id;

  // Create test users
  const user1 = await query<{ id: string }>(
    `INSERT INTO users (clerk_user_id, email, name, organization_id, role)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    ['clerk_analytics_test1', 'manager@analytics.com', 'Test Manager', testOrgId, 'manager'],
  );
  testUserId = user1[0].id;

  const user2 = await query<{ id: string }>(
    `INSERT INTO users (clerk_user_id, email, name, organization_id, role)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    ['clerk_analytics_test2', 'worker@analytics.com', 'Test Worker', testOrgId, 'worker'],
  );
  testUserId2 = user2[0].id;

  // Create test form
  const form = await query<{ id: string }>(
    `INSERT INTO forms (organization_id, name, is_active, created_by_id)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [testOrgId, 'טופס בדיקה', true, testUserId],
  );
  testFormId = form[0].id;
});

afterAll(async () => {
  // Cleanup in reverse order of creation (due to foreign key constraints)
  await query('DELETE FROM submissions WHERE organization_id = $1 OR organization_id = $2', [testOrgId, testOrgId2]);
  await query('DELETE FROM forms WHERE organization_id = $1 OR organization_id = $2', [testOrgId, testOrgId2]);
  await query('DELETE FROM users WHERE organization_id = $1 OR organization_id = $2', [testOrgId, testOrgId2]);
  await query('DELETE FROM organizations WHERE clerk_org_id LIKE $1', ['test-analytics-org%']);
});

beforeEach(async () => {
  // Clean submissions before each test
  await query('DELETE FROM submissions WHERE organization_id = $1', [testOrgId]);
});

describe('GET /api/v1/analytics/dashboard-stats', () => {
  it('should return dashboard stats with zero values when no data', async () => {
    const response = await request(app)
      .get('/api/v1/analytics/dashboard-stats')
      .expect(200);

    expect(response.body).toHaveProperty('monthlySubmissions');
    expect(response.body).toHaveProperty('completionRate');
    expect(response.body).toHaveProperty('activeForms');
    expect(response.body).toHaveProperty('activeUsers');

    expect(response.body.monthlySubmissions.value).toBe(0);
    expect(response.body.completionRate.value).toBe(0);
  });

  it('should return Hebrew labels', async () => {
    const response = await request(app)
      .get('/api/v1/analytics/dashboard-stats')
      .expect(200);

    expect(response.body.monthlySubmissions.label).toBe('הגשות החודש');
    expect(response.body.completionRate.label).toBe('אחוז השלמה');
    expect(response.body.activeForms.label).toBe('טפסים פעילים');
    expect(response.body.activeUsers.label).toBe('משתמשים פעילים');
  });

  it('should calculate correct submission count', async () => {
    // Create 3 submissions this month
    for (let i = 0; i < 3; i++) {
      await query(
        `INSERT INTO submissions (organization_id, form_id, submitted_by_id, data, status)
         VALUES ($1, $2, $3, $4, $5)`,
        [testOrgId, testFormId, testUserId, '{}', 'submitted'],
      );
    }

    const response = await request(app)
      .get('/api/v1/analytics/dashboard-stats')
      .expect(200);

    expect(response.body.monthlySubmissions.value).toBe(3);
  });

  it('should calculate completion rate correctly', async () => {
    // Create 4 submissions: 3 approved, 1 draft
    for (let i = 0; i < 3; i++) {
      await query(
        `INSERT INTO submissions (organization_id, form_id, submitted_by_id, data, status)
         VALUES ($1, $2, $3, $4, $5)`,
        [testOrgId, testFormId, testUserId, '{}', 'approved'],
      );
    }
    await query(
      `INSERT INTO submissions (organization_id, form_id, submitted_by_id, data, status)
       VALUES ($1, $2, $3, $4, $5)`,
      [testOrgId, testFormId, testUserId, '{}', 'draft'],
    );

    const response = await request(app)
      .get('/api/v1/analytics/dashboard-stats')
      .expect(200);

    // 3 out of 4 = 75%
    expect(response.body.completionRate.value).toBe(75);
  });

  it('should count active forms', async () => {
    const response = await request(app)
      .get('/api/v1/analytics/dashboard-stats')
      .expect(200);

    // We have 1 active form from setup
    expect(response.body.activeForms.value).toBe(1);
  });
});

describe('GET /api/v1/analytics/team-performance', () => {
  it('should return team performance data structure', async () => {
    const response = await request(app)
      .get('/api/v1/analytics/team-performance')
      .expect(200);

    expect(response.body).toHaveProperty('totals');
    expect(response.body).toHaveProperty('topPerformer');
    expect(response.body).toHaveProperty('avgPerPerson');
    expect(response.body).toHaveProperty('members');

    expect(response.body.totals).toHaveProperty('totalSubmissions');
    expect(response.body.totals).toHaveProperty('approvedSubmissions');
    expect(response.body.totals).toHaveProperty('pendingSubmissions');
  });

  it('should only count workers (not managers/admins)', async () => {
    // Create submission by worker
    await query(
      `INSERT INTO submissions (organization_id, form_id, submitted_by_id, data, status)
       VALUES ($1, $2, $3, $4, $5)`,
      [testOrgId, testFormId, testUserId2, '{}', 'submitted'], // testUserId2 is worker
    );

    // Create submission by manager (should not count in team-performance)
    await query(
      `INSERT INTO submissions (organization_id, form_id, submitted_by_id, data, status)
       VALUES ($1, $2, $3, $4, $5)`,
      [testOrgId, testFormId, testUserId, '{}', 'submitted'], // testUserId is manager
    );

    const response = await request(app)
      .get('/api/v1/analytics/team-performance')
      .expect(200);

    // Should only have 1 member (the worker)
    expect(response.body.members.length).toBe(1);
    expect(response.body.members[0].email).toBe('worker@analytics.com');
    expect(response.body.totals.totalSubmissions).toBe(1);
  });

  it('should identify top performer correctly', async () => {
    // Create 3 submissions by worker
    for (let i = 0; i < 3; i++) {
      await query(
        `INSERT INTO submissions (organization_id, form_id, submitted_by_id, data, status)
         VALUES ($1, $2, $3, $4, $5)`,
        [testOrgId, testFormId, testUserId2, '{}', 'submitted'],
      );
    }

    const response = await request(app)
      .get('/api/v1/analytics/team-performance')
      .expect(200);

    expect(response.body.topPerformer).not.toBeNull();
    expect(response.body.topPerformer.submissions).toBe(3);
    expect(response.body.topPerformer.name).toBe('Test Worker');
  });

  it('should calculate average per person', async () => {
    // Worker has 2 submissions
    for (let i = 0; i < 2; i++) {
      await query(
        `INSERT INTO submissions (organization_id, form_id, submitted_by_id, data, status)
         VALUES ($1, $2, $3, $4, $5)`,
        [testOrgId, testFormId, testUserId2, '{}', 'submitted'],
      );
    }

    const response = await request(app)
      .get('/api/v1/analytics/team-performance')
      .expect(200);

    // 2 submissions / 1 worker = 2 avg
    expect(response.body.avgPerPerson).toBe(2);
  });
});

describe('GET /api/v1/analytics/form-performance', () => {
  it('should return form completion rates', async () => {
    // Create submissions: 2 approved, 1 rejected
    await query(
      `INSERT INTO submissions (organization_id, form_id, submitted_by_id, data, status)
       VALUES ($1, $2, $3, $4, $5)`,
      [testOrgId, testFormId, testUserId, '{}', 'approved'],
    );
    await query(
      `INSERT INTO submissions (organization_id, form_id, submitted_by_id, data, status)
       VALUES ($1, $2, $3, $4, $5)`,
      [testOrgId, testFormId, testUserId, '{}', 'approved'],
    );
    await query(
      `INSERT INTO submissions (organization_id, form_id, submitted_by_id, data, status)
       VALUES ($1, $2, $3, $4, $5)`,
      [testOrgId, testFormId, testUserId, '{}', 'rejected'],
    );

    const response = await request(app)
      .get('/api/v1/analytics/form-performance')
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);

    const form = response.body[0];
    expect(form).toHaveProperty('id');
    expect(form).toHaveProperty('name');
    expect(form).toHaveProperty('completionRate');

    // 2 approved out of 3 total = 67%
    expect(form.completionRate).toBe(67);
  });

  it('should return Hebrew form names', async () => {
    // Create at least one submission so form appears in results
    await query(
      `INSERT INTO submissions (organization_id, form_id, submitted_by_id, data, status)
       VALUES ($1, $2, $3, $4, $5)`,
      [testOrgId, testFormId, testUserId, '{}', 'submitted'],
    );

    const response = await request(app)
      .get('/api/v1/analytics/form-performance')
      .expect(200);

    expect(response.body[0].name).toBe('טופס בדיקה');
  });

  it('should only include active forms', async () => {
    // Create an inactive form
    const inactiveForm = await query<{ id: string }>(
      `INSERT INTO forms (organization_id, name, is_active, created_by_id)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [testOrgId, 'Inactive Form', false, testUserId],
    );

    // Create submissions for both forms
    await query(
      `INSERT INTO submissions (organization_id, form_id, submitted_by_id, data, status)
       VALUES ($1, $2, $3, $4, $5)`,
      [testOrgId, testFormId, testUserId, '{}', 'submitted'],
    );
    await query(
      `INSERT INTO submissions (organization_id, form_id, submitted_by_id, data, status)
       VALUES ($1, $2, $3, $4, $5)`,
      [testOrgId, inactiveForm[0].id, testUserId, '{}', 'submitted'],
    );

    const response = await request(app)
      .get('/api/v1/analytics/form-performance')
      .expect(200);

    // Should only include the active form
    const formNames = response.body.map((f: any) => f.name);
    expect(formNames).toContain('טופס בדיקה');
    expect(formNames).not.toContain('Inactive Form');

    // Cleanup
    await query('DELETE FROM submissions WHERE form_id = $1', [inactiveForm[0].id]);
    await query('DELETE FROM forms WHERE id = $1', [inactiveForm[0].id]);
  });
});

describe('Organization isolation', () => {
  it('should not return data from other organizations', async () => {
    // Create submission in org2
    const otherOrgForm = await query<{ id: string }>(
      `INSERT INTO forms (organization_id, name, is_active, created_by_id)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [testOrgId2, 'Other Org Form', true, testUserId],
    );

    await query(
      `INSERT INTO submissions (organization_id, form_id, submitted_by_id, data, status)
       VALUES ($1, $2, $3, $4, $5)`,
      [testOrgId2, otherOrgForm[0].id, testUserId, '{}', 'submitted'],
    );

    const response = await request(app)
      .get('/api/v1/analytics/dashboard-stats')
      .expect(200);

    // Our org has no submissions, so count should be 0
    expect(response.body.monthlySubmissions.value).toBe(0);

    // Cleanup
    await query('DELETE FROM submissions WHERE form_id = $1', [otherOrgForm[0].id]);
    await query('DELETE FROM forms WHERE id = $1', [otherOrgForm[0].id]);
  });
});
