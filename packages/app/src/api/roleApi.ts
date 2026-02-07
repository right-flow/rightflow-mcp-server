// Role API
// Created: 2026-02-07
// Purpose: API client for role-based access control endpoints

import { apiClient } from './utils/apiClient';
import { UserProfile } from './types';

/**
 * Role API endpoints
 */
export const roleApi = {
  /**
   * Get current user profile with role information
   * GET /api/v1/users/me
   */
  getCurrentUser: async (): Promise<UserProfile> => {
    const response = await apiClient.get<UserProfile>('/api/v1/users/me');
    return response;
  },

  /**
   * Get all users in organization (Admin only)
   * GET /api/v1/users
   */
  getOrganizationUsers: async (): Promise<UserProfile[]> => {
    const response = await apiClient.get<UserProfile[]>('/api/v1/users');
    return response;
  },

  /**
   * Update user role (Admin only)
   * PATCH /api/v1/users/:id/role
   */
  updateUserRole: async (userId: string, role: 'admin' | 'manager' | 'worker'): Promise<UserProfile> => {
    const response = await apiClient.patch<UserProfile>(`/api/v1/users/${userId}/role`, { role });
    return response;
  },

  /**
   * Invite user to organization (Admin only)
   * POST /api/v1/users/invite
   */
  inviteUser: async (email: string, role: 'admin' | 'manager' | 'worker'): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post<{ success: boolean; message: string }>('/api/v1/users/invite', {
      email,
      role,
    });
    return response;
  },

  /**
   * Remove user from organization (Admin only)
   * DELETE /api/v1/users/:id
   */
  removeUser: async (userId: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.delete<{ success: boolean; message: string }>(`/api/v1/users/${userId}`);
    return response;
  },
};
