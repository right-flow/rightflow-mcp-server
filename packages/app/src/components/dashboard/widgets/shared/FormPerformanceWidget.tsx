// Form Performance Widget
// Created: 2026-02-08
// Updated: 2026-02-11 - Added i18n for demo data, loading state, RTL fix
// Updated: 2026-02-11 - Fixed infinite loop, added 10-min refresh interval
// Updated: 2026-02-12 - Added retry logic via useApiWithRetry hook
// Purpose: Display form completion rates with progress bars (from Dashboard1.html)

import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { useTranslation } from '../../../../i18n';
import { useApiWithRetry } from '../../../../hooks/useApiWithRetry';

// Refresh interval: 10 minutes
const REFRESH_INTERVAL_MS = 10 * 60 * 1000;

interface FormPerformance {
  id: string;
  name: string;
  completionRate: number;
}

interface FormPerformanceWidgetProps {
  className?: string;
}

export function FormPerformanceWidget({ className }: FormPerformanceWidgetProps) {
  const t = useTranslation();
  const { fetchWithRetry, abortAll } = useApiWithRetry({ maxRetries: 3 });
  const [forms, setForms] = useState<FormPerformance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [, setError] = useState<string | null>(null);
  const isMounted = useRef(true);
  const hasLoadedRef = useRef(false);

  // Store refs to avoid effect re-runs
  const fetchWithRetryRef = useRef(fetchWithRetry);
  const abortAllRef = useRef(abortAll);
  fetchWithRetryRef.current = fetchWithRetry;
  abortAllRef.current = abortAll;

  // Get default demo forms
  const getDefaultForms = (): FormPerformance[] => [
    { id: '1', name: t['dashboard.demo.forms.serviceJoin'], completionRate: 92 },
    { id: '2', name: t['dashboard.demo.forms.techSupport'], completionRate: 75 },
    { id: '3', name: t['dashboard.demo.forms.satisfaction'], completionRate: 48 },
    { id: '4', name: t['dashboard.demo.forms.jobApplication'], completionRate: 85 },
  ];

  // Initial load and refresh interval - runs ONCE on mount
  useEffect(() => {
    isMounted.current = true;

    const loadData = async (showLoading = true) => {
      if (showLoading) setIsLoading(true);
      setError(null);

      try {
        const data = await fetchWithRetryRef.current<FormPerformance[]>('/api/v1/analytics/form-performance');

        if (!isMounted.current) return;

        if (data && data.length > 0) {
          setForms(data);
        } else {
          setForms(getDefaultForms());
        }
      } catch (err) {
        // Don't log AbortError - it's expected on unmount
        if (err instanceof DOMException && err.name === 'AbortError') return;
        console.error('Failed to load form performance:', err);
        if (isMounted.current) {
          setError('Failed to load');
          setForms(getDefaultForms());
        }
      } finally {
        if (isMounted.current) setIsLoading(false);
      }
    };

    // Only load once
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      loadData();
    }

    // Set up refresh interval (10 minutes)
    const intervalId = setInterval(() => {
      loadData(false);
    }, REFRESH_INTERVAL_MS);

    return () => {
      isMounted.current = false;
      clearInterval(intervalId);
      abortAllRef.current();
    };
  }, []); // Empty dependency array - runs once on mount

  return (
    <Card className={`bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 ${className || ''}`}>
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-bold text-gray-900 dark:text-gray-100">
          {t['dashboard.formPerformance.title']}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="flex justify-between mb-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-8" />
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-5">
            {forms.map((form) => (
              <div key={form.id}>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {form.name}
                  </span>
                  <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                    {form.completionRate}%
                  </span>
                </div>
                {/* dir="ltr" ensures progress bar fills left-to-right regardless of page direction */}
                <div dir="ltr" className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, form.completionRate))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
