/**
 * Pre-Checkout Modal
 *
 * Displays order summary before redirecting to Grow payment page.
 * Features:
 * - Plan details and pricing
 * - Credit days notice for mid-period upgrades
 * - Installment selection (yearly plans only)
 * - Payment method preview
 *
 * @see ADR-009: Grow Payment API Integration
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, CreditCard, Calendar, Gift, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Plan, InstallmentOption } from '@/api/types';
import { useBilling } from '@/contexts/BillingContext';

interface PreCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: Plan;
  billingPeriod: 'monthly' | 'yearly';
}

/**
 * Calculate installment options for a given price
 */
function getInstallmentOptions(totalPrice: number, maxInstallments: number = 12): InstallmentOption[] {
  const options: InstallmentOption[] = [
    { count: 1, amount: totalPrice },
  ];

  // Add installment options: 3, 6, 12
  const counts = [3, 6, 12].filter(c => c <= maxInstallments);

  for (const count of counts) {
    options.push({
      count,
      amount: Math.ceil(totalPrice / count),
      recommended: count === 6, // 6 is recommended default
    });
  }

  return options;
}

/**
 * Format price in ILS
 */
function formatPrice(amount: number): string {
  return `₪${amount.toLocaleString('he-IL')}`;
}

/**
 * Calculate end date with credit days
 */
function calculateEndDate(creditDays: number, billingPeriod: 'monthly' | 'yearly'): string {
  const endDate = new Date();
  const months = billingPeriod === 'yearly' ? 12 : 1;
  endDate.setMonth(endDate.getMonth() + months);
  endDate.setDate(endDate.getDate() + creditDays);

  return endDate.toLocaleDateString('he-IL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export const PreCheckoutModal: React.FC<PreCheckoutModalProps> = ({
  isOpen,
  onClose,
  plan,
  billingPeriod,
}) => {
  const { calculateCreditDays, startCheckoutWithOptions, creditDaysInfo } = useBilling();

  const [selectedInstallments, setSelectedInstallments] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingCreditDays, setLoadingCreditDays] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate price based on billing period
  const price = billingPeriod === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;

  // Get max installments from plan features
  const maxInstallments = (plan.features as any)?.installments_yearly_max || 12;

  // Get installment options (only for yearly)
  const installmentOptions = billingPeriod === 'yearly'
    ? getInstallmentOptions(price, maxInstallments)
    : [];

  // Calculate credit days on mount
  useEffect(() => {
    if (isOpen) {
      setLoadingCreditDays(true);
      calculateCreditDays()
        .finally(() => setLoadingCreditDays(false));
    }
  }, [isOpen, calculateCreditDays]);

  // Handle checkout
  const handleCheckout = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await startCheckoutWithOptions({
        planId: plan.id,
        billingPeriod,
        installments: billingPeriod === 'yearly' ? selectedInstallments : undefined,
      });
      // Redirect happens in startCheckoutWithOptions
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה ביצירת ההזמנה');
      setIsLoading(false);
    }
  }, [plan.id, billingPeriod, selectedInstallments, startCheckoutWithOptions]);

  const creditDays = creditDaysInfo?.creditDays || 0;

  return (
    <Dialog open={isOpen} onOpenChange={() => !isLoading && onClose()}>
      <DialogContent className="sm:max-w-[500px]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">סיכום הזמנה</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Plan Details */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">תוכנית:</span>
              <span className="font-medium">{plan.displayName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">תקופה:</span>
              <span>{billingPeriod === 'yearly' ? 'שנתי' : 'חודשי'}</span>
            </div>
            <div className="flex justify-between items-center text-lg font-bold pt-2 border-t">
              <span>סה״כ:</span>
              <span>{formatPrice(price)}</span>
            </div>
          </div>

          {/* Credit Days Notice */}
          {loadingCreditDays ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>בודק זיכוי...</span>
            </div>
          ) : creditDays > 0 ? (
            <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                <Gift className="h-5 w-5" />
                <span className="font-medium">
                  זיכוי מתוכנית קודמת: <strong>{creditDays} ימים</strong>
                </span>
              </div>
              <div className="text-sm text-green-600 dark:text-green-400 mt-1 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>
                  התוכנית תהיה פעילה עד: {calculateEndDate(creditDays, billingPeriod)}
                </span>
              </div>
            </div>
          ) : null}

          {/* Installment Selection (yearly only) */}
          {billingPeriod === 'yearly' && installmentOptions.length > 1 && (
            <div className="space-y-3">
              <Label className="text-base font-medium">מספר תשלומים</Label>
              <RadioGroup
                value={selectedInstallments.toString()}
                onValueChange={(val) => setSelectedInstallments(parseInt(val))}
                className="space-y-2"
              >
                {installmentOptions.map((option) => (
                  <label
                    key={option.count}
                    className={cn(
                      'flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors',
                      selectedInstallments === option.count
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-muted-foreground/50'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <RadioGroupItem value={option.count.toString()} />
                      <span>
                        {option.count === 1 ? 'תשלום אחד' : `${option.count} תשלומים`}
                      </span>
                      {option.recommended && (
                        <Badge variant="default" className="text-xs">
                          מומלץ
                        </Badge>
                      )}
                    </div>
                    <div className="text-left">
                      <span className="font-medium">{formatPrice(option.amount)}</span>
                      {option.count > 1 && (
                        <span className="text-muted-foreground"> × {option.count}</span>
                      )}
                    </div>
                  </label>
                ))}
              </RadioGroup>
              <p className="text-xs text-muted-foreground">ללא ריבית והצמדה</p>
            </div>
          )}

          {/* Payment Method Info */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CreditCard className="h-4 w-4" />
            <span>תתבקש להזין פרטי תשלום בעמוד הבא</span>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 text-destructive bg-destructive/10 p-3 rounded-lg">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-3 sm:gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1"
          >
            ביטול
          </Button>
          <Button
            onClick={handleCheckout}
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? (
              <>
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                מעבד...
              </>
            ) : (
              'המשך לתשלום'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PreCheckoutModal;
