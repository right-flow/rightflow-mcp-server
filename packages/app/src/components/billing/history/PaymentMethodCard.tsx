// PaymentMethodCard Component
// Created: 2026-02-05
// Purpose: Display payment method information

import React from 'react';
import { PaymentMethodInfo, PaymentMethod } from '../../../api/types';

interface PaymentMethodCardProps {
  paymentMethods: PaymentMethodInfo[];
  loading?: boolean;
  onAddPaymentMethod?: () => void;
  onRemovePaymentMethod?: (paymentMethodId: string) => void;
  onSetDefault?: (paymentMethodId: string) => void;
  className?: string;
}

/**
 * Payment method card component
 * Displays saved payment methods with management actions
 */
export const PaymentMethodCard: React.FC<PaymentMethodCardProps> = ({
  paymentMethods,
  loading = false,
  onAddPaymentMethod,
  onRemovePaymentMethod,
  onSetDefault,
  className = '',
}) => {
  // Loading skeleton
  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // Get card brand icon
  const getCardIcon = (type: PaymentMethod, brand?: string) => {
    if (type === 'credit_card') {
      switch (brand?.toLowerCase()) {
        case 'visa':
          return (
            <div className="w-12 h-8 bg-blue-600 rounded flex items-center justify-center text-white text-xs font-bold">
              VISA
            </div>
          );
        case 'mastercard':
          return (
            <div className="w-12 h-8 bg-red-600 rounded flex items-center justify-center">
              <div className="flex gap-0.5">
                <div className="w-3 h-3 bg-red-500 rounded-full opacity-80"></div>
                <div className="w-3 h-3 bg-yellow-500 rounded-full opacity-80"></div>
              </div>
            </div>
          );
        case 'amex':
        case 'american express':
          return (
            <div className="w-12 h-8 bg-blue-400 rounded flex items-center justify-center text-white text-xs font-bold">
              AMEX
            </div>
          );
        default:
          return (
            <svg className="w-12 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
              />
            </svg>
          );
      }
    } else if (type === 'paypal') {
      return (
        <div className="w-12 h-8 bg-blue-500 rounded flex items-center justify-center text-white text-xs font-bold">
          PP
        </div>
      );
    } else if (type === 'bank_transfer') {
      return (
        <svg className="w-12 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z"
          />
        </svg>
      );
    }
  };

  // Format payment method display name
  const getPaymentMethodName = (method: PaymentMethodInfo): string => {
    if (method.type === 'credit_card') {
      return `${method.brand || 'Card'} ending in ${method.last4}`;
    } else if (method.type === 'paypal') {
      return 'PayPal';
    } else if (method.type === 'bank_transfer') {
      return 'Bank Transfer';
    }
    return 'Payment Method';
  };

  // Format expiry
  const formatExpiry = (month?: number, year?: number): string => {
    if (!month || !year) return '';
    return `Expires ${month.toString().padStart(2, '0')}/${year.toString().slice(-2)}`;
  };

  return (
    <div className={`bg-white rounded-lg shadow-md ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Payment Methods</h2>
          {onAddPaymentMethod && (
            <button
              onClick={onAddPaymentMethod}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Payment Method
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {paymentMethods.length === 0 ? (
          // No payment methods
          <div className="text-center py-8">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
              />
            </svg>
            <p className="mt-2 text-sm text-gray-500">No payment methods added</p>
            {onAddPaymentMethod && (
              <button
                onClick={onAddPaymentMethod}
                className="mt-4 inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add Your First Payment Method
              </button>
            )}
          </div>
        ) : (
          // Payment methods list
          <div className="space-y-4">
            {paymentMethods.map((method) => (
              <div
                key={method.id}
                className={`p-4 border-2 rounded-lg ${
                  method.isDefault ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Card icon */}
                  <div className="flex-shrink-0 mt-1">
                    {getCardIcon(method.type, method.brand)}
                  </div>

                  {/* Card details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-semibold text-gray-900">
                        {getPaymentMethodName(method)}
                      </h3>
                      {method.isDefault && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Default
                        </span>
                      )}
                    </div>
                    {method.expiryMonth && method.expiryYear && (
                      <p className="text-sm text-gray-600">
                        {formatExpiry(method.expiryMonth, method.expiryYear)}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      Added {new Date(method.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex-shrink-0 flex gap-2">
                    {!method.isDefault && onSetDefault && (
                      <button
                        onClick={() => onSetDefault(method.id)}
                        className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                      >
                        Set Default
                      </button>
                    )}
                    {onRemovePaymentMethod && !method.isDefault && (
                      <button
                        onClick={() => onRemovePaymentMethod(method.id)}
                        className="px-3 py-1.5 text-xs font-medium text-red-600 bg-white border border-red-300 rounded-md hover:bg-red-50 transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info note */}
        {paymentMethods.length > 0 && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-700">
              <span className="font-semibold">Note:</span> Your default payment method will be used for automatic
              renewals and overages. You must have at least one payment method on file.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentMethodCard;
