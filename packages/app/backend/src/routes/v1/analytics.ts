import express from 'express';
import { authenticateJWT, requireRole } from '../../middleware/auth';
import { syncUser } from '../../middleware/syncUser';
import { query } from '../../config/database';

const router = express.Router();
const NIL_UUID = '00000000-0000-0000-0000-000000000000';

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

    // Return empty stats if no organization context
    if (organizationId === NIL_UUID) {
      return res.json({
        totals: { submissions: 0, forms: 0, users: 0, webhooks: 0 },
        submissionsByStatus: {},
        recentActivity: [],
      });
    }

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

    // Return empty data if no organization context
    if (organizationId === NIL_UUID) {
      return res.json({ byForm: [], byUser: [], byDay: [] });
    }

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

    // Return empty array if no organization context
    if (organizationId === NIL_UUID) {
      return res.json([]);
    }

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

    // Return empty data if no organization context
    if (organizationId === NIL_UUID) {
      return res.json({ deliveryStats: [], recentEvents: [] });
    }

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

/**
 * GET /api/v1/analytics/team-performance
 * Team performance metrics for manager dashboard
 */
router.get('/team-performance', async (req, res, next) => {
  try {
    const { organizationId } = req.user!;

    // Return empty data if no organization context
    if (organizationId === NIL_UUID) {
      return res.json({
        totals: { totalSubmissions: 0, approvedSubmissions: 0, pendingSubmissions: 0 },
        topPerformer: null,
        avgPerPerson: 0,
        members: [],
      });
    }

    // Get team members with their submission counts (last 30 days)
    const teamPerformance = await query<{
      userId: string;
      userName: string | null;
      email: string;
      totalSubmissions: string;
      approvedSubmissions: string;
      pendingSubmissions: string;
    }>(
      `
      SELECT
        u.id AS "userId",
        u.name AS "userName",
        u.email,
        COUNT(s.id) FILTER (WHERE s.created_at >= NOW() - INTERVAL '30 days') AS "totalSubmissions",
        COUNT(s.id) FILTER (WHERE s.status = 'approved' AND s.created_at >= NOW() - INTERVAL '30 days') AS "approvedSubmissions",
        COUNT(s.id) FILTER (WHERE s.status IN ('submitted', 'draft') AND s.created_at >= NOW() - INTERVAL '30 days') AS "pendingSubmissions"
      FROM users u
      LEFT JOIN submissions s ON s.submitted_by_id = u.id AND s.deleted_at IS NULL
      WHERE u.organization_id = $1
        AND u.deleted_at IS NULL
        AND u.role = 'worker'
      GROUP BY u.id, u.name, u.email
      ORDER BY COUNT(s.id) DESC
      LIMIT 20
    `,
      [organizationId],
    );

    // Calculate team totals
    const totals = teamPerformance.reduce(
      (acc, member) => ({
        totalSubmissions: acc.totalSubmissions + parseInt(member.totalSubmissions || '0'),
        approvedSubmissions: acc.approvedSubmissions + parseInt(member.approvedSubmissions || '0'),
        pendingSubmissions: acc.pendingSubmissions + parseInt(member.pendingSubmissions || '0'),
      }),
      { totalSubmissions: 0, approvedSubmissions: 0, pendingSubmissions: 0 },
    );

    // Find top performer
    const topPerformer = teamPerformance.length > 0
      ? {
          userId: teamPerformance[0].userId,
          name: teamPerformance[0].userName || teamPerformance[0].email,
          submissions: parseInt(teamPerformance[0].totalSubmissions || '0'),
        }
      : null;

    res.json({
      totals,
      topPerformer,
      avgPerPerson: teamPerformance.length > 0
        ? Math.round(totals.totalSubmissions / teamPerformance.length)
        : 0,
      members: teamPerformance.map((member) => ({
        userId: member.userId,
        name: member.userName || member.email,
        email: member.email,
        totalSubmissions: parseInt(member.totalSubmissions || '0'),
        approvedSubmissions: parseInt(member.approvedSubmissions || '0'),
        pendingSubmissions: parseInt(member.pendingSubmissions || '0'),
      })),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/analytics/dashboard-stats
 * Quick stats for dashboard overview cards (StatsGrid)
 */
router.get('/dashboard-stats', async (req, res, next) => {
  try {
    const { organizationId } = req.user!;

    // Return empty stats if no organization context
    if (organizationId === NIL_UUID) {
      return res.json({
        monthlySubmissions: { value: 0, trend: 0, label: 'הגשות החודש' },
        completionRate: { value: 0, trend: 0, label: 'אחוז השלמה' },
        activeForms: { value: 0, label: 'טפסים פעילים' },
        activeUsers: { value: 0, label: 'משתמשים פעילים' },
      });
    }

    // Get statistics in parallel
    const [
      currentMonthSubmissions,
      lastMonthSubmissions,
      currentMonthApproved,
      lastMonthApproved,
      totalForms,
      activeUsers,
    ] = await Promise.all([
      // Current month submissions
      query<{ count: string }>(
        `
        SELECT COUNT(*) as count
        FROM submissions
        WHERE organization_id = $1
          AND deleted_at IS NULL
          AND created_at >= DATE_TRUNC('month', NOW())
        `,
        [organizationId],
      ),

      // Last month submissions (for trend calculation)
      query<{ count: string }>(
        `
        SELECT COUNT(*) as count
        FROM submissions
        WHERE organization_id = $1
          AND deleted_at IS NULL
          AND created_at >= DATE_TRUNC('month', NOW() - INTERVAL '1 month')
          AND created_at < DATE_TRUNC('month', NOW())
        `,
        [organizationId],
      ),

      // Current month approved (completion rate)
      query<{ count: string }>(
        `
        SELECT COUNT(*) as count
        FROM submissions
        WHERE organization_id = $1
          AND deleted_at IS NULL
          AND status IN ('approved', 'submitted')
          AND created_at >= DATE_TRUNC('month', NOW())
        `,
        [organizationId],
      ),

      // Last month approved (for trend)
      query<{ count: string }>(
        `
        SELECT COUNT(*) as count
        FROM submissions
        WHERE organization_id = $1
          AND deleted_at IS NULL
          AND status IN ('approved', 'submitted')
          AND created_at >= DATE_TRUNC('month', NOW() - INTERVAL '1 month')
          AND created_at < DATE_TRUNC('month', NOW())
        `,
        [organizationId],
      ),

      // Total active forms
      query<{ count: string }>(
        `
        SELECT COUNT(*) as count
        FROM forms
        WHERE organization_id = $1
          AND deleted_at IS NULL
          AND is_active = true
        `,
        [organizationId],
      ),

      // Active users (submitted in last 30 days)
      query<{ count: string }>(
        `
        SELECT COUNT(DISTINCT submitted_by_id) as count
        FROM submissions
        WHERE organization_id = $1
          AND deleted_at IS NULL
          AND created_at >= NOW() - INTERVAL '30 days'
        `,
        [organizationId],
      ),
    ]);

    const currentSubmissions = parseInt(currentMonthSubmissions[0]?.count || '0');
    const lastSubmissions = parseInt(lastMonthSubmissions[0]?.count || '0');
    const currentApproved = parseInt(currentMonthApproved[0]?.count || '0');
    const lastApproved = parseInt(lastMonthApproved[0]?.count || '0');

    // Calculate trends (percentage change)
    const submissionsTrend = lastSubmissions > 0
      ? Math.round(((currentSubmissions - lastSubmissions) / lastSubmissions) * 100)
      : currentSubmissions > 0 ? 100 : 0;

    const completionRate = currentSubmissions > 0
      ? Math.round((currentApproved / currentSubmissions) * 100)
      : 0;

    const lastCompletionRate = lastSubmissions > 0
      ? Math.round((lastApproved / lastSubmissions) * 100)
      : 0;

    const completionTrend = lastCompletionRate > 0
      ? completionRate - lastCompletionRate
      : completionRate > 0 ? completionRate : 0;

    res.json({
      monthlySubmissions: {
        value: currentSubmissions,
        trend: submissionsTrend,
        label: 'הגשות החודש',
      },
      completionRate: {
        value: completionRate,
        trend: completionTrend,
        label: 'אחוז השלמה',
      },
      activeForms: {
        value: parseInt(totalForms[0]?.count || '0'),
        label: 'טפסים פעילים',
      },
      activeUsers: {
        value: parseInt(activeUsers[0]?.count || '0'),
        label: 'משתמשים פעילים',
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
