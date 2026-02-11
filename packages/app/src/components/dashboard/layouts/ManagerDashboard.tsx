// Manager Dashboard
// Created: 2026-02-07
// Updated: 2026-02-08 - Clean design matching Dashboard1.html
// Purpose: Dashboard view for manager users with team oversight

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MaterialIcon } from '@/components/ui/MaterialIcon';
import { DashboardLayout } from './DashboardLayout';
import { TeamPerformanceWidget } from '../widgets/manager/TeamPerformanceWidget';
import { PendingApprovalsWidget } from '../widgets/manager/PendingApprovalsWidget';
import { RecentSubmissionsWidget } from '../widgets/shared/RecentSubmissionsWidget';
import { FormCard } from '../FormCard';
import { useTranslation } from '../../../i18n';
import type { FormRecord } from '../../../services/forms/forms.service';

export function ManagerDashboard() {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const t = useTranslation();

  const [forms, setForms] = useState<FormRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadForms();
  }, []);

  async function loadForms() {
    try {
      setIsLoading(true);
      setError(null);
      const token = await getToken();
      if (!token) throw new Error('No authentication token available');

      const response = await fetch('/api/v1/forms', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 404) {
        setForms([]);
        return;
      }

      if (!response.ok) throw new Error(t['dashboard.errors.failedToLoadForms']);
      const data = await response.json();
      setForms(data.forms || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : t['dashboard.errors.failedToLoadForms']);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateForm() {
    try {
      const token = await getToken();
      if (!token) throw new Error('No authentication token available');

      const response = await fetch('/api/v1/forms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: t.untitledForm,
          description: '',
          fields: [{ id: 'field_1', type: 'text', label: t.textField, required: false }],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.error?.message || t['dashboard.errors.failedToCreateForm']);
      }

      const data = await response.json();
      navigate(`/editor/${data.form.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t['dashboard.errors.failedToCreateForm']);
    }
  }


  return (
    <DashboardLayout showSearch={false}>
      {/* Manager Widgets Row - 2 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <TeamPerformanceWidget />
        <PendingApprovalsWidget />
      </div>

      {/* Recent Submissions */}
      <div className="mb-8">
        <RecentSubmissionsWidget limit={5} />
      </div>

      {/* Error State */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-lg mb-8 flex items-center gap-3 text-sm font-medium"
          >
            <MaterialIcon name="error" size="sm" />
            {error}
            <button
              onClick={() => setError(null)}
              className="ms-auto opacity-60 hover:opacity-100"
            >
              <MaterialIcon name="close" size="sm" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Forms Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t.myForms}</h2>
          <button onClick={handleCreateForm} className="btn-primary">
            <MaterialIcon name="add" size="sm" />
            {t.createNewForm}
          </button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-48 rounded-xl animate-pulse bg-gray-200 dark:bg-gray-800"
              />
            ))}
          </div>
        ) : forms.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-12 text-center">
            <MaterialIcon name="description" size="xl" className="text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {t.noFormsYetDescription}
            </p>
            <button onClick={handleCreateForm} className="btn-primary">
              {t.createFirstForm}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {forms.slice(0, 8).map((form) => (
              <FormCard
                key={form.id}
                form={form}
                onDelete={loadForms}
                onEdit={() => navigate(`/editor/${form.id}`)}
                onViewResponses={() => navigate(`/responses/${form.id}`)}
                onSendWhatsApp={() => { }}
              />
            ))}
          </div>
        )}

        {forms.length > 8 && (
          <div className="mt-4 text-center">
            <button
              onClick={() => navigate('/responses')}
              className="text-primary hover:underline text-sm"
            >
              {t.viewAllFormsCount.replace('{count}', forms.length.toString())} →
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
