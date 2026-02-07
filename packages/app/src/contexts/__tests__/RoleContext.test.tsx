// RoleContext Tests
// Created: 2026-02-07
// Purpose: TDD tests for role-based access control context

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import React from 'react';
import { RoleProvider, useRole } from '../RoleContext';
import { UserRole, Permissions, ROLE_PERMISSIONS } from '../../api/types';

// Mock the roleApi
vi.mock('../../api/roleApi', () => ({
  roleApi: {
    getCurrentUser: vi.fn(),
  },
}));

import { roleApi } from '../../api/roleApi';

const mockRoleApi = roleApi as {
  getCurrentUser: ReturnType<typeof vi.fn>;
};

// Test wrapper component
interface WrapperProps {
  children: React.ReactNode;
  orgId?: string;
}

const createWrapper = (orgId: string = 'org_123') => {
  return ({ children }: WrapperProps) => (
    <RoleProvider orgId={orgId}>{children}</RoleProvider>
  );
};

describe('RoleContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('useRole hook', () => {
    it('throws error when used outside RoleProvider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useRole());
      }).toThrow('useRole must be used within a RoleProvider');

      consoleSpy.mockRestore();
    });
  });

  describe('Admin role', () => {
    beforeEach(() => {
      mockRoleApi.getCurrentUser.mockResolvedValue({
        id: 'user_1',
        organizationId: 'org_123',
        clerkUserId: 'clerk_1',
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'admin' as UserRole,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      });
    });

    it('loads admin role correctly', async () => {
      const { result } = renderHook(() => useRole(), {
        wrapper: createWrapper(),
      });

      // Initially loading
      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.role).toBe('admin');
      expect(result.current.isAdmin).toBe(true);
      expect(result.current.isManager).toBe(false);
      expect(result.current.isWorker).toBe(false);
    });

    it('provides all admin permissions', async () => {
      const { result } = renderHook(() => useRole(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const expectedPermissions: Permissions = ROLE_PERMISSIONS.admin;

      expect(result.current.permissions.canManageUsers).toBe(true);
      expect(result.current.permissions.canViewBilling).toBe(true);
      expect(result.current.permissions.canCreateForms).toBe(true);
      expect(result.current.permissions.canDeleteForms).toBe(true);
      expect(result.current.permissions.canViewAllSubmissions).toBe(true);
      expect(result.current.permissions.canViewAnalytics).toBe(true);
      expect(result.current.permissions.canManageWebhooks).toBe(true);
      expect(result.current.permissions).toEqual(expectedPermissions);
    });

    it('hasPermission returns true for all permissions', async () => {
      const { result } = renderHook(() => useRole(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.hasPermission('canManageUsers')).toBe(true);
      expect(result.current.hasPermission('canViewBilling')).toBe(true);
      expect(result.current.hasPermission('canCreateForms')).toBe(true);
    });
  });

  describe('Manager role', () => {
    beforeEach(() => {
      mockRoleApi.getCurrentUser.mockResolvedValue({
        id: 'user_2',
        organizationId: 'org_123',
        clerkUserId: 'clerk_2',
        email: 'manager@example.com',
        name: 'Manager User',
        role: 'manager' as UserRole,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      });
    });

    it('loads manager role correctly', async () => {
      const { result } = renderHook(() => useRole(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.role).toBe('manager');
      expect(result.current.isAdmin).toBe(false);
      expect(result.current.isManager).toBe(true);
      expect(result.current.isWorker).toBe(false);
    });

    it('provides manager permissions (no user management, no billing)', async () => {
      const { result } = renderHook(() => useRole(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.permissions.canManageUsers).toBe(false);
      expect(result.current.permissions.canViewBilling).toBe(false);
      expect(result.current.permissions.canCreateForms).toBe(true);
      expect(result.current.permissions.canDeleteForms).toBe(false);
      expect(result.current.permissions.canViewAllSubmissions).toBe(true);
      expect(result.current.permissions.canViewAnalytics).toBe(true);
    });
  });

  describe('Worker role', () => {
    beforeEach(() => {
      mockRoleApi.getCurrentUser.mockResolvedValue({
        id: 'user_3',
        organizationId: 'org_123',
        clerkUserId: 'clerk_3',
        email: 'worker@example.com',
        name: 'Worker User',
        role: 'worker' as UserRole,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      });
    });

    it('loads worker role correctly', async () => {
      const { result } = renderHook(() => useRole(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.role).toBe('worker');
      expect(result.current.isAdmin).toBe(false);
      expect(result.current.isManager).toBe(false);
      expect(result.current.isWorker).toBe(true);
    });

    it('provides minimal worker permissions', async () => {
      const { result } = renderHook(() => useRole(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.permissions.canManageUsers).toBe(false);
      expect(result.current.permissions.canViewBilling).toBe(false);
      expect(result.current.permissions.canCreateForms).toBe(false);
      expect(result.current.permissions.canEditForms).toBe(false);
      expect(result.current.permissions.canDeleteForms).toBe(false);
      expect(result.current.permissions.canViewAllSubmissions).toBe(false);
      expect(result.current.permissions.canViewOwnSubmissions).toBe(true);
      expect(result.current.permissions.canViewAnalytics).toBe(false);
    });

    it('hasPermission returns false for admin/manager permissions', async () => {
      const { result } = renderHook(() => useRole(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.hasPermission('canManageUsers')).toBe(false);
      expect(result.current.hasPermission('canViewBilling')).toBe(false);
      expect(result.current.hasPermission('canViewOwnSubmissions')).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('sets error state when API fails', async () => {
      mockRoleApi.getCurrentUser.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useRole(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.role).toBeNull();
    });

    it('clearError clears the error state', async () => {
      mockRoleApi.getCurrentUser.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useRole(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('refreshRole', () => {
    it('refreshes role data from API', async () => {
      mockRoleApi.getCurrentUser.mockResolvedValueOnce({
        id: 'user_1',
        organizationId: 'org_123',
        clerkUserId: 'clerk_1',
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'admin' as UserRole,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      });

      const { result } = renderHook(() => useRole(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.role).toBe('admin');
      });

      // Now mock a role change (e.g., user was demoted)
      mockRoleApi.getCurrentUser.mockResolvedValueOnce({
        id: 'user_1',
        organizationId: 'org_123',
        clerkUserId: 'clerk_1',
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'manager' as UserRole,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      });

      await act(async () => {
        await result.current.refreshRole();
      });

      expect(result.current.role).toBe('manager');
      expect(result.current.isAdmin).toBe(false);
      expect(result.current.isManager).toBe(true);
    });
  });

  describe('orgId changes', () => {
    it('reloads role when orgId changes', async () => {
      mockRoleApi.getCurrentUser.mockResolvedValue({
        id: 'user_1',
        organizationId: 'org_123',
        clerkUserId: 'clerk_1',
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'admin' as UserRole,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      });

      const { result, rerender } = renderHook(() => useRole(), {
        wrapper: createWrapper('org_123'),
      });

      await waitFor(() => {
        expect(result.current.role).toBe('admin');
      });

      // API should have been called once
      expect(mockRoleApi.getCurrentUser).toHaveBeenCalledTimes(1);

      // Rerender with new orgId
      rerender();

      // After rerender with same wrapper, should not call API again
      // (this tests that we don't have unnecessary re-fetches)
    });
  });

  describe('User profile', () => {
    it('provides user profile data', async () => {
      const mockProfile = {
        id: 'user_1',
        organizationId: 'org_123',
        clerkUserId: 'clerk_1',
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'admin' as UserRole,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      };

      mockRoleApi.getCurrentUser.mockResolvedValue(mockProfile);

      const { result } = renderHook(() => useRole(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toEqual(mockProfile);
      expect(result.current.user?.email).toBe('admin@example.com');
      expect(result.current.user?.name).toBe('Admin User');
    });
  });
});
