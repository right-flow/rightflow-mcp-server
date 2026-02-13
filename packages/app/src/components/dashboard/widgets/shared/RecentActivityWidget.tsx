// Recent Activity Widget
// Created: 2026-02-08
// Updated: 2026-02-11 - Added i18n for demo data, loading state
// Updated: 2026-02-11 - Fixed i18n: API now returns raw data, frontend handles formatting
// Updated: 2026-02-11 - Fixed infinite loop, added 10-min refresh interval
// Updated: 2026-02-12 - Added retry logic via useApiWithRetry hook
// Purpose: Display recent activity feed (from Dashboard1.html)

import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { MaterialIcon } from '@/components/ui/MaterialIcon';
import { useTranslation } from '../../../../i18n';
import { useApiWithRetry } from '../../../../hooks/useApiWithRetry';

// Refresh interval: 10 minutes
const REFRESH_INTERVAL_MS = 10 * 60 * 1000;

// Raw API response format
interface ApiActivityItem {
  id: string;
  type: string;
  status: string;
  formName: string;
  userName: string | null;
  createdAt: string;
}

// Formatted display format
interface ActivityItem {
  id: string;
  icon: string;
  iconColor: 'orange' | 'blue' | 'green' | 'purple';
  title: string;
  subtitle: string;
  time: string;
}

interface RecentActivityWidgetProps {
  className?: string;
}

const iconColorClasses = {
  orange: 'bg-orange-100 dark:bg-orange-900/40 text-primary',
  blue: 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400',
  green: 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400',
  purple: 'bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400',
};

export function RecentActivityWidget({ className }: RecentActivityWidgetProps) {
  const t = useTranslation();
  const { fetchWithRetry, abortAll } = useApiWithRetry({ maxRetries: 3 });
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [, setError] = useState<string | null>(null);
  const isMounted = useRef(true);
  const hasLoadedRef = useRef(false);

  // Store refs to avoid effect re-runs
  const fetchWithRetryRef = useRef(fetchWithRetry);
  const abortAllRef = useRef(abortAll);
  fetchWithRetryRef.current = fetchWithRetry;
  abortAllRef.current = abortAll;

  // Get default demo activities
  const getDefaultActivities = (): ActivityItem[] => [
    {
      id: '1',
      icon: 'description',
      iconColor: 'orange',
      title: t['dashboard.demo.activity.formCompleted'],
      subtitle: t['dashboard.demo.activity.formCompletedBy'],
      time: '12:45',
    },
    {
      id: '2',
      icon: 'share',
      iconColor: 'blue',
      title: t['dashboard.demo.activity.linkSent'],
      subtitle: t['dashboard.demo.activity.linkSentDetails'],
      time: '11:30',
    },
    {
      id: '3',
      icon: 'edit',
      iconColor: 'green',
      title: t['dashboard.demo.activity.automationUpdate'],
      subtitle: t['dashboard.demo.activity.automationDetails'],
      time: '10:15',
    },
  ];

  // Format time ago
  const formatTimeAgo = (createdAt: string): string => {
    const now = new Date();
    const created = new Date(createdAt);
    const diffMs = now.getTime() - created.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return t['dashboard.time.now'];
    if (diffMins < 60) return t['dashboard.time.ago'].replace('{time}', `${diffMins} ${t['dashboard.time.mins']}`);
    if (diffHours < 24) return t['dashboard.time.ago'].replace('{time}', `${diffHours} ${t['dashboard.time.hours']}`);
    return t['dashboard.time.ago'].replace('{time}', `${diffDays} ${t['dashboard.time.days']}`);
  };

  // Transform API data to display format
  const transformApiData = (item: ApiActivityItem): ActivityItem => {
    let icon: string;
    let iconColor: 'orange' | 'blue' | 'green' | 'purple';
    let titleKey: 'dashboard.activity.submitted' | 'dashboard.activity.approved' | 'dashboard.activity.rejected' | 'dashboard.activity.draft';

    switch (item.status) {
      case 'submitted':
        icon = 'description';
        iconColor = 'orange';
        titleKey = 'dashboard.activity.submitted';
        break;
      case 'approved':
        icon = 'check_circle';
        iconColor = 'green';
        titleKey = 'dashboard.activity.approved';
        break;
      case 'rejected':
        icon = 'cancel';
        iconColor = 'purple';
        titleKey = 'dashboard.activity.rejected';
        break;
      default:
        icon = 'edit';
        iconColor = 'blue';
        titleKey = 'dashboard.activity.draft';
    }

    const created = new Date(item.createdAt);
    return {
      id: item.id,
      icon,
      iconColor,
      title: t[titleKey].replace('{formName}', item.formName),
      subtitle: `${item.userName || t['dashboard.activity.anonymousUser']} - ${formatTimeAgo(item.createdAt)}`,
      time: created.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
    };
  };

  // Initial load and refresh interval - runs ONCE on mount
  useEffect(() => {
    isMounted.current = true;

    const loadData = async (showLoading = true) => {
      if (showLoading) setIsLoading(true);
      setError(null);

      try {
        const data = await fetchWithRetryRef.current<ApiActivityItem[]>('/api/v1/activity/recent');

        if (!isMounted.current) return;

        if (data && data.length > 0) {
          setActivities(data.map(transformApiData));
        } else {
          setActivities(getDefaultActivities());
        }
      } catch (err) {
        // Don't log AbortError - it's expected on unmount
        if (err instanceof DOMException && err.name === 'AbortError') return;
        console.error('Failed to load recent activity:', err);
        if (isMounted.current) {
          setError('Failed to load');
          setActivities(getDefaultActivities());
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
          {t['dashboard.recentActivity.title']}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 animate-pulse">
                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${iconColorClasses[activity.iconColor]}`}>
                  <MaterialIcon name={activity.icon} size="md" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
                    {activity.title}
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {activity.subtitle}
                  </p>
                </div>
                <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                  {activity.time}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
