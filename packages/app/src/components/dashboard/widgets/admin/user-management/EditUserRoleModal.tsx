// Edit User Role Modal
// Created: 2026-02-07
// Purpose: Modal for changing a user's role

import { useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { MaterialIcon } from '@/components/ui/MaterialIcon';
import { RemoveUserModal } from './RemoveUserModal';
import { useTranslation } from '../../../../../i18n';
import type { UserProfile, UserRole } from '../../../../../api/types/role';

interface EditUserRoleModalProps {
  user: UserProfile;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditUserRoleModal({ user, open, onClose, onSuccess }: EditUserRoleModalProps) {
  const { getToken } = useAuth();
  const t = useTranslation();
  const [role, setRole] = useState<UserRole>(user.role);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRemoveModal, setShowRemoveModal] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (role === user.role) {
      onClose();
      return;
    }

    try {
      setLoading(true);
      const token = await getToken();
      if (!token) throw new Error('No authentication token');

      const response = await fetch(`/api/v1/users/${user.id}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error?.message || t['dashboard.widgets.userManagement.editRole.error']);
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : t['dashboard.widgets.userManagement.editRole.error']);
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    if (!loading) {
      setRole(user.role);
      setError(null);
      onClose();
    }
  }

  function handleRemoveSuccess() {
    setShowRemoveModal(false);
    onSuccess();
  }

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

        {/* Modal */}
        <div className="relative bg-background rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <MaterialIcon name="manage_accounts" size="md" className="text-primary" />
              {t['dashboard.widgets.userManagement.editRole.title']}
            </h2>
            <button
              onClick={handleClose}
              disabled={loading}
              className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <MaterialIcon name="close" size="md" />
            </button>
          </div>

          {/* User Info */}
          <div className="flex items-center gap-3 mb-6 p-4 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-lg font-bold text-primary">
              {user.name
                ?.split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2) || user.email[0].toUpperCase()}
            </div>
            <div>
              <div className="font-semibold">{user.name || t['dashboard.widgets.userManagement.noName']}</div>
              <div className="text-sm text-muted-foreground">{user.email}</div>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Role Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">{t['dashboard.widgets.userManagement.addUser.roleLabel']}</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setRole('admin')}
                  disabled={loading}
                  className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-colors ${role === 'admin'
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                      : 'border-border hover:border-purple-300'
                    }`}
                >
                  <MaterialIcon name="shield" size="md" className={role === 'admin' ? 'text-purple-500' : 'text-muted-foreground'} />
                  <span className={`text-xs font-medium ${role === 'admin' ? 'text-purple-600 dark:text-purple-400' : ''}`}>
                    {t['dashboard.role.admin']}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole('manager')}
                  disabled={loading}
                  className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-colors ${role === 'manager'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-border hover:border-blue-300'
                    }`}
                >
                  <MaterialIcon name="work" size="md" className={role === 'manager' ? 'text-blue-500' : 'text-muted-foreground'} />
                  <span className={`text-xs font-medium ${role === 'manager' ? 'text-blue-600 dark:text-blue-400' : ''}`}>
                    {t['dashboard.role.manager']}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole('worker')}
                  disabled={loading}
                  className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-colors ${role === 'worker'
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                      : 'border-border hover:border-amber-300'
                    }`}
                >
                  <MaterialIcon name="construction" size="md" className={role === 'worker' ? 'text-amber-500' : 'text-muted-foreground'} />
                  <span className={`text-xs font-medium ${role === 'worker' ? 'text-amber-600 dark:text-amber-400' : ''}`}>
                    {t['dashboard.role.worker']}
                  </span>
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowRemoveModal(true)}
                disabled={loading}
                className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors disabled:opacity-50"
                title={t['dashboard.widgets.userManagement.removeUser.title']}
              >
                <MaterialIcon name="delete" size="md" />
              </button>
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="flex-1 py-2 border border-border rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors disabled:opacity-50"
              >
                {t.cancel}
              </button>
              <button
                type="submit"
                disabled={loading || role === user.role}
                className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <MaterialIcon name="progress_activity" size="sm" className="animate-spin" />
                    {t['dashboard.widgets.userManagement.editRole.saving']}
                  </>
                ) : (
                  t['dashboard.widgets.userManagement.editRole.save']
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Remove User Modal */}
      <RemoveUserModal
        user={user}
        open={showRemoveModal}
        onClose={() => setShowRemoveModal(false)}
        onSuccess={handleRemoveSuccess}
      />
    </>
  );
}
