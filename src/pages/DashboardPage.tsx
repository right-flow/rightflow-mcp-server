/**
 * Dashboard Page (Phase 1)
 * Displays user's forms and allows creation of new forms
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser, useAuth, UserButton } from '@clerk/clerk-react';
import { FormCard } from '../components/dashboard/FormCard';
import type { FormRecord } from '../services/forms/forms.service';
import { useMigrationOnMount } from '../utils/localStorageMigration';

export function DashboardPage() {
  const { isSignedIn, isLoaded, user } = useUser();
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [forms, setForms] = useState<FormRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      navigate('/');
    }
  }, [isLoaded, isSignedIn, navigate]);

  useEffect(() => {
    if (isSignedIn && user) {
      loadForms();
      // Run localStorage migration on first login
      useMigrationOnMount(user.id, user.primaryEmailAddress?.id);
    }
  }, [isSignedIn, user]);

  async function loadForms() {
    try {
      setIsLoading(true);
      setError(null);

      // Get Clerk session token
      const token = await getToken();

      if (!token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch('/api/forms', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load forms');
      }

      const data = await response.json();
      setForms(data.forms || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load forms');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateForm() {
    try {
      // Get Clerk session token
      const token = await getToken();

      if (!token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch('/api/forms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: 'Untitled Form',
          description: '',
          fields: [],
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create form');
      }

      const data = await response.json();
      const newForm = data.form;

      // Navigate to editor
      navigate(`/editor/${newForm.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create form');
    }
  }

  async function handleDeleteForm(formId: string) {
    if (!confirm('Are you sure you want to delete this form?')) {
      return;
    }

    try {
      // Get Clerk session token
      const token = await getToken();

      if (!token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(`/api/forms?id=${formId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete form');
      }

      // Reload forms
      await loadForms();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete form');
    }
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">RightFlow</h1>
            <p className="text-sm text-gray-600">Dashboard</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleCreateForm}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              + New Form
            </button>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading forms...</p>
          </div>
        ) : forms.length === 0 ? (
          /* Empty State */
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📝</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No forms yet</h2>
            <p className="text-gray-600 mb-8">
              Create your first form to get started
            </p>
            <button
              onClick={handleCreateForm}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium text-lg"
            >
              Create Your First Form
            </button>
          </div>
        ) : (
          /* Forms Grid */
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                My Forms ({forms.length})
              </h2>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {forms.map((form) => (
                <FormCard
                  key={form.id}
                  form={form}
                  onDelete={() => handleDeleteForm(form.id)}
                  onEdit={() => navigate(`/editor/${form.id}`)}
                  onViewResponses={() => navigate(`/responses/${form.id}`)}
                />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
