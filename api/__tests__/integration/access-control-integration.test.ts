/**
 * Access Control Integration Tests
 * Tests that protected endpoints properly enforce tier restrictions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Mock ALL dependencies BEFORE imports
vi.mock('../../lib/auth.js', () => ({
  getAuthContext: vi.fn(),
  getUserFromAuth: vi.fn(),
  checkAccess: vi.fn(),
}));

vi.mock('../../../packages/app/src/lib/db.js', () => ({
  getDb: vi.fn(() => vi.fn()),
  closeDb: vi.fn(),
}));

vi.mock('../../../packages/app/src/services/access-control/AccessControl.js', async () => {
  const actual = await vi.importActual<typeof import('../../../packages/app/src/services/access-control/AccessControl.js')>(
    '../../../packages/app/src/services/access-control/AccessControl.js'
  );
  return {
    ...actual,
    AccessControl: vi.fn(),
  };
});

vi.mock('../../../packages/app/src/services/forms/forms.service.js', () => ({
  FormsService: vi.fn().mockImplementation(() => ({
    getUserFormsCount: vi.fn(),
    createForm: vi.fn(),
    getFormById: vi.fn(),
    getAccessibleForms: vi.fn(),
    getVersionHistory: vi.fn().mockResolvedValue({ success: true, versions: [] }),
    getVersion: vi.fn(),
  })),
}));

vi.mock('../../../packages/app/src/services/data-sources/data-sources.service.js', () => ({
  DataSourcesService: vi.fn().mockImplementation(() => ({
    getDataSources: vi.fn(),
    createDataSource: vi.fn(),
  })),
}));

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: vi.fn(),
  })),
}));

vi.mock('pdf-lib', () => ({
  PDFDocument: {
    load: vi.fn(),
  },
}));

vi.mock('../../lib/ai', () => ({
  CalibrationService: vi.fn(),
  isRtlForm: vi.fn(),
}));

// Import handlers AFTER mocks
import extractFieldsHandler from '../../extract-fields';
import formsHandler from '../../forms';
import dataSourcesHandler from '../../data-sources';
import formVersionsHandler from '../../form-versions';

import { getAuthContext, getUserFromAuth } from '../../lib/auth.js';
import { AccessControl } from '../../../packages/app/src/services/access-control/AccessControl.js';
import { FormsService } from '../../../packages/app/src/services/forms/forms.service.js';

describe('Access Control Integration Tests', () => {
  let mockReq: Partial<VercelRequest>;
  let mockRes: Partial<VercelResponse>;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;
  let setHeaderMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Setup mock response
    jsonMock = vi.fn();
    statusMock = vi.fn(() => ({ json: jsonMock }));
    setHeaderMock = vi.fn();

    mockRes = {
      status: statusMock,
      json: jsonMock,
      setHeader: setHeaderMock,
    } as Partial<VercelResponse>;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('AI Extraction Endpoint', () => {
    beforeEach(() => {
      mockReq = {
        method: 'POST',
        headers: {
          authorization: 'Bearer test-token',
        },
        body: {
          pdfBase64: 'fake-base64-data',
          pageCount: 1,
        },
      } as Partial<VercelRequest>;
    });

    it('should block FREE users from AI extraction', async () => {
      // Mock FREE user
      vi.mocked(getAuthContext).mockResolvedValue({
        userId: 'free-user-id',
        orgId: null,
        orgRole: null,
      });

      // Mock AccessControl - feature not available
      const mockAccessControl = {
        canAccessFeature: vi.fn().mockResolvedValue({
          allowed: false,
          reason: 'Requires PRO tier',
          requiredTier: 'pro',
        }),
      };
      vi.mocked(AccessControl).mockImplementation(() => mockAccessControl as any);

      // Call handler
      await extractFieldsHandler(
        mockReq as VercelRequest,
        mockRes as VercelResponse
      );

      // Assertions
      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Feature not available',
        })
      );
    });

    it('should allow PRO users to use AI extraction', async () => {
      // Mock PRO user
      vi.mocked(getAuthContext).mockResolvedValue({
        userId: 'pro-user-id',
        orgId: null,
        orgRole: null,
      });

      // Mock AccessControl - feature available
      const mockAccessControl = {
        canAccessFeature: vi.fn().mockResolvedValue({
          allowed: true,
        }),
      };
      vi.mocked(AccessControl).mockImplementation(() => mockAccessControl as any);

      // Mock Gemini API error (we don't care about the actual extraction)
      process.env.GEMINI_API_KEY = 'test-key';

      // Call handler - will fail at Gemini but that's ok
      await extractFieldsHandler(
        mockReq as VercelRequest,
        mockRes as VercelResponse
      );

      // Assertions - should NOT get 403
      expect(statusMock).not.toHaveBeenCalledWith(403);
    });
  });

  describe('Forms Endpoint - Count Limit', () => {
    beforeEach(() => {
      mockReq = {
        method: 'POST',
        headers: {
          authorization: 'Bearer test-token',
        },
        query: {}, // Add query object
        body: {
          title: 'New Form',
          fields: [],
        },
      } as Partial<VercelRequest>;
    });

    it('should block FREE users when they reach 10 forms limit', async () => {
      // Mock FREE user
      vi.mocked(getAuthContext).mockResolvedValue({
        userId: 'free-user-id',
        orgId: null,
        orgRole: null,
      });

      // Mock 10 forms already exist
      const mockFormsService = {
        getUserFormsCount: vi.fn().mockResolvedValue(10),
      };
      vi.mocked(FormsService).mockImplementation(() => mockFormsService as any);

      // Mock AccessControl - limit exceeded
      const mockAccessControl = {
        checkLimit: vi.fn().mockResolvedValue({
          allowed: false,
          current: 10,
          limit: 10,
          percentUsed: 100,
        }),
      };
      vi.mocked(AccessControl).mockImplementation(() => mockAccessControl as any);

      // Call handler
      await formsHandler(
        mockReq as VercelRequest,
        mockRes as VercelResponse
      );

      // Assertions
      expect(statusMock).toHaveBeenCalledWith(429);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Limit exceeded',
        })
      );
    });

    it('should allow FREE users to create forms when under limit', async () => {
      // Mock FREE user
      vi.mocked(getAuthContext).mockResolvedValue({
        userId: 'free-user-id',
        orgId: null,
        orgRole: null,
      });

      // Create a proper mock instance
      const createFormMock = vi.fn().mockResolvedValue({
        success: true,
        form: { id: 'new-form-id', title: 'New Form' },
      });

      // Mock 5 forms exist (under limit)
      const mockFormsService = {
        getUserFormsCount: vi.fn().mockResolvedValue(5),
        createForm: createFormMock,
        getFormById: vi.fn(),
        getAccessibleForms: vi.fn(),
      };
      vi.mocked(FormsService).mockImplementation(() => mockFormsService as any);

      // Mock AccessControl - limit ok
      const mockAccessControl = {
        checkLimit: vi.fn().mockResolvedValue({
          allowed: true,
          current: 5,
          limit: 10,
          percentUsed: 50,
        }),
      };
      vi.mocked(AccessControl).mockImplementation(() => mockAccessControl as any);

      // Call handler
      await formsHandler(
        mockReq as VercelRequest,
        mockRes as VercelResponse
      );

      // Assertions - should NOT get 429
      expect(statusMock).not.toHaveBeenCalledWith(429);
      expect(statusMock).toHaveBeenCalledWith(201);
    });
  });

  describe('Data Sources Endpoint - PRO Feature', () => {
    beforeEach(() => {
      mockReq = {
        method: 'POST',
        headers: {
          authorization: 'Bearer test-token',
        },
        body: {
          name: 'Test Data Source',
          type: 'static',
        },
      } as Partial<VercelRequest>;
    });

    it('should block FREE users from creating data sources', async () => {
      // Mock FREE user
      vi.mocked(getAuthContext).mockResolvedValue({
        userId: 'free-user-id',
        orgId: null,
        orgRole: null,
      });

      // Mock AccessControl - feature not available
      const mockAccessControl = {
        canAccessFeature: vi.fn().mockResolvedValue({
          allowed: false,
          reason: 'Requires PRO tier',
          requiredTier: 'pro',
        }),
      };
      vi.mocked(AccessControl).mockImplementation(() => mockAccessControl as any);

      // Call handler
      await dataSourcesHandler(
        mockReq as VercelRequest,
        mockRes as VercelResponse
      );

      // Assertions
      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Feature not available',
        })
      );
    });

    it('should allow GET requests without PRO tier', async () => {
      mockReq.method = 'GET';
      mockReq.query = {}; // Add query object

      // Mock FREE user
      vi.mocked(getAuthContext).mockResolvedValue({
        userId: 'free-user-id',
        orgId: null,
        orgRole: null,
      });

      // Call handler - GET should not check feature
      await dataSourcesHandler(
        mockReq as VercelRequest,
        mockRes as VercelResponse
      );

      // Should not return 403 for GET
      expect(statusMock).not.toHaveBeenCalledWith(403);
    });
  });

  describe('Form Versions Endpoint - PRO Feature', () => {
    beforeEach(() => {
      mockReq = {
        method: 'GET',
        headers: {
          authorization: 'Bearer test-token',
        },
        query: {
          formId: 'test-form-id',
        },
      } as Partial<VercelRequest>;
    });

    it('should block FREE users from accessing version history', async () => {
      // Mock FREE user
      vi.mocked(getUserFromAuth).mockResolvedValue('free-user-id');

      // Mock AccessControl - feature not available
      const mockAccessControl = {
        canAccessFeature: vi.fn().mockResolvedValue({
          allowed: false,
          reason: 'Requires PRO tier',
          requiredTier: 'pro',
        }),
      };
      vi.mocked(AccessControl).mockImplementation(() => mockAccessControl as any);

      // Call handler
      await formVersionsHandler(
        mockReq as VercelRequest,
        mockRes as VercelResponse
      );

      // Assertions
      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Feature not available',
        })
      );
    });

    it('should allow PRO users to access version history', async () => {
      // Mock PRO user
      vi.mocked(getUserFromAuth).mockResolvedValue('pro-user-id');

      // Mock AccessControl - feature available
      const mockAccessControl = {
        canAccessFeature: vi.fn().mockResolvedValue({
          allowed: true,
        }),
      };
      vi.mocked(AccessControl).mockImplementation(() => mockAccessControl as any);

      // Call handler
      await formVersionsHandler(
        mockReq as VercelRequest,
        mockRes as VercelResponse
      );

      // Assertions - should NOT get 403
      expect(statusMock).not.toHaveBeenCalledWith(403);
    });
  });

  describe('Unauthorized Access', () => {
    it('should return 401 when no auth token provided', async () => {
      mockReq = {
        method: 'POST',
        headers: {},
        query: {}, // Add query object
        body: { title: 'Test' },
      } as Partial<VercelRequest>;

      // Mock no auth
      vi.mocked(getAuthContext).mockResolvedValue(null);

      // Call forms handler
      await formsHandler(
        mockReq as VercelRequest,
        mockRes as VercelResponse
      );

      // Assertions
      expect(statusMock).toHaveBeenCalledWith(401);
    });
  });
});
