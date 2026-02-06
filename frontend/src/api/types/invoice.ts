// Invoice Types
// Created: 2026-02-05
// Purpose: TypeScript interfaces for invoices and payment methods

export type InvoiceStatus = 'paid' | 'pending' | 'failed' | 'refunded';
export type PaymentMethod = 'credit_card' | 'bank_transfer' | 'paypal';

export interface Invoice {
  id: string;
  orgId: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  amount: number; // in agorot
  currency: string;
  periodStart: Date;
  periodEnd: Date;
  issuedAt: Date;
  dueAt: Date;
  paidAt?: Date;
  paymentMethod?: PaymentMethod;
  downloadUrl?: string;
  description?: string;
}

export interface PaymentMethodInfo {
  id: string;
  type: PaymentMethod;
  last4?: string; // Last 4 digits of card
  brand?: string; // Visa, Mastercard, etc.
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
  createdAt: Date;
}

export interface BillingHistory {
  invoices: Invoice[];
  paymentMethods: PaymentMethodInfo[];
}
