// Role Context
// Created: 2026-02-07
// Purpose: React Context for role-based access control (RBAC)

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { roleApi } from '../api/roleApi';
import { UserProfile, Permissions, UserRole, ROLE_PERMISSIONS } from '../api/types';
import { getUserFriendlyErrorMessage, logError } from '../api/utils/errorHandler';

/**
 * Role context type definition
 */
interface RoleContextType {
  // State
  user: UserProfile | null;
  role: UserRole | null;
  permissions: Permissions;
  loading: boolean;
  error: string | null;

  // Computed role checks
  isAdmin: boolean;
  isManager: boolean;
  isWorker: boolean;

  // Actions
  refreshRole: () => Promise<void>;
  clearError: () => void;
  hasPermission: (permission: keyof Permissions) => boolean;
}

/**
 * Default permissions (no access)
 */
const DEFAULT_PERMISSIONS: Permissions = {
  canManageUsers: false,
  canViewBilling: false,
  canCreateForms: false,
  canEditForms: false,
  canDeleteForms: false,
  canViewAllSubmissions: false,
  canViewOwnSubmissions: false,
  canViewAnalytics: false,
  canManageWebhooks: false,
};

/**
 * Create context with undefined default (will be provided by RoleProvider)
 */
const RoleContext = createContext<RoleContextType | undefined>(undefined);

/**
 * Role Provider Props
 */
interface RoleProviderProps {
  children: ReactNode;
  orgId: string; // Current organization ID (from Clerk)
  autoLoad?: boolean; // Auto-load data on mount (default: true)
}

/**
 * Role Context Provider
 * Manages user role state and provides permission checking
 */
export const RoleProvider: React.FC<RoleProviderProps> = ({
  children,
  orgId,
  autoLoad = true,
}) => {
  // State
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load user role from API
   */
  const refreshRole = useCallback(async () => {
    if (!orgId) {
      setError('Organization ID is required');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const userData = await roleApi.getCurrentUser();
      setUser(userData);
    } catch (err) {
      const errorMessage = getUserFriendlyErrorMessage(err);
      setError(errorMessage);
      logError(err, 'RoleContext.refreshRole');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Check if user has a specific permission
   */
  const hasPermission = useCallback(
    (permission: keyof Permissions): boolean => {
      if (!user?.role) return false;
      return ROLE_PERMISSIONS[user.role][permission];
    },
    [user?.role]
  );

  /**
   * Load data on mount or when orgId changes
   */
  useEffect(() => {
    if (autoLoad && orgId) {
      refreshRole();
    }
  }, [autoLoad, orgId, refreshRole]);

  /**
   * Computed values
   */
  const role = user?.role ?? null;
  const permissions = role ? ROLE_PERMISSIONS[role] : DEFAULT_PERMISSIONS;
  const isAdmin = role === 'admin';
  const isManager = role === 'manager';
  const isWorker = role === 'worker';

  /**
   * Context value
   */
  const value: RoleContextType = {
    user,
    role,
    permissions,
    loading,
    error,
    isAdmin,
    isManager,
    isWorker,
    refreshRole,
    clearError,
    hasPermission,
  };

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
};

/**
 * Custom hook to use role context
 * Throws error if used outside RoleProvider
 */
export const useRole = (): RoleContextType => {
  const context = useContext(RoleContext);

  if (context === undefined) {
    throw new Error('useRole must be used within a RoleProvider');
  }

  return context;
};

/**
 * Export context for testing
 */
export { RoleContext };
