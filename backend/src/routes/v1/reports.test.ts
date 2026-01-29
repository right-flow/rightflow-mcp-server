/**
 * Reports API Routes - Unit Tests
 *
 * Test Coverage:
 * - Authentication (Clerk JWT)
 * - Input validation
 * - Error handling
 * - Response format
 * - Organization isolation
 */

import request from 'supertest';
import express, { Express } from 'express';
import { reportsRouter } from './reports';
import { reportsService } from '../../services/reportsService';

// Mock the reports service
jest.mock('../../services/reportsService');

// Mock Clerk authentication middleware
jest.mock('../../middleware/auth', () => ({
  authenticateJWT: (req: any, _res: any, next: any) => {
    // Simulate authenticated user
    req.user = {
      id: 'user_test123',
      organizationId: 'org_test123',
    };
    next();
  },
}));

// Mock syncUser middleware
jest.mock('../../middleware/syncUser', () => ({
  syncUser: (_req: any, _res: any, next: any) => {
    // Pass through
    next();
  },
}));

describe('Reports API Routes', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/reports', reportsRouter);
    jest.clearAllMocks();
  });

  // ============================================================================
  // GET /api/v1/reports/daily-activity
  // ============================================================================

  describe('GET /api/v1/reports/daily-activity', () => {
    it('should return daily activity report for authenticated user', async () => {
      // Arrange
      const mockReport = {
        submissionsToday: 50,
        submissionsYesterday: 40,
        percentChange: 25,
        activeUsers: 5,
        avgCompletionTime: 120,
        approvalRate: 80,
        submissionsByHour: Array(24).fill(null).map((_, i) => ({ hour: i, count: 2 })),
        recentSubmissions: [],
      };

      (reportsService.getDailyActivityReport as jest.Mock).mockResolvedValue(mockReport);

      // Act
      const response = await request(app)
        .get('/api/v1/reports/daily-activity')
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockReport);
      expect(response.body.timestamp).toBeDefined();
      expect(reportsService.getDailyActivityReport).toHaveBeenCalledWith(
        'org_test123',
        undefined, // No date provided
      );
    });

    it('should accept optional date parameter', async () => {
      // Arrange
      const mockReport = {
        submissionsToday: 30,
        submissionsYesterday: 25,
        percentChange: 20,
        activeUsers: 3,
        avgCompletionTime: 100,
        approvalRate: 75,
        submissionsByHour: [],
        recentSubmissions: [],
      };

      (reportsService.getDailyActivityReport as jest.Mock).mockResolvedValue(mockReport);

      // Act
      await request(app)
        .get('/api/v1/reports/daily-activity?date=2026-01-15')
        .expect(200);

      // Assert
      expect(reportsService.getDailyActivityReport).toHaveBeenCalledWith(
        'org_test123',
        '2026-01-15',
      );
    });

    it('should validate date format (YYYY-MM-DD)', async () => {
      // Act
      const response = await request(app)
        .get('/api/v1/reports/daily-activity?date=invalid-date')
        .expect(400);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid date format');
    });

    it('should handle service errors gracefully', async () => {
      // Arrange
      (reportsService.getDailyActivityReport as jest.Mock).mockRejectedValue(
        new Error('Database connection failed'),
      );

      // Act
      const response = await request(app)
        .get('/api/v1/reports/daily-activity')
        .expect(500);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  // ============================================================================
  // GET /api/v1/reports/team-performance
  // ============================================================================

  describe('GET /api/v1/reports/team-performance', () => {
    it('should return team performance report', async () => {
      // Arrange
      const mockReport = {
        members: [
          {
            userId: 'user1',
            userName: 'User 1',
            totalSubmissions: 10,
            approvedSubmissions: 8,
            rejectedSubmissions: 1,
            pendingSubmissions: 1,
            avgCompletionTime: 120,
            approvalRate: 80,
          },
        ],
        summary: {
          totalMembers: 1,
          totalSubmissions: 10,
          avgTeamApprovalRate: 80,
          avgTeamCompletionTime: 120,
        },
      };

      (reportsService.getTeamPerformanceReport as jest.Mock).mockResolvedValue(mockReport);

      // Act
      const response = await request(app)
        .get('/api/v1/reports/team-performance?from=2026-01-01&to=2026-01-31')
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockReport);
      expect(reportsService.getTeamPerformanceReport).toHaveBeenCalledWith(
        'org_test123',
        '2026-01-01',
        '2026-01-31',
      );
    });

    it('should require from and to query parameters', async () => {
      // Act - Missing both
      const response1 = await request(app)
        .get('/api/v1/reports/team-performance')
        .expect(400);

      expect(response1.body.error).toContain('from');

      // Act - Missing to
      const response2 = await request(app)
        .get('/api/v1/reports/team-performance?from=2026-01-01')
        .expect(400);

      expect(response2.body.error).toContain('to');
    });

    it('should validate date format for from and to', async () => {
      // Act
      const response = await request(app)
        .get('/api/v1/reports/team-performance?from=invalid&to=2026-01-31')
        .expect(400);

      // Assert
      expect(response.body.error).toContain('Invalid date format');
    });

    it('should validate from is before to', async () => {
      // Act
      const response = await request(app)
        .get('/api/v1/reports/team-performance?from=2026-01-31&to=2026-01-01')
        .expect(400);

      // Assert
      expect(response.body.error).toContain('from date must be before to date');
    });
  });

  // ============================================================================
  // GET /api/v1/reports/forms-status
  // ============================================================================

  describe('GET /api/v1/reports/forms-status', () => {
    it('should return forms status report', async () => {
      // Arrange
      const mockReport = {
        byStatus: [
          { status: 'approved', count: 70, percentage: 70 },
          { status: 'rejected', count: 20, percentage: 20 },
          { status: 'pending', count: 10, percentage: 10 },
        ],
        longWaitingCount: 2,
        trend: [
          { date: '2026-01-01', approved: 10, rejected: 2, pending: 1 },
        ],
      };

      (reportsService.getFormsStatusReport as jest.Mock).mockResolvedValue(mockReport);

      // Act
      const response = await request(app)
        .get('/api/v1/reports/forms-status?from=2026-01-01&to=2026-01-31')
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockReport);
      expect(reportsService.getFormsStatusReport).toHaveBeenCalledWith(
        'org_test123',
        '2026-01-01',
        '2026-01-31',
      );
    });

    it('should require from and to query parameters', async () => {
      // Act
      const response = await request(app)
        .get('/api/v1/reports/forms-status')
        .expect(400);

      // Assert
      expect(response.body.error).toContain('from');
    });

    it('should validate date range (max 90 days)', async () => {
      // Act - More than 90 days
      const response = await request(app)
        .get('/api/v1/reports/forms-status?from=2026-01-01&to=2026-05-01')
        .expect(400);

      // Assert
      expect(response.body.error).toContain('Date range cannot exceed 90 days');
    });
  });

  // ============================================================================
  // Authentication Tests
  // ============================================================================

  describe('Authentication', () => {
    it('should reject unauthenticated requests', async () => {
      // Create app without auth mock
      const appNoAuth = express();
      appNoAuth.use(express.json());

      // Use actual auth middleware (which will reject)
      jest.unmock('../../middleware/auth');
      const { requireAuth } = require('../../middleware/auth');
      appNoAuth.use('/api/v1/reports', requireAuth, reportsRouter);

      // Act
      const response = await request(appNoAuth)
        .get('/api/v1/reports/daily-activity')
        .expect(401);

      // Assert
      expect(response.body.error).toBeDefined();
    });
  });

  // ============================================================================
  // Organization Isolation Tests (Security)
  // ============================================================================

  describe('Organization Isolation', () => {
    it('should only return data for authenticated user organization', async () => {
      // Arrange
      const mockReport = { submissionsToday: 50, submissionsYesterday: 40 };
      (reportsService.getDailyActivityReport as jest.Mock).mockResolvedValue(mockReport);

      // Act
      await request(app)
        .get('/api/v1/reports/daily-activity')
        .expect(200);

      // Assert - Verify organizationId from auth context is used
      expect(reportsService.getDailyActivityReport).toHaveBeenCalledWith(
        'org_test123', // From mocked auth
        undefined,
      );
    });

    it('should reject request if user has no organizationId (daily-activity)', async () => {
      // Create app with user that has no organizationId
      const appNoOrg = express();
      appNoOrg.use(express.json());

      // Mock auth to return user without organizationId
      jest.doMock('../../middleware/auth', () => ({
        authenticateJWT: (req: any, _res: any, next: any) => {
          req.user = {
            id: 'user_no_org',
            organizationId: null, // User not part of organization
          };
          next();
        },
      }));

      appNoOrg.use('/api/v1/reports', reportsRouter);

      // Act
      const response = await request(appNoOrg)
        .get('/api/v1/reports/daily-activity')
        .expect(403);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('User must be part of an organization to access reports');
      expect(response.body.timestamp).toBeDefined();
    });

    it('should reject request if user has no organizationId (team-performance)', async () => {
      // Create app with user that has no organizationId
      const appNoOrg = express();
      appNoOrg.use(express.json());

      // Mock auth to return user without organizationId
      jest.doMock('../../middleware/auth', () => ({
        authenticateJWT: (req: any, _res: any, next: any) => {
          req.user = {
            id: 'user_no_org',
            organizationId: null,
          };
          next();
        },
      }));

      appNoOrg.use('/api/v1/reports', reportsRouter);

      // Act
      const response = await request(appNoOrg)
        .get('/api/v1/reports/team-performance?from=2026-01-01&to=2026-01-31')
        .expect(403);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('User must be part of an organization to access reports');
    });

    it('should reject request if user has no organizationId (forms-status)', async () => {
      // Create app with user that has no organizationId
      const appNoOrg = express();
      appNoOrg.use(express.json());

      // Mock auth to return user without organizationId
      jest.doMock('../../middleware/auth', () => ({
        authenticateJWT: (req: any, _res: any, next: any) => {
          req.user = {
            id: 'user_no_org',
            organizationId: null,
          };
          next();
        },
      }));

      appNoOrg.use('/api/v1/reports', reportsRouter);

      // Act
      const response = await request(appNoOrg)
        .get('/api/v1/reports/forms-status?from=2026-01-01&to=2026-01-31')
        .expect(403);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('User must be part of an organization to access reports');
    });
  });
});
