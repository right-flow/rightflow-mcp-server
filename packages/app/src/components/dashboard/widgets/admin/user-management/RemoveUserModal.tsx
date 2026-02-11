// Remove User Modal
// Created: 2026-02-07
// Purpose: Confirmation modal for removing a user from the organization

import { useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { MaterialIcon } from '@/components/ui/MaterialIcon';
import { useTranslation } from '../../../../../i18n';
import type { UserProfile } from '../../../../../api/types/role';

interface RemoveUserModalProps {
  user: UserProfile;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function RemoveUserModal({ user, open, onClose, onSuccess }: RemoveUserModalProps) {
  const { getToken } = useAuth();
  const t = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRemove() {
    setError(null);

    try {
      setLoading(true);
      const token = await getToken();
      if (!token) throw new Error('No authentication token');

      const response = await fetch(`/api/v1/users/${user.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error?.message || t['dashboard.widgets.userManagement.removeUser.error']);
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : t['dashboard.widgets.userManagement.removeUser.error']);
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    if (!loading) {
      setError(null);
      onClose();
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-background rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2 text-destructive">
            <MaterialIcon name="warning" size="md" />
            {t['dashboard.widgets.userManagement.removeUser.title']}
          </h2>
          <button
            onClick={handleClose}
            disabled={loading}
            className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <MaterialIcon name="close" size="md" />
          </button>
        </div>

        {/* Content */}
        <div className="mb-6">
          <p className="text-sm text-muted-foreground mb-4">
            {t['dashboard.widgets.userManagement.removeUser.confirm']}
          </p>

          {/* User Info */}
          <div className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
            <div className="w-10 h-10 bg-destructive/10 rounded-full flex items-center justify-center text-sm font-bold text-destructive">
              {user.name
                ?.split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2) || user.email[0].toUpperCase()}
            </div>
            <div>
              <div className="font-medium">{user.name || t['dashboard.widgets.userManagement.noName']}</div>
              <div className="text-xs text-muted-foreground">{user.email}</div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground mt-4">
            {t['dashboard.widgets.userManagement.removeUser.description']}
          </p>
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
            onClick={handleClose}
            disabled={loading}
            className="flex-1 py-2 border border-border rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors disabled:opacity-50"
          >
            {t.cancel}
          </button>
          <button
            type="button"
            onClick={handleRemove}
            disabled={loading}
            className="flex-1 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <MaterialIcon name="progress_activity" size="sm" className="animate-spin" />
                {t['dashboard.widgets.userManagement.removeUser.removing']}
              </>
            ) : (
              t['dashboard.widgets.userManagement.removeUser.title']
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
