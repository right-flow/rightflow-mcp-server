import { query } from '../config/database';
import type {
  DailyActivityReport,
  TeamPerformanceReport,
  FormsStatusReport,
  SubmissionsByHour,
  RecentSubmission,
  TeamMember,
  StatusCount,
  StatusTrend,
} from '../types/reports';

// Type for submissions table row
interface FormSubmissionRow {
  id: string;
  organization_id: string;
  form_id: string;
  submitted_by_id: string | null;
  submitted_by_name: string | null; // Joined from users table
  status: string | null;
  created_at: string;
  metadata: any;
}

/**
 * Helper: Parse completion time from metadata
 * Handles various metadata formats (string JSON, object, null)
 */
function parseCompletionTime(metadata: any): number | null {
  if (!metadata) return null;

  let parsed = metadata;
  if (typeof metadata === 'string') {
    try {
      parsed = JSON.parse(metadata);
    } catch {
      return null;
    }
  }

  const totalSeconds = parsed.totalSeconds;
  if (totalSeconds === null || totalSeconds === undefined || isNaN(totalSeconds)) {
    return null;
  }

  return totalSeconds;
}

/**
 * Helper: Calculate average from array of numbers
 */
function calculateAverage(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  const sum = numbers.reduce((acc, n) => acc + n, 0);
  return Math.round((sum / numbers.length) * 100) / 100; // Round to 2 decimals
}

export class ReportsService {

