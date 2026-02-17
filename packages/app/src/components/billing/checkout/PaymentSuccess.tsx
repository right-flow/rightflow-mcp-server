/**
 * Payment Success Component
 *
 * Displays success message with confetti animation after payment completion.
 * Shows payment details and links to dashboard.
 *
 * @see ADR-009: Grow Payment API Integration
 */

import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Confetti from 'react-confetti';
import { CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useBilling } from '@/contexts/BillingContext';
import { useWindowSize } from '@/hooks/useWindowSize';

interface PaymentSuccessProps {
  className?: string;
}

export const PaymentSuccess: React.FC<PaymentSuccessProps> = ({ className }) => {
  const [searchParams] = useSearchParams();
  const { getCheckoutStatus, refreshSubscription, subscription } = useBilling();
  const { width, height } = useWindowSize();

  const [showConfetti, setShowConfetti] = useState(true);
  const [loading, setLoading] = useState(true);
  const [paymentDetails, setPaymentDetails] = useState<{
    planName?: string;
    amount?: string;
    asmachta?: string;
  }>({});

  const processId = searchParams.get('processId');

  // Fetch payment status and details
  useEffect(() => {
    const fetchStatus = async () => {
      if (!processId) {
        // No process ID - just refresh subscription
        await refreshSubscription();
        setLoading(false);
        return;
      }

      // Poll for checkout status
      let attempts = 0;
      const maxAttempts = 10;
      const interval = 2000;

      const poll = async () => {
        attempts++;
        const status = await getCheckoutStatus(processId);

        if (status.status === 'completed') {
          setPaymentDetails({
            planName: status.subscription?.planName,
          });
          setLoading(false);
          return;
        }

        if (status.status === 'failed') {
          // Redirect to pricing with error
          window.location.href = '/pricing?error=payment_failed';
          return;
        }

        if (attempts < maxAttempts) {
          setTimeout(poll, interval);
        } else {
          // Assume success after timeout
          await refreshSubscription();
          setLoading(false);
        }
      };

      poll();
    };

    fetchStatus();
  }, [processId, getCheckoutStatus, refreshSubscription]);

  // Hide confetti after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <h2 className="text-xl font-semibold mb-2">מעבד את התשלום...</h2>
        <p className="text-muted-foreground">אנא המתן, אנחנו מאשרים את התשלום שלך</p>
      </div>
    );
  }

  return (
    <div className={`text-center p-8 ${className}`} dir="rtl">
      {showConfetti && (
        <Confetti
          width={width}
          height={height}
          recycle={false}
          numberOfPieces={200}
          gravity={0.3}
        />
      )}

      <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
      </div>

      <h1 className="text-2xl font-bold mb-2">התשלום הושלם בהצלחה!</h1>
      <p className="text-muted-foreground mb-6">
        תודה על הרכישה. החשבונית נשלחה למייל שלך.
      </p>

      {/* Payment Details Card */}
      <Card className="max-w-sm mx-auto mb-8">
        <CardContent className="p-6 text-right space-y-3">
          {(paymentDetails.planName || subscription?.planName) && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">תוכנית:</span>
              <span className="font-medium">
                {paymentDetails.planName || subscription?.planName}
              </span>
            </div>
          )}
          {paymentDetails.amount && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">סכום:</span>
              <span className="font-medium">₪{paymentDetails.amount}</span>
            </div>
          )}
          {paymentDetails.asmachta && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">אסמכתא:</span>
              <span className="font-mono text-sm">{paymentDetails.asmachta}</span>
            </div>
          )}
          {subscription?.currentPeriodEnd && (
            <div className="flex justify-between pt-2 border-t">
              <span className="text-muted-foreground">פעיל עד:</span>
              <span className="font-medium">
                {new Date(subscription.currentPeriodEnd).toLocaleDateString('he-IL')}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <Button asChild size="lg">
        <Link to="/dashboard">המשך לדאשבורד</Link>
      </Button>
    </div>
  );
};

export default PaymentSuccess;
