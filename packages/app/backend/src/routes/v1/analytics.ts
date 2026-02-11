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

    res.json({
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
  } catch (error) {
    next(error);
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

    res.json({
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
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/analytics/form-performance
 * Form completion rates for dashboard widget
 */
router.get('/form-performance', async (req, res, next) => {
  try {
    const { organizationId } = req.user!;

    // Calculate completion rate per form
    // Completion = (approved + submitted) / total submissions for each form
    const formPerformance = await query<{
      id: string;
      name: string;
      total: string;
      completed: string;
    }>(
      `
      SELECT
        f.id,
        f.name,
        COUNT(s.id) as total,
        COUNT(CASE WHEN s.status IN ('submitted', 'approved') THEN 1 END) as completed
      FROM forms f
      LEFT JOIN submissions s ON f.id = s.form_id AND s.deleted_at IS NULL
      WHERE f.organization_id = $1
        AND f.deleted_at IS NULL
        AND f.is_active = true
      GROUP BY f.id, f.name
      HAVING COUNT(s.id) > 0
      ORDER BY COUNT(s.id) DESC
      LIMIT 10
    `,
      [organizationId],
    );

    const result = formPerformance.map((row) => {
      const total = parseInt(row.total);
      const completed = parseInt(row.completed);
      const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

      return {
        id: row.id,
        name: row.name,
        completionRate,
      };
    });

    res.json(result);
  } catch (error) {
    next(error);
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

    res.json({
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
  } catch (error) {
    next(error);
  }
});

export default router;