  /**
   * Get Daily Activity Report
   * Shows today's submission activity compared to yesterday
   *
   * @param organizationId - Organization ID for filtering
   * @param date - Target date (ISO format YYYY-MM-DD), defaults to today
   * @returns Daily activity metrics including submissions, users, approval rate, hourly breakdown
   */
  async getDailyActivityReport(
    organizationId: string,
    date?: string,
  ): Promise<DailyActivityReport> {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const yesterday = new Date(targetDate);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // Get submissions for today (join with users to get names)
    const todaySubmissions = await query<FormSubmissionRow>(
      `SELECT s.*, u.name as submitted_by_name
       FROM submissions s
       LEFT JOIN users u ON s.submitted_by_id = u.id
       WHERE s.organization_id = $1
       AND DATE(s.created_at) = $2
       AND s.deleted_at IS NULL`,
      [organizationId, targetDate],
    );

    // Get submissions count for yesterday
    const yesterdayResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM submissions
       WHERE organization_id = $1
       AND DATE(created_at) = $2
       AND deleted_at IS NULL`,
      [organizationId, yesterdayStr],
    );

    const submissionsToday = todaySubmissions.length;
    const submissionsYesterday = Number(yesterdayResult[0]?.count || 0);

    // Calculate percent change
    let percentChange = 0;
    if (submissionsYesterday > 0) {
      percentChange = ((submissionsToday - submissionsYesterday) / submissionsYesterday) * 100;
    } else if (submissionsToday > 0) {
      percentChange = 100;
    }

    // Get unique active users today
    const activeUsersResult = await query<{ count: string }>(
      `SELECT COUNT(DISTINCT submitted_by_id) as count FROM submissions
       WHERE organization_id = $1
       AND DATE(created_at) = $2
       AND deleted_at IS NULL`,
      [organizationId, targetDate],
    );

    // Calculate average completion time from metadata
    const completionTimes = todaySubmissions
      .map((s) => parseCompletionTime(s.metadata))
      .filter((t): t is number => t !== null);

    const avgCompletionTime = calculateAverage(completionTimes);

    // Calculate approval rate
    const approvedCount = todaySubmissions.filter((s) => s.status === 'approved').length;
    const approvalRate = submissionsToday > 0 ? (approvedCount / submissionsToday) * 100 : 0;

    // Get submissions by hour (0-23)
    const submissionsByHour: SubmissionsByHour[] = [];
    for (let hour = 0; hour < 24; hour++) {
      const count = todaySubmissions.filter((s) => {
        const submissionHour = new Date(s.created_at).getHours();
        return submissionHour === hour;
      }).length;
      submissionsByHour.push({ hour, count });
    }

    // Get recent submissions (last 10)
    const recentSubmissions: RecentSubmission[] = todaySubmissions
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10)
      .map((s) => ({
        id: s.id,
        formType: s.form_id, // form_id is UUID reference, not form_type string
        submittedBy: s.submitted_by_name || s.submitted_by_id || 'Unknown',
        submittedAt: s.created_at,
        status: s.status || 'pending',
      }));

    return {
      submissionsToday,
      submissionsYesterday,
      percentChange: Math.round(percentChange * 100) / 100, // Round to 2 decimals
      activeUsers: Number(activeUsersResult[0]?.count || 0),
      avgCompletionTime: Math.round(avgCompletionTime * 100) / 100,
      approvalRate: Math.round(approvalRate * 100) / 100,
      submissionsByHour,
      recentSubmissions,
    };
  }

  /**
   * Get Team Performance Report
   * Aggregates performance metrics by team member for a date range
   *
   * @param organizationId - Organization ID for filtering
   * @param from - Start date (ISO format YYYY-MM-DD)
   * @param to - End date (ISO format YYYY-MM-DD)
   * @returns Team member stats and team-wide summary
   */
  async getTeamPerformanceReport(
    organizationId: string,
    from: string,
    to: string,
  ): Promise<TeamPerformanceReport> {
    // Get all submissions in date range (join with users to get names)
    const submissions = await query<FormSubmissionRow>(
      `SELECT s.*, u.name as submitted_by_name
       FROM submissions s
       LEFT JOIN users u ON s.submitted_by_id = u.id
       WHERE s.organization_id = $1
       AND DATE(s.created_at) >= $2
       AND DATE(s.created_at) <= $3
       AND s.deleted_at IS NULL`,
      [organizationId, from, to],
    );

    // Group by user
    const userStats = new Map<string, {
      userName: string | null;
      submissions: number;
      approved: number;
      rejected: number;
      pending: number;
      totalTime: number;
      timeCount: number;
    }>();

    submissions.forEach((s) => {
      const userId = s.submitted_by_id || 'unknown';
      if (!userStats.has(userId)) {
        userStats.set(userId, {
          userName: s.submitted_by_name,
          submissions: 0,
          approved: 0,
          rejected: 0,
          pending: 0,
          totalTime: 0,
          timeCount: 0,
        });
      }

      const stats = userStats.get(userId)!;
      stats.submissions++;

      if (s.status === 'approved') stats.approved++;
      else if (s.status === 'rejected') stats.rejected++;
      else stats.pending++;

      // Parse completion time from metadata
      const completionTime = parseCompletionTime(s.metadata);
      if (completionTime !== null) {
        stats.totalTime += completionTime;
        stats.timeCount++;
      }
    });

    // Convert to TeamMember array
    const members: TeamMember[] = Array.from(userStats.entries()).map(([userId, stats]) => ({
      userId,
      userName: stats.userName || userId, // Use actual name or fallback to userId
      totalSubmissions: stats.submissions,
      approvedSubmissions: stats.approved,
      rejectedSubmissions: stats.rejected,
      pendingSubmissions: stats.pending,
      avgCompletionTime: stats.timeCount > 0 ? Math.round((stats.totalTime / stats.timeCount) * 100) / 100 : 0,
      approvalRate: stats.submissions > 0 ? Math.round((stats.approved / stats.submissions) * 100 * 100) / 100 : 0,
    }));

    // Calculate summary
    const totalSubmissions = submissions.length;
    const totalApproved = submissions.filter((s) => s.status === 'approved').length;
    const avgTeamApprovalRate = totalSubmissions > 0 ? Math.round((totalApproved / totalSubmissions) * 100 * 100) / 100 : 0;

    const allCompletionTimes = submissions
      .map((s) => parseCompletionTime(s.metadata))
      .filter((t): t is number => t !== null);

    const avgTeamCompletionTime = calculateAverage(allCompletionTimes);

    return {
      members,
      summary: {
        totalMembers: members.length,
        totalSubmissions,
        avgTeamApprovalRate,
        avgTeamCompletionTime,
      },
    };
  }

  /**
   * Get Forms Status Report
   * Shows distribution of form submissions by status with trend analysis
   *
   * @param organizationId - Organization ID for filtering
   * @param from - Start date (ISO format YYYY-MM-DD)
   * @param to - End date (ISO format YYYY-MM-DD)
   * @returns Status counts, percentages, long-waiting count, and daily trends
   */
  async getFormsStatusReport(
    organizationId: string,
    from: string,
    to: string,
  ): Promise<FormsStatusReport> {
    // Get all submissions in date range
    const submissions = await query<FormSubmissionRow>(
      `SELECT s.*, u.name as submitted_by_name
       FROM submissions s
       LEFT JOIN users u ON s.submitted_by_id = u.id
       WHERE s.organization_id = $1
       AND DATE(s.created_at) >= $2
       AND DATE(s.created_at) <= $3
       AND s.deleted_at IS NULL`,
      [organizationId, from, to],
    );

    // Count by status
    const statusCounts = new Map<string, number>();
    submissions.forEach((s) => {
      const status = s.status || 'pending';
      statusCounts.set(status, (statusCounts.get(status) || 0) + 1);
    });

    const byStatus: StatusCount[] = Array.from(statusCounts.entries()).map(([status, count]) => ({
      status,
      count,
      percentage: submissions.length > 0
        ? Math.round((count / submissions.length) * 100 * 100) / 100
        : 0,
    }));

    // Count long-waiting (pending > 48 hours)
    const now = new Date();
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const longWaitingCount = submissions.filter((s) => {
      return s.status === 'pending' && new Date(s.created_at) < fortyEightHoursAgo;
    }).length;

    // Calculate trend (group by day)
    const trendMap = new Map<string, { approved: number; rejected: number; pending: number }>();
    submissions.forEach((s) => {
      const date = new Date(s.created_at).toISOString().split('T')[0];
      if (!trendMap.has(date)) {
        trendMap.set(date, { approved: 0, rejected: 0, pending: 0 });
      }
      const trend = trendMap.get(date)!;
      if (s.status === 'approved') trend.approved++;
      else if (s.status === 'rejected') trend.rejected++;
      else trend.pending++;
    });

    const trend: StatusTrend[] = Array.from(trendMap.entries())
      .map(([date, counts]) => ({
        date,
        approved: counts.approved,
        rejected: counts.rejected,
        pending: counts.pending,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      byStatus,
      longWaitingCount,
      trend,
    };
  }
}

// Export singleton instance
export const reportsService = new ReportsService();
