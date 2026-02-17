/**
 * Payment History Table Component
 *
 * Displays payment history from Grow API transactions.
 * Shows payment details including installment progress and invoice downloads.
 *
 * @see ADR-009: Grow Payment API Integration
 */

import React, { useState, useMemo } from 'react';
import { PaymentRecord } from '../../../api/types';
import { formatCurrency } from '../../../utils/formatCurrency';
import { useTranslation, useDirection } from '../../../i18n';
import {
  Download,
  CreditCard,
  Calendar,
  Receipt,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  CheckCircle,
  Clock,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface PaymentHistoryTableProps {
  payments: PaymentRecord[];
  loading?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  className?: string;
}

type SortField = 'date' | 'amount' | 'status' | 'planName';
type SortDirection = 'asc' | 'desc';
type StatusFilter = 'all' | 'completed' | 'pending' | 'failed' | 'refunded';

interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

/**
 * Payment history table component
 * Displays Grow API transaction records with sorting, filtering, and invoice download
 */
export const PaymentHistoryTable: React.FC<PaymentHistoryTableProps> = ({
  payments,
  loading = false,
  onLoadMore,
  hasMore = false,
  className = '',
}) => {
  const t = useTranslation();
  const direction = useDirection();
  const isRtl = direction === 'rtl';
  const locale = isRtl ? 'he-IL' : 'en-US';

  // State - all hooks before any conditional returns
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: 'date',
    direction: 'desc',
  });
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Filter payments by status
  const filteredPayments = useMemo(() => {
    if (!payments || payments.length === 0) return [];
    if (statusFilter === 'all') return payments;
    return payments.filter((p) => p.status === statusFilter);
  }, [payments, statusFilter]);

  // Sort payments
  const sortedPayments = useMemo(() => {
    if (filteredPayments.length === 0) return [];

    return [...filteredPayments].sort((a, b) => {
      let aValue: string | number | Date;
      let bValue: string | number | Date;

      switch (sortConfig.field) {
        case 'date':
          aValue = new Date(a.date);
          bValue = new Date(b.date);
          break;
        case 'amount':
          aValue = a.amount;
          bValue = b.amount;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'planName':
          aValue = a.planName;
          bValue = b.planName;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredPayments, sortConfig]);

  // Loading skeleton
  if (loading && payments.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            {t['billing.history.payments'] || 'היסטוריית תשלומים'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="h-10 w-10 bg-muted rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-1/3" />
                  <div className="h-3 bg-muted rounded w-1/4" />
                </div>
                <div className="h-4 bg-muted rounded w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (!payments || payments.length === 0) {
    return (
      <Card className={className} dir={direction}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            {t['billing.history.payments'] || 'היסטוריית תשלומים'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Receipt className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium">
              {t['billing.history.noPayments'] || 'אין תשלומים עדיין'}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {t['billing.history.noPaymentsDescription'] ||
                'תשלומים יופיעו כאן לאחר שתבצעו רכישה'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Toggle sort
  const handleSort = (field: SortField) => {
    setSortConfig((prev) => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  // Sort indicator
  const SortIndicator: React.FC<{ field: SortField }> = ({ field }) => {
    if (sortConfig.field !== field) {
      return <ArrowUpDown className="h-4 w-4 text-muted-foreground" />;
    }
    return sortConfig.direction === 'asc' ? (
      <ChevronUp className="h-4 w-4 text-primary" />
    ) : (
      <ChevronDown className="h-4 w-4 text-primary" />
    );
  };

  // Status badge component
  const PaymentStatusBadge: React.FC<{ status: PaymentRecord['status'] }> = ({ status }) => {
    const config = {
      completed: {
        label: t['billing.payment.statusCompleted'] || 'הושלם',
        variant: 'default' as const,
        icon: CheckCircle,
        className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      },
      pending: {
        label: t['billing.payment.statusPending'] || 'ממתין',
        variant: 'secondary' as const,
        icon: Clock,
        className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      },
      failed: {
        label: t['billing.payment.statusFailed'] || 'נכשל',
        variant: 'destructive' as const,
        icon: XCircle,
        className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      },
      refunded: {
        label: t['billing.payment.statusRefunded'] || 'הוחזר',
        variant: 'outline' as const,
        icon: RefreshCw,
        className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
      },
    };

    const { label, icon: Icon, className: badgeClassName } = config[status];

    return (
      <Badge variant="outline" className={`gap-1 ${badgeClassName}`}>
        <Icon className="h-3 w-3" />
        {label}
      </Badge>
    );
  };

  // Format date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // Handle invoice download with URL validation
  const handleDownloadInvoice = (invoiceUrl: string) => {
    // SECURITY: Validate URL domain before opening
    const trustedDomains = ['icount.co.il', 'api.icount.co.il', 'grow.co.il', 'meshulam.co.il'];
    try {
      const url = new URL(invoiceUrl);
      const isTrusted = trustedDomains.some(d => url.hostname === d || url.hostname.endsWith(`.${d}`));
      if (!isTrusted) {
        console.error('[Security] Untrusted invoice URL blocked:', url.hostname);
        return;
      }
      window.open(invoiceUrl, '_blank', 'noopener,noreferrer');
    } catch {
      console.error('[Security] Invalid invoice URL:', invoiceUrl);
    }
  };

  return (
    <Card className={className} dir={direction}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            {t['billing.history.payments'] || 'היסטוריית תשלומים'}
          </CardTitle>

          {/* Status filter */}
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as StatusFilter)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t['billing.history.filterByStatus'] || 'סנן לפי סטטוס'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t['billing.history.allPayments'] || 'כל התשלומים'}</SelectItem>
              <SelectItem value="completed">
                {t['billing.payment.statusCompleted'] || 'הושלם'}
              </SelectItem>
              <SelectItem value="pending">
                {t['billing.payment.statusPending'] || 'ממתין'}
              </SelectItem>
              <SelectItem value="failed">
                {t['billing.payment.statusFailed'] || 'נכשל'}
              </SelectItem>
              <SelectItem value="refunded">
                {t['billing.payment.statusRefunded'] || 'הוחזר'}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th
                  className={`px-4 py-3 ${isRtl ? 'text-right' : 'text-left'} text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted transition-colors`}
                  onClick={() => handleSort('date')}
                >
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {t['billing.payment.date'] || 'תאריך'}
                    <SortIndicator field="date" />
                  </div>
                </th>
                <th
                  className={`px-4 py-3 ${isRtl ? 'text-right' : 'text-left'} text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted transition-colors`}
                  onClick={() => handleSort('planName')}
                >
                  <div className="flex items-center gap-2">
                    {t['billing.payment.plan'] || 'תוכנית'}
                    <SortIndicator field="planName" />
                  </div>
                </th>
                <th
                  className={`px-4 py-3 ${isRtl ? 'text-right' : 'text-left'} text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted transition-colors`}
                  onClick={() => handleSort('amount')}
                >
                  <div className="flex items-center gap-2">
                    {t['billing.payment.amount'] || 'סכום'}
                    <SortIndicator field="amount" />
                  </div>
                </th>
                <th className={`px-4 py-3 ${isRtl ? 'text-right' : 'text-left'} text-xs font-medium text-muted-foreground uppercase tracking-wider`}>
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    {t['billing.payment.method'] || 'אמצעי תשלום'}
                  </div>
                </th>
                <th
                  className={`px-4 py-3 ${isRtl ? 'text-right' : 'text-left'} text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted transition-colors`}
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center gap-2">
                    {t['billing.payment.status'] || 'סטטוס'}
                    <SortIndicator field="status" />
                  </div>
                </th>
                <th className={`px-4 py-3 ${isRtl ? 'text-left' : 'text-right'} text-xs font-medium text-muted-foreground uppercase tracking-wider`}>
                  {t['billing.payment.invoice'] || 'חשבונית'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sortedPayments.map((payment, index) => (
                <tr
                  key={payment.id}
                  className={`${index % 2 === 0 ? 'bg-background' : 'bg-muted/30'} hover:bg-muted/50 transition-colors`}
                >
                  <td className="px-4 py-4 whitespace-nowrap text-sm">
                    {formatDate(payment.date)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                    {payment.planName}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm">
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {formatCurrency(payment.amount, payment.currency)}
                      </span>
                      {payment.installments && (
                        <span className="text-xs text-muted-foreground">
                          {t['billing.payment.installment'] || 'תשלום'}{' '}
                          {payment.installments.current}/{payment.installments.total}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {payment.cardBrand && `${payment.cardBrand} `}
                        {payment.cardLast4 && `****${payment.cardLast4}`}
                        {!payment.cardLast4 && payment.paymentMethod}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <PaymentStatusBadge status={payment.status} />
                  </td>
                  <td className={`px-4 py-4 whitespace-nowrap ${isRtl ? 'text-left' : 'text-right'}`}>
                    {payment.invoice?.url ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownloadInvoice(payment.invoice!.url)}
                        className="gap-1"
                      >
                        <Download className="h-4 w-4" />
                        {t['billing.payment.download'] || 'הורדה'}
                      </Button>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        {payment.asmachta || '-'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-4 p-4">
          {sortedPayments.map((payment) => (
            <div
              key={payment.id}
              className="border rounded-lg p-4 space-y-3 bg-card"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {formatDate(payment.date)}
                </span>
                <PaymentStatusBadge status={payment.status} />
              </div>

              <div className="flex items-center justify-between">
                <span className="font-medium">{payment.planName}</span>
                <span className="font-bold text-lg">
                  {formatCurrency(payment.amount, payment.currency)}
                </span>
              </div>

              {payment.installments && (
                <div className="text-sm text-muted-foreground">
                  {t['billing.payment.installment'] || 'תשלום'}{' '}
                  {payment.installments.current} {t['billing.payment.of'] || 'מתוך'}{' '}
                  {payment.installments.total}
                </div>
              )}

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CreditCard className="h-4 w-4" />
                <span>
                  {payment.cardBrand && `${payment.cardBrand} `}
                  {payment.cardLast4 && `****${payment.cardLast4}`}
                  {!payment.cardLast4 && payment.paymentMethod}
                </span>
              </div>

              {payment.invoice?.url && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownloadInvoice(payment.invoice!.url)}
                  className="w-full gap-2"
                >
                  <Download className="h-4 w-4" />
                  {t['billing.payment.downloadInvoice'] || 'הורד חשבונית'}
                </Button>
              )}

              {payment.asmachta && !payment.invoice?.url && (
                <div className="text-sm text-muted-foreground">
                  {t['billing.payment.asmachta'] || 'אסמכתא'}: {payment.asmachta}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Empty filtered state */}
        {sortedPayments.length === 0 && statusFilter !== 'all' && (
          <div className="text-center py-8 px-4">
            <p className="text-sm text-muted-foreground">
              {t['billing.history.noFilteredPayments'] || 'אין תשלומים עם סטטוס זה'}
            </p>
            <Button
              variant="link"
              onClick={() => setStatusFilter('all')}
              className="mt-2"
            >
              {t['billing.history.clearFilter'] || 'נקה סינון'}
            </Button>
          </div>
        )}

        {/* Load more */}
        {hasMore && onLoadMore && (
          <div className="p-4 text-center border-t">
            <Button
              variant="outline"
              onClick={onLoadMore}
              disabled={loading}
              className="gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  {t['billing.history.loading'] || 'טוען...'}
                </>
              ) : (
                t['billing.history.loadMore'] || 'טען עוד'
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PaymentHistoryTable;
