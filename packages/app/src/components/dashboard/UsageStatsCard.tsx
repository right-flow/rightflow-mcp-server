/**
 * UsageStatsCard Component
 * Displays usage statistics with progress bars
 */

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useQuery } from '@tanstack/react-query';
import { UserTier } from '@/services/access-control/AccessControl';

interface UsageStatsCardProps {
  userId: string;
  tier: UserTier;
}

interface UsageStats {
  formsCount: number;
  submissionsCount: number;
}

export function UsageStatsCard({ userId, tier }: UsageStatsCardProps) {
  const { data: stats } = useQuery<UsageStats>({
    queryKey: ['usage-stats', userId],
    queryFn: async () => {
      const res = await fetch('/api/billing/current');
      if (!res.ok) {
        throw new Error('Failed to fetch usage stats');
      }
      return res.json();
    },
  });

  // Define limits based on tier
  const limits: Record<UserTier, { forms: number; submissions: number }> = {
    [UserTier.GUEST]: { forms: 1, submissions: 5 },
    [UserTier.FREE]: { forms: 10, submissions: 100 },
    [UserTier.PRO]: { forms: Infinity, submissions: Infinity },
    [UserTier.ENTERPRISE]: { forms: Infinity, submissions: Infinity },
  };

  const currentLimits = limits[tier] || limits[UserTier.FREE];

  // Calculate progress percentages
  const formsPercent =
    currentLimits.forms === Infinity
      ? 0
      : ((stats?.formsCount || 0) / currentLimits.forms) * 100;

  const submissionsPercent =
    currentLimits.submissions === Infinity
      ? 0
      : ((stats?.submissionsCount || 0) / currentLimits.submissions) * 100;

  // Format limits for display
  const formatLimit = (limit: number) =>
    limit === Infinity ? '∞' : limit.toString();

  return (
    <Card>
      <CardHeader>
        <CardTitle>שימוש חודשי</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>טפסים</span>
            <span>
              {stats?.formsCount || 0} / {formatLimit(currentLimits.forms)}
            </span>
          </div>
          <Progress value={formsPercent} />
        </div>

        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>הגשות</span>
            <span>
              {stats?.submissionsCount || 0} /{' '}
              {formatLimit(currentLimits.submissions)}
            </span>
          </div>
          <Progress value={submissionsPercent} />
        </div>
      </CardContent>
    </Card>
  );
}
