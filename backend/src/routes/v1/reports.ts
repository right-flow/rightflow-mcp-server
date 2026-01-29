/**
 * Reports API Routes
 *
 * Endpoints:
 * - GET /api/v1/reports/daily-activity - Daily activity metrics
 * - GET /api/v1/reports/team-performance - Team performance aggregation
 * - GET /api/v1/reports/forms-status - Forms status distribution
 */

import express from 'express';
import { z } from 'zod';
import { authenticateJWT } from '../../middleware/auth';
import { syncUser } from '../../middleware/syncUser';
import { validateRequest } from '../../utils/validation';
import logger from '../../utils/logger';
import { reportsService } from '../../services/reportsService';

export const reportsRouter = express.Router();

// Apply authentication + user sync to all routes
reportsRouter.use(authenticateJWT);
reportsRouter.use(syncUser);

// ============================================================================
// Validation Schemas
// ============================================================================

/**
 * ISO date format (YYYY-MM-DD)
 */
const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;

const dailyActivityQuerySchema = z.object({
  date: z
    .string()
    .regex(isoDateRegex, 'Invalid date format. Expected YYYY-MM-DD')
    .optional(),
});

const dateRangeQuerySchema = z
  .object({
    from: z.string().regex(isoDateRegex, 'Invalid from date format. Expected YYYY-MM-DD'),
    to: z.string().regex(isoDateRegex, 'Invalid to date format. Expected YYYY-MM-DD'),
  })
  .refine(
    (data) => {
      const fromDate = new Date(data.from);
      const toDate = new Date(data.to);
      return fromDate <= toDate;
    },
    { message: 'from date must be before to date' },
  )
  .refine(
    (data) => {
      const fromDate = new Date(data.from);
      const toDate = new Date(data.to);
      const diffDays = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays <= 90;
    },
    { message: 'Date range cannot exceed 90 days' },
  );

// ============================================================================
// Helper: Format API Response
// ============================================================================

function successResponse<T>(data: T) {
  return {
    success: true,
    data,
    timestamp: new Date().toISOString(),
  };
}

// ============================================================================
// Routes
// ============================================================================

/**
 * GET /api/v1/reports/daily-activity
 *
 * Returns daily activity report showing today's metrics compared to yesterday
 *
 * Query Parameters:
 * - date (optional): Target date in YYYY-MM-DD format (defaults to today)
 *
 * Response:
 * {
 *   success: true,
 *   data: {
 *     submissionsToday: number,
 *     submissionsYesterday: number,
 *     percentChange: number,
 *     activeUsers: number,
 *     avgCompletionTime: number,
 *     approvalRate: number,
 *     submissionsByHour: Array<{hour: number, count: number}>,
 *     recentSubmissions: Array<{id, formType, submittedBy, submittedAt, status}>
 *   },
 *   timestamp: string
 * }
 */
reportsRouter.get('/daily-activity', async (req, res, next) => {
  try {
    const { organizationId } = req.user!;

    if (!organizationId) {
      return res.status(403).json({
        success: false,
        error: 'User must be part of an organization to access reports',
        timestamp: new Date().toISOString(),
      });
    }

    // Validate query params
    const { date } = validateRequest(dailyActivityQuerySchema, req.query);

    logger.info('Generating daily activity report', {
      organizationId,
      date: date || 'today',
      userId: req.user!.id,
    });

    // Get report from service
    const report = await reportsService.getDailyActivityReport(organizationId, date);

    logger.debug('Daily activity report generated successfully', {
      organizationId,
      submissionsToday: report.submissionsToday,
      activeUsers: report.activeUsers,
    });

    return res.json(successResponse(report));
  } catch (error: any) {
    logger.error('Failed to generate daily activity report', {
      error: error.message,
      stack: error.stack,
      organizationId: req.user?.organizationId,
    });
    return next(error);
  }
});

/**
 * GET /api/v1/reports/team-performance
 *
 * Returns team performance metrics aggregated by team member
 *
 * Query Parameters (required):
 * - from: Start date in YYYY-MM-DD format
 * - to: End date in YYYY-MM-DD format (max 90 days range)
 *
 * Response:
 * {
 *   success: true,
 *   data: {
 *     members: Array<{
 *       userId, userName, totalSubmissions, approvedSubmissions,
 *       rejectedSubmissions, pendingSubmissions, avgCompletionTime, approvalRate
 *     }>,
 *     summary: {
 *       totalMembers, totalSubmissions, avgTeamApprovalRate, avgTeamCompletionTime
 *     }
 *   },
 *   timestamp: string
 * }
 */
reportsRouter.get('/team-performance', async (req, res, next) => {
  try {
    const { organizationId } = req.user!;

    if (!organizationId) {
      return res.status(403).json({
        success: false,
        error: 'User must be part of an organization to access reports',
        timestamp: new Date().toISOString(),
      });
    }

    // Validate query params
    const { from, to } = validateRequest(dateRangeQuerySchema, req.query);

    logger.info('Generating team performance report', {
      organizationId,
      from,
      to,
      userId: req.user!.id,
    });

    // Get report from service
    const report = await reportsService.getTeamPerformanceReport(organizationId, from, to);

    logger.debug('Team performance report generated successfully', {
      organizationId,
      totalMembers: report.summary.totalMembers,
      totalSubmissions: report.summary.totalSubmissions,
    });

    return res.json(successResponse(report));
  } catch (error: any) {
    logger.error('Failed to generate team performance report', {
      error: error.message,
      stack: error.stack,
      organizationId: req.user?.organizationId,
    });
    return next(error);
  }
});

/**
 * GET /api/v1/reports/forms-status
 *
 * Returns forms status distribution with trend analysis
 *
 * Query Parameters (required):
 * - from: Start date in YYYY-MM-DD format
 * - to: End date in YYYY-MM-DD format (max 90 days range)
 *
 * Response:
 * {
 *   success: true,
 *   data: {
 *     byStatus: Array<{status, count, percentage}>,
 *     longWaitingCount: number,
 *     trend: Array<{date, approved, rejected, pending}>
 *   },
 *   timestamp: string
 * }
 */
reportsRouter.get('/forms-status', async (req, res, next) => {
  try {
    const { organizationId } = req.user!;

    if (!organizationId) {
      return res.status(403).json({
        success: false,
        error: 'User must be part of an organization to access reports',
        timestamp: new Date().toISOString(),
      });
    }

    // Validate query params
    const { from, to } = validateRequest(dateRangeQuerySchema, req.query);

    logger.info('Generating forms status report', {
      organizationId,
      from,
      to,
      userId: req.user!.id,
    });

    // Get report from service
    const report = await reportsService.getFormsStatusReport(organizationId, from, to);

    logger.debug('Forms status report generated successfully', {
      organizationId,
      totalStatuses: report.byStatus.length,
      longWaitingCount: report.longWaitingCount,
    });

    return res.json(successResponse(report));
  } catch (error: any) {
    logger.error('Failed to generate forms status report', {
      error: error.message,
      stack: error.stack,
      organizationId: req.user?.organizationId,
    });
    return next(error);
  }
});

// Export router
export default reportsRouter;
