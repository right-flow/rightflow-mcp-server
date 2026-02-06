// BillingHistoryPage Component
// Created: 2026-02-05
// Purpose: Container page for billing history and payment methods

import React, { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Invoice, PaymentMethodInfo } from '../../../api/types';
import { InvoiceTable } from './InvoiceTable';
import { PaymentMethodCard } from './PaymentMethodCard';
import { useToast } from '../../../hooks/useToast';

interface BillingHistoryPageProps {
  className?: string;
}

/**
 * Billing history page component
 * Orchestrates invoice history and payment method management
 */
export const BillingHistoryPage: React.FC<BillingHistoryPageProps> = ({
  className = '',
}) => {
  const { orgId } = useAuth();
  const effectiveOrgId = orgId || 'org_demo';
  const { success, error: showError } = useToast();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load billing history on mount
  useEffect(() => {
    loadBillingHistory();
  }, [effectiveOrgId]);

  // Load billing history
  const loadBillingHistory = async () => {
    setLoading(true);
    setError(null);

    try {
      // TODO: Replace with actual API call
      // const response = await billingApi.getBillingHistory(orgId);
      // setInvoices(response.invoices);
      // setPaymentMethods(response.paymentMethods);

      // Mock data for now
      const mockInvoices: Invoice[] = [
        {
          id: '1',
          orgId: effectiveOrgId,
          invoiceNumber: 'INV-2026-001',
          status: 'paid',
          amount: 9900, // 99.00 ILS
          currency: 'ILS',
          periodStart: new Date('2026-01-01'),
          periodEnd: new Date('2026-01-31'),
          issuedAt: new Date('2026-01-01'),
          dueAt: new Date('2026-01-15'),
          paidAt: new Date('2026-01-03'),
          paymentMethod: 'credit_card',
          downloadUrl: '/api/invoices/1/download',
          description: 'Basic Plan - January 2026',
        },
        {
          id: '2',
          orgId: effectiveOrgId,
          invoiceNumber: 'INV-2025-012',
          status: 'paid',
          amount: 9900,
          currency: 'ILS',
          periodStart: new Date('2025-12-01'),
          periodEnd: new Date('2025-12-31'),
          issuedAt: new Date('2025-12-01'),
          dueAt: new Date('2025-12-15'),
          paidAt: new Date('2025-12-02'),
          paymentMethod: 'credit_card',
          downloadUrl: '/api/invoices/2/download',
          description: 'Basic Plan - December 2025',
        },
      ];

      const mockPaymentMethods: PaymentMethodInfo[] = [
        {
          id: '1',
          type: 'credit_card',
          last4: '4242',
          brand: 'Visa',
          expiryMonth: 12,
          expiryYear: 2027,
          isDefault: true,
          createdAt: new Date('2025-06-15'),
        },
      ];

      setInvoices(mockInvoices);
      setPaymentMethods(mockPaymentMethods);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load billing history';
      setError(message);
      showError(message);
    } finally {
      setLoading(false);
    }
  };

  // Handle invoice download
  const handleDownloadInvoice = async (invoice: Invoice) => {
    try {
      if (!invoice.downloadUrl) {
        showError('Download URL not available');
        return;
      }

      // TODO: Implement actual download
      // window.open(invoice.downloadUrl, '_blank');
      success(`Downloading invoice ${invoice.invoiceNumber}...`);
    } catch (err) {
      showError('Failed to download invoice');
    }
  };

  // Handle add payment method
  const handleAddPaymentMethod = () => {
    // TODO: Implement payment method modal/flow
    showError('Add payment method flow not yet implemented');
  };

  // Handle remove payment method
  const handleRemovePaymentMethod = async (paymentMethodId: string) => {
    try {
      // TODO: Implement actual API call
      // await billingApi.removePaymentMethod(orgId, paymentMethodId);

      setPaymentMethods((prev) => prev.filter((pm) => pm.id !== paymentMethodId));
      success('Payment method removed successfully');
    } catch (err) {
      showError('Failed to remove payment method');
    }
  };

  // Handle set default payment method
  const handleSetDefault = async (paymentMethodId: string) => {
    try {
      // TODO: Implement actual API call
      // await billingApi.setDefaultPaymentMethod(orgId, paymentMethodId);

      setPaymentMethods((prev) =>
        prev.map((pm) => ({
          ...pm,
          isDefault: pm.id === paymentMethodId,
        }))
      );
      success('Default payment method updated');
    } catch (err) {
      showError('Failed to update default payment method');
    }
  };

  return (
    <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 ${className}`}>
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Billing History</h1>
        <p className="mt-2 text-sm text-gray-600">
          View your invoices and manage payment methods
        </p>
      </div>

      {/* Error state */}
      {error && !loading && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Failed to load billing history</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
              <button
                onClick={loadBillingHistory}
                className="mt-2 text-sm font-medium text-red-800 hover:text-red-900"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="space-y-6">
        {/* Payment methods */}
        <PaymentMethodCard
          paymentMethods={paymentMethods}
          loading={loading}
          onAddPaymentMethod={handleAddPaymentMethod}
          onRemovePaymentMethod={handleRemovePaymentMethod}
          onSetDefault={handleSetDefault}
        />

        {/* Invoice history */}
        <InvoiceTable
          invoices={invoices}
          loading={loading}
          onDownload={handleDownloadInvoice}
        />
      </div>
    </div>
  );
};

export default BillingHistoryPage;
