/**
 * Responses Page (Phase 4)
 * View and manage form responses
 */

import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUser, UserButton } from '@clerk/clerk-react';
import { ResponseExportButton } from '../components/responses/ResponseExportButton';

interface Response {
  id: string;
  formId: string;
  data: Record<string, any>;
  submittedAt: Date;
  submitterIp?: string | null;
  submitterUserAgent?: string | null;
}

export function ResponsesPage() {
  const { formId } = useParams<{ formId: string }>();
  const { isSignedIn, isLoaded, user } = useUser();
  const navigate = useNavigate();
  const [responses, setResponses] = useState<Response[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      navigate('/');
    }
  }, [isLoaded, isSignedIn, navigate]);

  const loadResponses = useCallback(async (signal?: AbortSignal) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/responses?formId=${formId}`, {
        headers: {
          'Authorization': `Bearer ${user?.primaryEmailAddress?.id || ''}`,
          'X-User-Id': user?.id || '',
        },
        signal,
      });

      if (!response.ok) {
        throw new Error('Failed to load responses');
      }

      const data = await response.json();
      setResponses(data.responses || []);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return; // Ignore abort errors
      }
      setError(err instanceof Error ? err.message : 'Failed to load responses');
    } finally {
      setIsLoading(false);
    }
  }, [formId, user?.primaryEmailAddress?.id, user?.id]);

  useEffect(() => {
    if (!isSignedIn || !formId) {
      return;
    }

    const controller = new AbortController();
    loadResponses(controller.signal);

    return () => {
      controller.abort();
    };
  }, [isSignedIn, formId, loadResponses]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading responses...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">
            Form Responses
          </h1>
          <UserButton />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {responses.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No responses yet</p>
            <p className="text-gray-400 mt-2">
              Responses will appear here once users submit your form
            </p>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-medium text-gray-900">
                {responses.length} {responses.length === 1 ? 'response' : 'responses'}
              </h2>
              {formId && <ResponseExportButton formId={formId} />}
            </div>

            <div className="bg-white shadow-sm rounded-lg overflow-hidden">
              <div className="divide-y divide-gray-200">
                {responses.map((response) => (
                  <div key={response.id} className="p-6">
                    <div className="text-sm text-gray-500 mb-2">
                      {new Date(response.submittedAt).toLocaleString()}
                    </div>
                    <div className="space-y-2">
                      {Object.entries(response.data).map(([key, value]) => (
                        <div key={key} className="text-sm">
                          <span className="font-medium text-gray-700">{key}:</span>{' '}
                          <span className="text-gray-900">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
