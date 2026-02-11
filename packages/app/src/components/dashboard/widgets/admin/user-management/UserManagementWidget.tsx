// User Management Widget
// Created: 2026-02-07
// Purpose: Compact user list widget for Admin Dashboard

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { MaterialIcon } from '@/components/ui/MaterialIcon';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../ui/card';
import { AddUserModal } from './AddUserModal';
import { EditUserRoleModal } from './EditUserRoleModal';
import { useTranslation } from '../../../../../i18n';
import type { UserProfile, UserRole } from '../../../../../api/types/role';

interface UserStats {
  totalUsers: number;
  roleDistribution: {
    admin: number;
    manager: number;
    worker: number;
  };
}

export function UserManagementWidget() {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const t = useTranslation();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    loadUsers();
    loadStats();
  }, []);

  async function loadUsers() {
    try {
      setLoading(true);
      const token = await getToken();
      if (!token) return;

      const response = await fetch('/api/v1/users', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadStats() {
    try {
      const token = await getToken();
      if (!token) return;

      const response = await fetch('/api/v1/users/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to load user stats:', err);
    }
  }

  function getRoleIcon(role: UserRole) {
    switch (role) {
      case 'admin':
        return <MaterialIcon name="shield" size="sm" className="text-purple-500" />;
      case 'manager':
        return <MaterialIcon name="work" size="sm" className="text-blue-500" />;
      case 'worker':
        return <MaterialIcon name="construction" size="sm" className="text-amber-500" />;
      default:
        return null;
    }
  }

  function getRoleLabel(role: UserRole) {
    switch (role) {
      case 'admin':
        return t['dashboard.role.admin'];
      case 'manager':
        return t['dashboard.role.manager'];
      case 'worker':
        return t['dashboard.role.worker'];
      default:
        return t['dashboard.role.user'];
    }
  }

  function handleUserUpdated() {
    loadUsers();
    loadStats();
    setEditingUser(null);
    setShowAddModal(false);
  }

  if (loading) {
    return (
      <Card className="bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 animate-pulse">
        <CardHeader>
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <span className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                <MaterialIcon name="group" size="md" className="text-blue-600 dark:text-blue-400" />
              </span>
              {t['dashboard.widgets.userManagement.title']}
            </CardTitle>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <MaterialIcon name="person_add" size="sm" />
              {t['dashboard.widgets.userManagement.invite']}
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Role Distribution */}
          {stats && (
            <div className="grid grid-cols-3 gap-2 mb-4 pb-4 border-b border-gray-100 dark:border-gray-700">
              <div className="text-center p-2 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div className="flex items-center justify-center gap-1">
                  <MaterialIcon name="shield" size="sm" className="text-purple-500" />
                  <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {stats.roleDistribution.admin}
                  </span>
                </div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400">
                  {t['dashboard.widgets.userManagement.admins']}
                </div>
              </div>
              <div className="text-center p-2 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div className="flex items-center justify-center gap-1">
                  <MaterialIcon name="work" size="sm" className="text-blue-500" />
                  <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {stats.roleDistribution.manager}
                  </span>
                </div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400">
                  {t['dashboard.widgets.userManagement.managers']}
                </div>
              </div>
              <div className="text-center p-2 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div className="flex items-center justify-center gap-1">
                  <MaterialIcon name="construction" size="sm" className="text-amber-500" />
                  <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {stats.roleDistribution.worker}
                  </span>
                </div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400">
                  {t['dashboard.widgets.userManagement.workers']}
                </div>
              </div>
            </div>
          )}

          {/* User List (limited) */}
          {users.length === 0 ? (
            <div className="text-center py-6">
              <MaterialIcon name="group" size="xl" className="text-gray-400 dark:text-gray-500 mx-auto mb-2 opacity-50" />
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {t['dashboard.widgets.userManagement.empty']}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {users.slice(0, 5).map((user) => (
                <button
                  key={user.id}
                  onClick={() => setEditingUser(user)}
                  className="w-full flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-900 rounded-lg transition-colors rtl:text-right ltr:text-left"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-xs font-medium text-primary">
                      {user.name
                        ?.split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2) || user.email[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{user.name || user.email}</div>
                      {user.name && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">{user.email}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                      {getRoleIcon(user.role)}
                      {getRoleLabel(user.role)}
                    </span>
                    <MaterialIcon name="chevron_left" size="sm" className="text-gray-400 dark:text-gray-500" />
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* View All Link */}
          {users.length > 5 && (
            <button
              onClick={() => navigate('/organization/users')}
              className="w-full mt-4 py-2 text-sm text-primary hover:underline"
            >
              {t['dashboard.common.viewAll']} →
            </button>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <AddUserModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={handleUserUpdated}
      />

      {editingUser && (
        <EditUserRoleModal
          user={editingUser}
          open={!!editingUser}
          onClose={() => setEditingUser(null)}
          onSuccess={handleUserUpdated}
        />
      )}
    </>
  );
}
