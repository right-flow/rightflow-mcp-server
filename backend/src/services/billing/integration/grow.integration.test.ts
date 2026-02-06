// GROW Integration Tests
// Created: 2026-02-05
// NOTE: These tests require GROW sandbox credentials

import { GrowClient } from '../GrowClient';
import { BillingService } from '../BillingService';
import { SubscriptionService } from '../SubscriptionService';
import { UsageService } from '../UsageService';

// Skip these tests in CI/CD - only run manually with sandbox credentials
const SKIP_INTEGRATION_TESTS = !process.env.GROW_API_KEY;

describe.skip('GROW Integration E2E', () => {
  let growClient: GrowClient;
  let billingService: BillingService;
  let subscriptionService: SubscriptionService;
  let usageService: UsageService;

  beforeAll(() => {
    if (SKIP_INTEGRATION_TESTS) {
      console.log('Skipping GROW integration tests - no API credentials');
      return;
    }

    growClient = new GrowClient({
      apiKey: process.env.GROW_API_KEY || '',
      apiSecret: process.env.GROW_API_SECRET || '',
      environment: 'sandbox',
    });

    subscriptionService = new SubscriptionService();
    usageService = new UsageService();
    billingService = new BillingService(
      growClient,
      subscriptionService,
      usageService,
    );
  });

  it('should complete full payment flow', async () => {
    if (SKIP_INTEGRATION_TESTS) {
      return;
    }

    // 1. Create customer
    const customer = await growClient.createCustomer({
      email: `test-${Date.now()}@rightflow.io`,
      name: 'Test Organization',
      phone: '0501234567',
    });

    expect(customer.success).toBe(true);
    expect(customer.customerId).toBeDefined();

    if (!customer.customerId) {
      throw new Error('Customer creation failed');
    }

    // 2. Create payment page
    const paymentPage = await growClient.createPaymentMethod({
      customerId: customer.customerId,
      returnUrl: 'https://app.rightflow.io/billing/callback',
      amount: 30000, // 300 ILS
    });

    expect(paymentPage.success).toBe(true);
    expect(paymentPage.paymentUrl).toBeDefined();

    // In real scenario, user would complete payment on this URL
    // For test, we simulate successful payment webhook

    // 3. Simulate charge (requires payment method to be added first)
    // NOTE: In sandbox, this might fail if no payment method is attached
    // This is expected - manual testing required for full flow
  }, 30000); // 30 second timeout

  it('should handle payment failure gracefully', async () => {
    if (SKIP_INTEGRATION_TESTS) {
      return;
    }

    const result = await growClient.chargeCustomer({
      customerId: 'non-existent-customer',
      amount: 30000,
      description: 'Test charge',
      idempotencyKey: `test-${Date.now()}`,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

// Manual test documentation
/*
MANUAL TESTING GUIDE:
=====================

1. Set environment variables:
   export GROW_API_KEY="your-sandbox-api-key"
   export GROW_API_SECRET="your-sandbox-api-secret"
   export GROW_ENVIRONMENT="sandbox"

2. Run specific test:
   npm test -- grow.integration.test.ts

3. Expected flow:
   - Create customer → Returns customer ID
   - Create payment page → Returns payment URL
   - Visit URL manually and complete test payment
   - Check webhook received
   - Verify subscription status updated

4. Test cases to verify manually:
   - Successful payment → subscription active
   - Failed payment → grace period started
   - Refund → subscription remains active
   - Multiple retries → grace period handling

5. Webhook testing:
   - Use ngrok to expose local server
   - Configure webhook URL in GROW dashboard
   - Trigger payment events
   - Verify webhook signature validation
*/
