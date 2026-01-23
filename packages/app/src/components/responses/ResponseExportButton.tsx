/**
 * ResponseExportButton Component (Phase 4)
 * Button for exporting form responses as CSV or JSON
 */

import { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/clerk-react';

interface ResponseExportButtonProps {
  formId: string;
}

export function ResponseExportButton({ formId }: ResponseExportButtonProps) {
  const { user } = useUser();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  async function handleExport(format: 'csv' | 'json') {
    try {
      setIsLoading(true);
      setError(null);
      setIsOpen(false);

      // Create abort controller for fetch
      abortControllerRef.current = new AbortController();

      const response = await fetch(
        `/api/responses?formId=${formId}&export=${format}`,
        {
          headers: {
            'Authorization': `Bearer ${user?.primaryEmailAddress?.id || ''}`,
            'X-User-Id': user?.id || '',
          },
          signal: abortControllerRef.current.signal,
        },
      );

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const data = await response.text();
      const blob = new Blob([data], {
        type: format === 'csv' ? 'text/csv;charset=utf-8' : 'application/json',
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `responses-${Date.now()}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      // Handle abort errors silently (component unmounted)
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      setError(err instanceof Error ? err.message : 'Export failed');
      setIsOpen(false); // Close dropdown when error occurs
    } finally {
      setIsLoading(false);
    }
  }

  // Cleanup: abort fetch on component unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  return (
    <div className="relative">
      <button
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
      >
        {isLoading ? 'Exporting...' : 'Export'}
      </button>

      {isOpen && !isLoading && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10">
          <div className="py-1">
            <button
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              onClick={() => handleExport('csv')}
            >
              Export as CSV
            </button>
            <button
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              onClick={() => handleExport('json')}
            >
              Export as JSON
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute right-0 mt-2 w-48 bg-red-50 text-red-600 p-2 rounded text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
