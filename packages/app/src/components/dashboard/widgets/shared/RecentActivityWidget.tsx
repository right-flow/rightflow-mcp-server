// Recent Activity Widget
// Created: 2026-02-08
// Updated: 2026-02-11 - Added i18n for demo data, loading state
// Updated: 2026-02-11 - Fixed i18n: API now returns raw data, frontend handles formatting
// Purpose: Display recent activity feed (from Dashboard1.html)

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { MaterialIcon } from '@/components/ui/MaterialIcon';
import { useTranslation } from '../../../../i18n';

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
  const { getToken } = useAuth();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Format time ago using i18n translations
  const formatTimeAgo = useCallback(
    (createdAt: string): string => {
      const now = new Date();
      const created = new Date(createdAt);
      const diffMs = now.getTime() - created.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) {
        return t['dashboard.time.now'];
      } else if (diffMins < 60) {
        return t['dashboard.time.ago']
          .replace('{time}', `${diffMins} ${t['dashboard.time.mins']}`);
      } else if (diffHours < 24) {
        return t['dashboard.time.ago']
          .replace('{time}', `${diffHours} ${t['dashboard.time.hours']}`);
      } else {
        return t['dashboard.time.ago']
          .replace('{time}', `${diffDays} ${t['dashboard.time.days']}`);
      }
    },
    [t],
  );

  // Transform raw API data to display format using i18n
  const transformApiData = useCallback(
    (item: ApiActivityItem): ActivityItem => {
      let icon: string;
      let iconColor: 'orange' | 'blue' | 'green' | 'purple';
      let titleKey: keyof typeof t;

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
        case 'draft':
        default:
          icon = 'edit';
          iconColor = 'blue';
          titleKey = 'dashboard.activity.draft';
          break;
      }

      const title = (t[titleKey] as string).replace('{formName}', item.formName);
      const userName = item.userName || t['dashboard.activity.anonymousUser'];
      const timeAgo = formatTimeAgo(item.createdAt);
      const created = new Date(item.createdAt);
      const time = created.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
      });

      return {
        id: item.id,
        icon,
        iconColor,
        title,
        subtitle: `${userName} - ${timeAgo}`,
        time,
      };
    },
    [t, formatTimeAgo],
  );

  // Default demo data using i18n
  const defaultActivities: ActivityItem[] = useMemo(
    () => [
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
    ],
    [t],
  );

  useEffect(() => {
    async function loadRecentActivity() {
      setIsLoading(true);
      try {
        const token = await getToken();
        if (!token) {
          setActivities(defaultActivities);
          return;
        }

        const response = await fetch('/api/v1/activity/recent', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data: ApiActivityItem[] = await response.json();
          if (data && data.length > 0) {
            // Transform raw API data using i18n
            const formattedActivities = data.map(transformApiData);
            setActivities(formattedActivities);
          } else {
            setActivities(defaultActivities);
          }
        } else {
          setActivities(defaultActivities);
        }
      } catch (err) {
        console.error('Failed to load recent activity:', err);
        setActivities(defaultActivities);
      } finally {
        setIsLoading(false);
      }
    }
    loadRecentActivity();
  }, [getToken, defaultActivities, transformApiData]);

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
