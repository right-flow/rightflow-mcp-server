// GrowClient - GROW/Meshulam Payment Gateway Integration
// TDD Phase 2.3 - GREEN (Implementation to pass tests)
// Created: 2026-02-05
// Reference: GROW API Documentation

import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';

export interface GrowConfig {
  apiKey: string;
  apiSecret: string;
  environment: 'sandbox' | 'production';
}

export interface CreateCustomerRequest {
  email: string;
  name: string;
  phone: string;
}

export interface CreateCustomerResponse {
  success: boolean;
  customerId?: string;
  error?: string;
}

export interface CreatePaymentMethodRequest {
  customerId: string;
  returnUrl: string;
  amount: number; // in cents
}

export interface CreatePaymentMethodResponse {
  success: boolean;
  paymentUrl?: string;
  sessionId?: string;
  error?: string;
}

export interface ChargeCustomerRequest {
  customerId: string;
  amount: number; // in cents
  description: string;
  idempotencyKey: string;
}

export interface ChargeCustomerResponse {
  success: boolean;
  transactionId?: string;
  amount?: number;
  error?: string;
  failureReason?: string;
}

export interface Transaction {
  transactionId: string;
  status: string;
  amount: number;
  currency: string;
  createdAt: string;
}

export interface RefundTransactionRequest {
  transactionId: string;
  amount: number;
  reason: string;
}

export interface RefundTransactionResponse {
  success: boolean;
  refundId?: string;
  amount?: number;
  error?: string;
}

export class GrowClient {
  private config: GrowConfig;
  private client: AxiosInstance;
  private baseUrl: string;

  constructor(config: GrowConfig) {
    this.config = config;
    this.baseUrl =
      config.environment === 'sandbox'
        ? 'https://sandbox.meshulam.co.il/api'
        : 'https://secure.meshulam.co.il/api';

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': config.apiKey,
      },
      auth: {
        username: config.apiKey,
        password: config.apiSecret,
      },
    });
  }

  /**
   * Create a new customer in GROW
   */
  async createCustomer(
    request: CreateCustomerRequest,
  ): Promise<CreateCustomerResponse> {
    try {
      const response = await this.client.post('/customers', {
        email: request.email,
        name: request.name,
        phone: request.phone,
      });

      return {
        success: true,
        customerId: response.data.customerId,
      };
    } catch (error: any) {
      return {
        success: false,
        error:
          error.response?.data?.error ||
          error.message ||
          'Failed to create customer',
      };
    }
  }

  /**
   * Create payment method (generate payment page URL)
   */
  async createPaymentMethod(
    request: CreatePaymentMethodRequest,
  ): Promise<CreatePaymentMethodResponse> {
    try {
      const response = await this.client.post('/payment-pages', {
        customerId: request.customerId,
        returnUrl: request.returnUrl,
        amount: request.amount,
        currency: 'ILS',
      });

      return {
        success: true,
        paymentUrl: response.data.paymentUrl,
        sessionId: response.data.sessionId,
      };
    } catch (error: any) {
      return {
        success: false,
        error:
          error.response?.data?.error ||
          error.message ||
          'Failed to create payment page',
      };
    }
  }

  /**
   * Charge customer using saved payment method
   */
  async chargeCustomer(
    request: ChargeCustomerRequest,
  ): Promise<ChargeCustomerResponse> {
    try {
      const response = await this.client.post(
        '/charges',
        {
          customerId: request.customerId,
          amount: request.amount,
          currency: 'ILS',
          description: request.description,
        },
        {
          headers: {
            'X-Idempotency-Key': request.idempotencyKey,
          },
        },
      );

      if (response.data.success) {
        return {
          success: true,
          transactionId: response.data.transactionId,
          amount: response.data.amount,
        };
      } else {
        return {
          success: false,
          error: response.data.error,
          failureReason: response.data.errorCode,
        };
      }
    } catch (error: any) {
      if (error.response?.data) {
        return {
          success: false,
          error: error.response.data.error || 'Charge failed',
          failureReason: error.response.data.errorCode,
        };
      }

      return {
        success: false,
        error: error.message || 'Network error',
      };
    }
  }

  /**
   * Get transaction details
   */
  async getTransaction(transactionId: string): Promise<Transaction | null> {
    try {
      const response = await this.client.get(`/transactions/${transactionId}`);

      return {
        transactionId: response.data.transactionId,
        status: response.data.status,
        amount: response.data.amount,
        currency: response.data.currency,
        createdAt: response.data.createdAt,
      };
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Refund a transaction
   */
  async refundTransaction(
    request: RefundTransactionRequest,
  ): Promise<RefundTransactionResponse> {
    try {
      const response = await this.client.post('/refunds', {
        transactionId: request.transactionId,
        amount: request.amount,
        reason: request.reason,
      });

      return {
        success: true,
        refundId: response.data.refundId,
        amount: response.data.amount,
      };
    } catch (error: any) {
      return {
        success: false,
        error:
          error.response?.data?.error ||
          error.message ||
          'Refund failed',
      };
    }
  }

  /**
   * Generate webhook signature for outgoing webhooks
   */
  generateWebhookSignature(payload: any): string {
    const payloadString = JSON.stringify(payload);
    return crypto
      .createHmac('sha256', this.config.apiSecret)
      .update(payloadString)
      .digest('hex');
  }

  /**
   * Verify incoming webhook signature
   */
  verifyWebhookSignature(payload: any, signature: string): boolean {
    const expectedSignature = this.generateWebhookSignature(payload);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature),
    );
  }
}
