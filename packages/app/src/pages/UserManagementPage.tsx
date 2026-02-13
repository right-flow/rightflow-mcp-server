// User Management Page
// Created: 2026-02-07
// Purpose: Full page for managing organization users

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import {
  Users,
  UserPlus,
  Search,
  Shield,
  Briefcase,
  HardHat,
  ChevronRight,
  MoreVertical,
  Pencil,
  Trash2,
  ArrowRight,
} from 'lucide-react';
import { AddUserModal } from '../components/dashboard/widgets/admin/user-management/AddUserModal';
import { EditUserRoleModal } from '../components/dashboard/widgets/admin/user-management/EditUserRoleModal';
import { RemoveUserModal } from '../components/dashboard/widgets/admin/user-management/RemoveUserModal';
import { useNamespaceTranslation, languageConfig } from '../i18n';
import type { UserProfile, UserRole } from '../api/types/role';

interface UserStats {
  totalUsers: number;
  roleDistribution: {
    admin: number;
    manager: number;
    worker: number;
  };
}

export function UserManagementPage() {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const { t, language } = useNamespaceTranslation('dashboard');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [removingUser, setRemovingUser] = useState<UserProfile | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

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

  function handleUserUpdated() {
    loadUsers();
    loadStats();
    setEditingUser(null);
    setRemovingUser(null);
    setShowAddModal(false);
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
        return t.role.admin;
      case 'manager':
        return t.role.manager;
      case 'worker':
        return t.role.worker;
    }
  }

  function getRoleBadgeClass(role: UserRole) {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case 'manager':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'worker':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    }
  }

  function formatDate(dateString: string) {
    const locale = languageConfig[language]?.locale || 'he-IL';
    return new Date(dateString).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  // Filter users
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <div className="bg-background border-b border-border sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <button onClick={() => navigate('/dashboard')} className="hover:text-primary">
              {t.userManagementPage.dashboard}
            </button>
            <ChevronRight className="w-4 h-4" />
            <span>{t.userManagementPage.title}</span>
          </div>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="w-6 h-6 text-primary" />
              {t.userManagementPage.title}
            </h1>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-primary flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              {t.userManagementPage.inviteUser}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-background p-4 rounded-xl border border-border">
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <div className="text-sm text-muted-foreground">{t.userManagementPage.totalUsers}</div>
            </div>
            <div className="bg-background p-4 rounded-xl border border-border">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-500" />
                <span className="text-2xl font-bold">{stats.roleDistribution.admin}</span>
              </div>
              <div className="text-sm text-muted-foreground">{t.widgets.userManagement.admins}</div>
            </div>
            <div className="bg-background p-4 rounded-xl border border-border">
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-blue-500" />
                <span className="text-2xl font-bold">{stats.roleDistribution.manager}</span>
              </div>
              <div className="text-sm text-muted-foreground">{t.widgets.userManagement.managers}</div>
            </div>
            <div className="bg-background p-4 rounded-xl border border-border">
              <div className="flex items-center gap-2">
                <HardHat className="w-5 h-5 text-amber-500" />
                <span className="text-2xl font-bold">{stats.roleDistribution.worker}</span>
              </div>
              <div className="text-sm text-muted-foreground">{t.widgets.userManagement.workers}</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.userManagementPage.searchPlaceholder}
              className="w-full pr-10 pl-4 py-2 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setRoleFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                roleFilter === 'all'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background border border-border hover:bg-zinc-50 dark:hover:bg-zinc-900'
              }`}
            >
              {t.userManagementPage.all}
            </button>
            <button
              onClick={() => setRoleFilter('admin')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                roleFilter === 'admin'
                  ? 'bg-purple-500 text-white'
                  : 'bg-background border border-border hover:bg-zinc-50 dark:hover:bg-zinc-900'
              }`}
            >
              {t.widgets.userManagement.admins}
            </button>
            <button
              onClick={() => setRoleFilter('manager')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                roleFilter === 'manager'
                  ? 'bg-blue-500 text-white'
                  : 'bg-background border border-border hover:bg-zinc-50 dark:hover:bg-zinc-900'
              }`}
            >
              {t.widgets.userManagement.managers}
            </button>
            <button
              onClick={() => setRoleFilter('worker')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                roleFilter === 'worker'
                  ? 'bg-amber-500 text-white'
                  : 'bg-background border border-border hover:bg-zinc-50 dark:hover:bg-zinc-900'
              }`}
            >
              {t.widgets.userManagement.workers}
            </button>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-background rounded-xl border border-border overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
              <p className="text-muted-foreground">{t.userManagementPage.loadingUsers}</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">
                {searchQuery || roleFilter !== 'all'
                  ? t.userManagementPage.noUsersFound
                  : t.userManagementPage.noUsersInOrg}
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-zinc-50 dark:bg-zinc-900 border-b border-border">
                <tr>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">
                    {t.userManagementPage.user}
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">
                    {t.userManagementPage.roleColumn}
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground hidden md:table-cell">
                    {t.userManagementPage.joinedDate}
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground w-12">
                    {t.userManagementPage.actions}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-sm font-bold text-primary">
                          {user.name
                            ?.split(' ')
                            .map((n) => n[0])
                            .join('')
                            .slice(0, 2) || user.email[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium">{user.name || t.widgets.userManagement.noName}</div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeClass(user.role)}`}
                      >
                        {getRoleIcon(user.role)}
                        {getRoleLabel(user.role)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-muted-foreground hidden md:table-cell">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="relative">
                        <button
                          onClick={() => setActiveMenu(activeMenu === user.id ? null : user.id)}
                          className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {activeMenu === user.id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setActiveMenu(null)}
                            />
                            <div className="absolute left-0 mt-1 w-36 bg-background border border-border rounded-lg shadow-lg z-20">
                              <button
                                onClick={() => {
                                  setEditingUser(user);
                                  setActiveMenu(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900 text-right"
                              >
                                <Pencil className="w-4 h-4" />
                                {t.userManagementPage.editRole}
                              </button>
                              <button
                                onClick={() => {
                                  setRemovingUser(user);
                                  setActiveMenu(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900 text-right text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                                {t.userManagementPage.removeUser}
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Back button */}
        <div className="mt-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
            {t.userManagementPage.backToDashboard}
          </button>
        </div>
      </div>

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

      {removingUser && (
        <RemoveUserModal
          user={removingUser}
          open={!!removingUser}
          onClose={() => setRemovingUser(null)}
          onSuccess={handleUserUpdated}
        />
      )}
    </div>
  );
}
