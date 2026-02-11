// Add User Modal
// Created: 2026-02-07
// Purpose: Modal for inviting new users to the organization

import { useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { MaterialIcon } from '@/components/ui/MaterialIcon';
import { useTranslation } from '../../../../../i18n';
import type { UserRole } from '../../../../../api/types/role';

interface AddUserModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddUserModal({ open, onClose, onSuccess }: AddUserModalProps) {
  const { getToken } = useAuth();
  const t = useTranslation();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('worker');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!email.trim()) {
      setError(t['dashboard.widgets.userManagement.addUser.emailRequired']);
      return;
    }

    try {
      setLoading(true);
      const token = await getToken();
      if (!token) throw new Error('No authentication token');

      const response = await fetch('/api/v1/users/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email: email.trim(), role }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error?.message || t['dashboard.widgets.userManagement.addUser.error']);
      }

      setSuccess(true);
      setEmail('');
      setRole('worker');

      // Close after short delay to show success
      setTimeout(() => {
        onSuccess();
        onClose();
        setSuccess(false);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : t['dashboard.widgets.userManagement.addUser.error']);
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    if (!loading) {
      setEmail('');
      setRole('worker');
      setError(null);
      setSuccess(false);
      onClose();
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-background rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <MaterialIcon name="person_add" size="md" className="text-primary" />
            {t['dashboard.widgets.userManagement.addUser.title']}
          </h2>
          <button
            onClick={handleClose}
            disabled={loading}
            className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <MaterialIcon name="close" size="md" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Email Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">{t['dashboard.widgets.userManagement.addUser.emailLabel']}</label>
            <div className="relative">
              <MaterialIcon name="mail" size="sm" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                disabled={loading}
                className="w-full pr-10 pl-4 py-2 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-primary disabled:opacity-50"
                dir="ltr"
              />
            </div>
          </div>

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

          {/* Success Message */}
          {success && (
            <div className="mb-4 p-3 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg text-sm">
              {t['dashboard.widgets.userManagement.addUser.success']}
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
              type="submit"
              disabled={loading || !email.trim()}
              className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <MaterialIcon name="progress_activity" size="sm" className="animate-spin" />
                  {t['dashboard.widgets.userManagement.addUser.sending']}
                </>
              ) : (
                <>
                  <MaterialIcon name="person_add" size="sm" />
                  {t['dashboard.widgets.userManagement.addUser.send']}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
