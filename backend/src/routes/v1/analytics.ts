import express from 'express';
import { authenticateJWT, requireRole } from '../../middleware/auth';
import { syncUser } from '../../middleware/syncUser';
import { query } from '../../config/database';

const router = express.Router();

// Apply authentication + user sync (manager+ only for analytics)
router.use(authenticateJWT);
router.use(syncUser);
router.use(requireRole('manager'));

/**
 * GET /api/v1/analytics/overview
 * Dashboard overview statistics
 */
router.get('/overview', async (req, res, next) => {
  try {
    const { organizationId } = req.user!;

    // Get statistics in parallel
    const [
      submissionsCount,
      formsCount,
      usersCount,
      webhooksCount,
      submissionsByStatus,
      recentSubmissions,
    ] = await Promise.all([
      // Total submissions
      query<{ count: string }>(
        'SELECT COUNT(*) as count FROM submissions WHERE organization_id = $1 AND deleted_at IS NULL',
        [organizationId],
      ),

      // Total forms
      query<{ count: string }>(
        'SELECT COUNT(*) as count FROM forms WHERE organization_id = $1 AND deleted_at IS NULL',
        [organizationId],
      ),

      // Total users
      query<{ count: string }>(
        'SELECT COUNT(*) as count FROM users WHERE organization_id = $1 AND deleted_at IS NULL',
        [organizationId],
      ),

      // Total webhooks
      query<{ count: string }>(
        'SELECT COUNT(*) as count FROM webhooks WHERE organization_id = $1 AND deleted_at IS NULL',
        [organizationId],
      ),

      // Submissions by status
      query<{ status: string; count: string }>(
        `
        SELECT status, COUNT(*) as count
        FROM submissions
        WHERE organization_id = $1 AND deleted_at IS NULL
        GROUP BY status
      `,
        [organizationId],
      ),

      // Recent submissions (last 7 days, grouped by date)
      query<{ date: string; count: string }>(
        `
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM submissions
        WHERE organization_id = $1
          AND deleted_at IS NULL
          AND created_at >= NOW() - INTERVAL '7 days'
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `,
        [organizationId],
      ),
    ]);

    return res.json({
      totals: {
        submissions: parseInt(submissionsCount[0]?.count || '0'),
        forms: parseInt(formsCount[0]?.count || '0'),
        users: parseInt(usersCount[0]?.count || '0'),
        webhooks: parseInt(webhooksCount[0]?.count || '0'),
      },
      submissionsByStatus: submissionsByStatus.reduce(
        (acc, row) => {
          acc[row.status] = parseInt(row.count);
          return acc;
        },
        {} as Record<string, number>,
      ),
      recentActivity: recentSubmissions.map((row) => ({
        date: row.date,
        count: parseInt(row.count),
      })),
    });
  } catch (error: unknown) {
    // Handle missing tables gracefully - return zeros instead of 500
    const pgError = error as { code?: string; message?: string };
    if (pgError.code === '42P01' || pgError.message?.includes('does not exist')) {
      return res.json({
        totals: { submissions: 0, forms: 0, users: 0, webhooks: 0 },
        submissionsByStatus: {},
        recentActivity: [],
      });
    }
    return next(error);
  }
});

/**
 * GET /api/v1/analytics/submissions
 * Detailed submissions analytics
 */
router.get('/submissions', async (req, res, next) => {
  try {
    const { organizationId } = req.user!;
    const { fromDate, toDate } = req.query;

    // Build date filter
    const dateConditions: string[] = ['s.organization_id = $1', 's.deleted_at IS NULL'];
    const params: any[] = [organizationId];
    let paramIndex = 2;

    if (fromDate) {
      dateConditions.push(`s.created_at >= $${paramIndex++}`);
      params.push(fromDate);
    }

    if (toDate) {
      dateConditions.push(`s.created_at <= $${paramIndex++}`);
      params.push(toDate);
    }

    const whereClause = dateConditions.join(' AND ');

    // Get analytics
    const [submissionsByForm, submissionsByUser, submissionsByDay] = await Promise.all([
      // Submissions grouped by form
      query<{ formId: string; formName: string; count: string }>(
        `
        SELECT
          f.id AS "formId",
          f.name AS "formName",
          COUNT(s.id) as count
        FROM submissions s
        JOIN forms f ON s.form_id = f.id
        WHERE ${whereClause}
        GROUP BY f.id, f.name
        ORDER BY count DESC
        LIMIT 10
      `,
        params,
      ),

      // Submissions grouped by user
      query<{ userId: string; userName: string; count: string }>(
        `
        SELECT
          u.id AS "userId",
          u.name AS "userName",
          COUNT(s.id) as count
        FROM submissions s
        LEFT JOIN users u ON s.submitted_by_id = u.id
        WHERE ${whereClause}
        GROUP BY u.id, u.name
        ORDER BY count DESC
        LIMIT 10
      `,
        params,
      ),

      // Submissions by day
      query<{ date: string; count: string }>(
        `
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM submissions s
        WHERE ${whereClause}
        GROUP BY DATE(created_at)
        ORDER BY date DESC
        LIMIT 30
      `,
        params,
      ),
    ]);

    return res.json({
      byForm: submissionsByForm.map((row) => ({
        formId: row.formId,
        formName: row.formName,
        count: parseInt(row.count),
      })),
      byUser: submissionsByUser.map((row) => ({
        userId: row.userId,
        userName: row.userName || 'Unknown',
        count: parseInt(row.count),
      })),
      byDay: submissionsByDay.map((row) => ({
        date: row.date,
        count: parseInt(row.count),
      })),
    });
  } catch (error: unknown) {
    // Handle missing tables gracefully
    const pgError = error as { code?: string; message?: string };
    if (pgError.code === '42P01' || pgError.message?.includes('does not exist')) {
      return res.json({ byForm: [], byUser: [], byDay: [] });
    }
    return next(error);
  }
});

