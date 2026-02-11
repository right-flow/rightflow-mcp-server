// Billing Overview Widget
// Created: 2026-02-07
// Purpose: Display subscription status and usage for admins

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MaterialIcon } from '@/components/ui/MaterialIcon';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { Progress } from '../../../ui/progress';
import { useBilling } from '../../../../contexts/BillingContext';

interface QuotaData {
  submissions: { used: number; limit: number; percentUsed: number };
  forms: { current: number; limit: number };
}

export function BillingOverviewWidget() {
  const navigate = useNavigate();
  const { subscription, loading, error } = useBilling();
  const [quotaData, setQuotaData] = useState<QuotaData | null>(null);

  // Calculate days until renewal
  const getDaysUntilRenewal = () => {
    if (!subscription?.currentPeriodEnd) return null;
    const endDate = new Date(subscription.currentPeriodEnd);
    const today = new Date();
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  // Get status color based on usage
  const getStatusColor = (percentUsed: number) => {
    if (percentUsed >= 90) return 'text-red-500';
    if (percentUsed >= 70) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getProgressColor = (percentUsed: number) => {
    if (percentUsed >= 90) return 'bg-red-500';
    if (percentUsed >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  // Mock quota data (will be replaced with API call)
  useEffect(() => {
    // TODO: Replace with actual API call to /api/v1/billing/usage/{orgId}
    setQuotaData({
      submissions: { used: 412, limit: 500, percentUsed: 82 },
      forms: { current: 32, limit: 50 },
    });
  }, []);

  if (loading) {
    return (
      <Card className="animate-pulse bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700">
        <CardHeader>
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-red-600">
            <MaterialIcon name="warning" size="md" />
            <span>שגיאה בטעינת נתוני חיוב</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const daysUntilRenewal = getDaysUntilRenewal();
  const submissionPercent = quotaData?.submissions.percentUsed || 0;
  const formsPercent = quotaData ? (quotaData.forms.current / quotaData.forms.limit) * 100 : 0;

  return (
    <Card className="bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <span className="p-2 bg-orange-50 dark:bg-orange-900/30 rounded-lg">
            <MaterialIcon name="credit_card" size="md" className="text-orange-600 dark:text-orange-400" />
          </span>
          סטטוס חיוב
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Plan Info */}
        <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">תוכנית:</span>
            <span className="font-semibold mr-2">{subscription?.plan?.displayName || 'Expanded'}</span>
          </div>
          <div className="text-left">
            <span className="font-bold text-lg">₪{subscription?.plan?.priceMonthly ? Math.round(subscription.plan.priceMonthly / 100) : 400}</span>
            <span className="text-sm text-gray-500 dark:text-gray-400">/חודש</span>
          </div>
        </div>

        {/* Submissions Usage */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-500 dark:text-gray-400">הגשות</span>
            <span className={getStatusColor(submissionPercent)}>
              {quotaData?.submissions.used}/{quotaData?.submissions.limit} ({submissionPercent}%)
            </span>
          </div>
          <Progress value={submissionPercent} className={getProgressColor(submissionPercent)} />
        </div>

        {/* Forms Usage */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-500 dark:text-gray-400">טפסים</span>
            <span className={getStatusColor(formsPercent)}>
              {quotaData?.forms.current}/{quotaData?.forms.limit} ({Math.round(formsPercent)}%)
            </span>
          </div>
          <Progress value={formsPercent} className={getProgressColor(formsPercent)} />
        </div>

        {/* Warnings */}
        {submissionPercent >= 80 && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400 text-sm">
              <MaterialIcon name="warning" size="sm" />
              <span>
                נותרו {quotaData!.submissions.limit - quotaData!.submissions.used} הגשות
                {daysUntilRenewal && ` | חידוש בעוד ${daysUntilRenewal} ימים`}
              </span>
            </div>
          </div>
        )}

        {/* Upgrade Button */}
        <button
          onClick={() => navigate('/billing/subscription')}
          className="w-full btn-primary flex items-center justify-center gap-2"
        >
          <MaterialIcon name="trending_up" size="sm" />
          {submissionPercent >= 80 ? 'שדרג תוכנית' : 'נהל מנוי'}
        </button>
      </CardContent>
    </Card>
  );
}
