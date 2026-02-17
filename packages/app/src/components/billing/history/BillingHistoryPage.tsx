/**
 * Billing History Page Component
 *
 * Container page for billing history and payment methods.
 * Integrates with BillingContext to fetch payment records from Grow API.
 *
 * @see ADR-009: Grow Payment API Integration
 */

import React, { useState, useEffect, useCallback } from 'react';
import { PaymentHistoryTable } from './PaymentHistoryTable';
import { useBilling } from '../../../contexts/BillingContext';
import { useTranslation, useDirection } from '../../../i18n';
import { Receipt, AlertCircle, RefreshCw, CreditCard } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface BillingHistoryPageProps {
  className?: string;
}

const PAGE_SIZE = 10;

/**
 * Billing history page component
 * Orchestrates payment history display with Grow API integration
 */
export const BillingHistoryPage: React.FC<BillingHistoryPageProps> = ({
  className = '',
}) => {
  const t = useTranslation();
  const direction = useDirection();

  const {
    paymentHistory,
    paymentHistoryLoading,
    getPaymentHistory,
    error,
    clearError,
    subscription,
  } = useBilling();

  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Load initial payment history
  useEffect(() => {
    loadPaymentHistory();
  }, [loadPaymentHistory]);

  // Load payment history
  const loadPaymentHistory = useCallback(async () => {
    try {
      await getPaymentHistory(1, PAGE_SIZE);
      setCurrentPage(1);
      setHasMore(true); // Will be updated based on actual response
    } catch (err) {
      // Error handled by context
    }
  }, [getPaymentHistory]);

  // Load more payments
  const handleLoadMore = useCallback(async () => {
    try {
      const nextPage = currentPage + 1;
      await getPaymentHistory(nextPage, PAGE_SIZE);
      setCurrentPage(nextPage);
      // If fewer items returned than page size, no more pages
      if (paymentHistory.length < currentPage * PAGE_SIZE) {
        setHasMore(false);
      }
    } catch (err) {
      // Error handled by context
    }
  }, [currentPage, getPaymentHistory, paymentHistory.length]);

  return (
    <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 ${className}`} dir={direction}>
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Receipt className="h-8 w-8" />
          {t['billing.history.title'] || 'היסטוריית חיוב'}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {t['billing.history.description'] || 'צפה בהיסטוריית התשלומים והחשבוניות שלך'}
        </p>
      </div>

      {/* Error state */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t['billing.history.error'] || 'שגיאה בטעינת היסטוריה'}</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                clearError();
                loadPaymentHistory();
              }}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              {t['billing.history.tryAgain'] || 'נסה שוב'}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Current subscription info */}
      {subscription && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CreditCard className="h-5 w-5" />
              {t['billing.history.currentSubscription'] || 'מנוי נוכחי'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t['billing.history.plan'] || 'תוכנית'}
                </p>
                <p className="font-medium">{subscription.planName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {t['billing.history.status'] || 'סטטוס'}
                </p>
                <p className="font-medium capitalize">{subscription.status}</p>
              </div>
              {subscription.currentPeriodEnd && (
                <div>
                  <p className="text-sm text-muted-foreground">
                    {t['billing.history.renewalDate'] || 'תאריך חידוש'}
                  </p>
                  <p className="font-medium">
                    {new Date(subscription.currentPeriodEnd).toLocaleDateString(
                      direction === 'rtl' ? 'he-IL' : 'en-US'
                    )}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment history table */}
      <PaymentHistoryTable
        payments={paymentHistory}
        loading={paymentHistoryLoading}
        onLoadMore={handleLoadMore}
        hasMore={hasMore && paymentHistory.length >= currentPage * PAGE_SIZE}
      />

      {/* Note about Grow payment */}
      <p className="mt-4 text-sm text-muted-foreground text-center">
        {t['billing.history.growNote'] ||
          'התשלומים מעובדים באמצעות Grow Payment. חשבוניות מונפקות דרך iCount.'}
      </p>
    </div>
  );
};

export default BillingHistoryPage;