/**
 * GET /api/v1/analytics/webhooks
 * Webhook delivery statistics
 */
router.get('/webhooks', async (req, res, next) => {
  try {
    const { organizationId } = req.user!;

    // Get webhook statistics
    const [deliveryStats, recentEvents] = await Promise.all([
      // Delivery success rate per webhook
      query<{
        webhookId: string;
        url: string;
        total: string;
        delivered: string;
        failed: string;
      }>(
        `
        SELECT
          w.id AS "webhookId",
          w.url,
          COUNT(we.id) as total,
          COUNT(CASE WHEN we.status = 'delivered' THEN 1 END) as delivered,
          COUNT(CASE WHEN we.status = 'failed' THEN 1 END) as failed
        FROM webhooks w
        LEFT JOIN webhook_events we ON w.id = we.webhook_id
        WHERE w.organization_id = $1 AND w.deleted_at IS NULL
        GROUP BY w.id, w.url
        ORDER BY total DESC
      `,
        [organizationId],
      ),

      // Recent webhook events
      query<{
        id: string;
        webhookId: string;
        eventType: string;
        status: string;
        attempts: number;
        createdAt: Date;
      }>(
        `
        SELECT
          we.id,
          we.webhook_id AS "webhookId",
          we.event_type AS "eventType",
          we.status,
          we.attempts,
          we.created_at AS "createdAt"
        FROM webhook_events we
        JOIN webhooks w ON we.webhook_id = w.id
        WHERE w.organization_id = $1
        ORDER BY we.created_at DESC
        LIMIT 50
      `,
        [organizationId],
      ),
    ]);

    return res.json({
      deliveryStats: deliveryStats.map((row) => ({
        webhookId: row.webhookId,
        url: row.url,
        total: parseInt(row.total),
        delivered: parseInt(row.delivered),
        failed: parseInt(row.failed),
        successRate:
          parseInt(row.total) > 0
            ? ((parseInt(row.delivered) / parseInt(row.total)) * 100).toFixed(2)
            : '0',
      })),
      recentEvents: recentEvents.map((row) => ({
        id: row.id,
        webhookId: row.webhookId,
        eventType: row.eventType,
        status: row.status,
        attempts: row.attempts,
        createdAt: row.createdAt,
      })),
    });
  } catch (error: unknown) {
    // Handle missing tables gracefully
    const pgError = error as { code?: string; message?: string };
    if (pgError.code === '42P01' || pgError.message?.includes('does not exist')) {
      return res.json({ deliveryStats: [], recentEvents: [] });
    }
    return next(error);
  }
});

/**
 * GET /api/v1/analytics/form-performance
 * Form completion rates for dashboard widget
 */
router.get('/form-performance', async (req, res, next) => {
  try {
    const { organizationId } = req.user!;

    // Get form performance - completion rates based on submissions
    const formPerformance = await query<{
      id: string;
      name: string;
      totalViews: string;
      totalSubmissions: string;
    }>(
      `
      SELECT
        f.id,
        f.name,
        COALESCE(f.view_count, 0) as "totalViews",
        COUNT(s.id) as "totalSubmissions"
      FROM forms f
      LEFT JOIN submissions s ON f.id = s.form_id AND s.deleted_at IS NULL
      WHERE f.organization_id = $1
        AND f.deleted_at IS NULL
      GROUP BY f.id, f.name, f.view_count
      ORDER BY COUNT(s.id) DESC
      LIMIT 10
    `,
      [organizationId],
    );

    // Calculate completion rate (submissions / views * 100, max 100%)
    const result = formPerformance.map((form) => {
      const views = parseInt(form.totalViews) || 1; // Avoid division by zero
      const submissions = parseInt(form.totalSubmissions) || 0;
      const completionRate = Math.min(100, Math.round((submissions / views) * 100));

      return {
        id: form.id,
        name: form.name,
        completionRate,
      };
    });

    return res.json(result);
  } catch (error: unknown) {
    // Handle missing table gracefully - return empty array instead of 500
    const pgError = error as { code?: string; message?: string };
    if (pgError.code === '42P01' || pgError.message?.includes('does not exist')) {
      return res.json([]);
    }
    return next(error);
  }
});

export default router;
