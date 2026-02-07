// User Management Widget
// Created: 2026-02-07
// Purpose: Compact user list widget for Admin Dashboard

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { Users, UserPlus, ChevronLeft, Shield, Briefcase, HardHat } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../ui/card';
import { AddUserModal } from './AddUserModal';
import { EditUserRoleModal } from './EditUserRoleModal';
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
        return <Shield className="w-4 h-4 text-purple-500" />;
      case 'manager':
        return <Briefcase className="w-4 h-4 text-blue-500" />;
      case 'worker':
        return <HardHat className="w-4 h-4 text-amber-500" />;
    }
  }

  function getRoleLabel(role: UserRole) {
    switch (role) {
      case 'admin':
        return 'מנהל';
      case 'manager':
        return 'מנהל צוות';
      case 'worker':
        return 'עובד';
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
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 bg-zinc-200 dark:bg-zinc-700 rounded w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="h-16 bg-zinc-200 dark:bg-zinc-700 rounded" />
              <div className="h-16 bg-zinc-200 dark:bg-zinc-700 rounded" />
              <div className="h-16 bg-zinc-200 dark:bg-zinc-700 rounded" />
            </div>
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-zinc-200 dark:bg-zinc-700 rounded" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="w-5 h-5 text-primary" />
              ניהול משתמשים
            </CardTitle>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <UserPlus className="w-4 h-4" />
              הזמן
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Role Distribution */}
          {stats && (
            <div className="grid grid-cols-3 gap-2 mb-4 pb-4 border-b border-border">
              <div className="text-center p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <div className="flex items-center justify-center gap-1">
                  <Shield className="w-4 h-4 text-purple-500" />
                  <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
                    {stats.roleDistribution.admin}
                  </span>
                </div>
                <div className="text-[10px] text-muted-foreground">מנהלים</div>
              </div>
              <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-center justify-center gap-1">
                  <Briefcase className="w-4 h-4 text-blue-500" />
                  <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {stats.roleDistribution.manager}
                  </span>
                </div>
                <div className="text-[10px] text-muted-foreground">מנהלי צוות</div>
              </div>
              <div className="text-center p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <div className="flex items-center justify-center gap-1">
                  <HardHat className="w-4 h-4 text-amber-500" />
                  <span className="text-lg font-bold text-amber-600 dark:text-amber-400">
                    {stats.roleDistribution.worker}
                  </span>
                </div>
                <div className="text-[10px] text-muted-foreground">עובדים</div>
              </div>
            </div>
          )}

          {/* User List (limited) */}
          {users.length === 0 ? (
            <div className="text-center py-6">
              <Users className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-muted-foreground text-sm">אין משתמשים</p>
            </div>
          ) : (
            <div className="space-y-2">
              {users.slice(0, 5).map((user) => (
                <button
                  key={user.id}
                  onClick={() => setEditingUser(user)}
                  className="w-full flex items-center justify-between p-2 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-lg transition-colors text-right"
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
                      <div className="text-sm font-medium">{user.name || user.email}</div>
                      {user.name && (
                        <div className="text-xs text-muted-foreground">{user.email}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      {getRoleIcon(user.role)}
                      {getRoleLabel(user.role)}
                    </span>
                    <ChevronLeft className="w-4 h-4 text-muted-foreground" />
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
              צפה בכל {users.length} המשתמשים →
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
