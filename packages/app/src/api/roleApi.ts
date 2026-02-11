// Role API
// Created: 2026-02-07
// Purpose: API client for role-based access control endpoints

import { UserProfile } from './types';

/**
 * Role API endpoints
 * All methods require a Clerk token to be passed in
 */
export const roleApi = {
  /**
   * Get current user profile with role information
   * GET /api/v1/users/me
   */
  getCurrentUser: async (token: string): Promise<UserProfile> => {
    const response = await fetch('/api/v1/users/me', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Failed to get user profile');
    }

    return response.json();
  },

  /**
   * Get all users in organization (Admin only)
   * GET /api/v1/users
   */
  getOrganizationUsers: async (token: string): Promise<UserProfile[]> => {
    const response = await fetch('/api/v1/users', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Failed to get users');
    }

    return response.json();
  },

  /**
   * Update user role (Admin only)
   * PATCH /api/v1/users/:id/role
   */
  updateUserRole: async (
    token: string,
    userId: string,
    role: 'admin' | 'manager' | 'worker'
  ): Promise<UserProfile> => {
    const response = await fetch(`/api/v1/users/${userId}/role`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ role }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Failed to update user role');
    }

    return response.json();
  },

  /**
   * Invite user to organization (Admin only)
   * POST /api/v1/users/invite
   */
  inviteUser: async (
    token: string,
    email: string,
    role: 'admin' | 'manager' | 'worker'
  ): Promise<{ success: boolean; message: string }> => {
    const response = await fetch('/api/v1/users/invite', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, role }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Failed to invite user');
    }

    return response.json();
  },

  /**
   * Remove user from organization (Admin only)
   * DELETE /api/v1/users/:id
   */
  removeUser: async (
    token: string,
    userId: string
  ): Promise<{ success: boolean; message: string }> => {
    const response = await fetch(`/api/v1/users/${userId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Failed to remove user');
    }

    return response.json();
  },

  /**
   * Get user statistics (Admin/Manager only)
   * GET /api/v1/users/stats
   */
  getUserStats: async (token: string): Promise<{
    totalUsers: number;
    roleDistribution: { admin: number; manager: number; worker: number };
  }> => {
    const response = await fetch('/api/v1/users/stats', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Failed to get user stats');
    }

    return response.json();
  },
};
