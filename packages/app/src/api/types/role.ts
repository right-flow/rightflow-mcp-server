// Role Type Definitions
// Created: 2026-02-07
// Purpose: Types for role-based access control (RBAC)

/**
 * User roles in the system
 */
export type UserRole = 'admin' | 'manager' | 'worker';

/**
 * Permission types available in the system
 */
export interface Permissions {
  canManageUsers: boolean;
  canViewBilling: boolean;
  canCreateForms: boolean;
  canEditForms: boolean;
  canDeleteForms: boolean;
  canViewAllSubmissions: boolean;
  canViewOwnSubmissions: boolean;
  canViewAnalytics: boolean;
  canManageWebhooks: boolean;
}

/**
 * User profile returned from /api/v1/users/me
 */
export interface UserProfile {
  id: string;
  organizationId: string;
  clerkUserId: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

/**
 * Permission matrix by role
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permissions> = {
  admin: {
    canManageUsers: true,
    canViewBilling: true,
    canCreateForms: true,
    canEditForms: true,
    canDeleteForms: true,
    canViewAllSubmissions: true,
    canViewOwnSubmissions: true,
    canViewAnalytics: true,
    canManageWebhooks: true,
  },
  manager: {
    canManageUsers: false,
    canViewBilling: false,
    canCreateForms: true,
    canEditForms: true,
    canDeleteForms: false,
    canViewAllSubmissions: true,
    canViewOwnSubmissions: true,
    canViewAnalytics: true,
    canManageWebhooks: false,
  },
  worker: {
    canManageUsers: false,
    canViewBilling: false,
    canCreateForms: false,
    canEditForms: false,
    canDeleteForms: false,
    canViewAllSubmissions: false,
    canViewOwnSubmissions: true,
    canViewAnalytics: false,
    canManageWebhooks: false,
  },
};

/**
 * Get permissions for a role
 */
export function getPermissionsForRole(role: UserRole): Permissions {
  return ROLE_PERMISSIONS[role];
}

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: UserRole, permission: keyof Permissions): boolean {
  return ROLE_PERMISSIONS[role][permission];
}
