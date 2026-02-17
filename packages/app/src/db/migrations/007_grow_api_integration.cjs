/**
 * Migration: Grow API Integration
 *
 * Creates tables for full Grow Payment API integration:
 * - grow_transactions: Payment transaction records
 * - checkout_sessions: Checkout session tracking
 * - icount_invoices: Invoice records from iCount
 * - invoice_queue: Retry queue for failed invoices
 * - payment_notifications: Email/in-app notification tracking
 * - installment_plans: Multi-payment subscription tracking
 *
 * Also adds columns to users table for payment status and grace period.
 *
 * @see ADR-009: Grow Payment API Integration
 */

exports.up = async function(knex) {
  // Helper function to create table if not exists
  const createTableIfNotExists = async (tableName, callback) => {
    const exists = await knex.schema.hasTable(tableName);
    if (!exists) {
      await knex.schema.createTable(tableName, callback);
      console.log(`Created table: ${tableName}`);
    } else {
      console.log(`Table already exists, skipping: ${tableName}`);
    }
  };

  // Helper function to add column if not exists
  const addColumnIfNotExists = async (tableName, columnName, callback) => {
    const hasColumn = await knex.schema.hasColumn(tableName, columnName);
    if (!hasColumn) {
      await knex.schema.alterTable(tableName, callback);
      console.log(`Added column ${columnName} to ${tableName}`);
    } else {
      console.log(`Column ${columnName} already exists in ${tableName}, skipping`);
    }
  };

  // 1. Grow Transactions Table
  await createTableIfNotExists('grow_transactions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('plan_id').nullable().references('id').inTable('plans');

    // Grow identifiers
    table.string('process_id', 50).notNullable();
    table.string('process_token', 100).nullable();
    table.string('transaction_id', 50).nullable().unique();
    table.string('asmachta', 20).nullable();

    // Payment details
    table.integer('amount_ils').notNullable();
    table.string('currency', 3).defaultTo('ILS');
    table.string('payment_method', 20).nullable(); // credit_card, bit, apple_pay, etc.
    table.string('card_suffix', 4).nullable();
    table.string('card_brand', 20).nullable();
    table.string('card_exp', 4).nullable();

    // Installments
    table.integer('installments').defaultTo(1);
    table.integer('installment_number').defaultTo(1);

    // Status
    table.string('status', 20).notNullable().defaultTo('pending');
    table.string('status_code', 10).nullable();
    table.text('failure_reason').nullable();

    // Billing period
    table.string('billing_period', 10).nullable(); // monthly, yearly
    table.text('description').nullable();

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('completed_at').nullable();

    // Raw webhook data for debugging
    table.jsonb('raw_webhook_data').nullable();

    // Indexes
    table.index('user_id', 'idx_grow_transactions_user');
    table.index('process_id', 'idx_grow_transactions_process');
    table.index('status', 'idx_grow_transactions_status');
    table.index('created_at', 'idx_grow_transactions_created');
  });

  // 2. Checkout Sessions Table
  await createTableIfNotExists('checkout_sessions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('plan_id').notNullable().references('id').inTable('plans');

    // Grow identifiers
    table.string('process_id', 50).nullable().unique();
    table.string('process_token', 100).nullable();

    // Checkout details
    table.integer('amount_ils').notNullable();
    table.string('billing_period', 10).notNullable();
    table.integer('installments').defaultTo(1);
    table.string('payment_method', 20).nullable();

    // Captured at checkout time (for price change protection)
    table.integer('price_at_checkout').notNullable();
    table.jsonb('plan_snapshot').nullable();
    table.integer('credit_days').defaultTo(0);

    // Status: pending, completed, abandoned, superseded, failed
    table.string('status', 20).notNullable().defaultTo('pending');

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('expires_at').nullable();
    table.timestamp('completed_at').nullable();

    // Indexes
    table.index('user_id', 'idx_checkout_sessions_user');
    table.index('status', 'idx_checkout_sessions_status');
    table.index('expires_at', 'idx_checkout_sessions_expires');
  });

  // 3. iCount Invoices Table
  await createTableIfNotExists('icount_invoices', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('transaction_id').nullable().references('id').inTable('grow_transactions');
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');

    // iCount identifiers
    table.string('icount_doc_id', 50).notNullable().unique();
    table.string('doc_number', 50).notNullable();
    table.string('doc_type', 20).defaultTo('invrec'); // invrec, invoice, receipt
    table.text('doc_url').nullable();

    // Client info
    table.string('icount_client_id', 50).nullable();

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('sent_at').nullable();

    // Indexes
    table.index('user_id', 'idx_icount_invoices_user');
    table.index('transaction_id', 'idx_icount_invoices_transaction');
  });

  // 4. Invoice Queue Table (for retry)
  await createTableIfNotExists('invoice_queue', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('transaction_id').notNullable().references('id').inTable('grow_transactions');
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');

    // Retry info
    table.integer('retry_count').defaultTo(0);
    table.integer('max_retries').defaultTo(5);
    table.timestamp('next_retry').nullable();
    table.text('last_error').nullable();

    // Status: pending, processing, completed, failed
    table.string('status', 20).defaultTo('pending');

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('completed_at').nullable();

    // Index for retry processing
    table.index(['next_retry', 'status'], 'idx_invoice_queue_next_retry');
  });

  // 5. Payment Notifications Table
  await createTableIfNotExists('payment_notifications', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');

    // Notification details
    table.string('type', 50).notNullable();
    // Types: payment_success, payment_failed, grace_reminder, renewal_reminder,
    //        installment_reminder, installment_paid, subscription_downgraded

    table.string('channel', 20).notNullable(); // email, in_app, sms
    table.string('status', 20).defaultTo('pending'); // pending, sent, failed, read

    // Content
    table.text('subject').nullable();
    table.text('body').nullable();
    table.jsonb('metadata').nullable();

    // Timestamps
    table.timestamp('scheduled_for').defaultTo(knex.fn.now());
    table.timestamp('sent_at').nullable();
    table.timestamp('read_at').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('user_id', 'idx_payment_notifications_user');
    table.index(['scheduled_for', 'status'], 'idx_payment_notifications_scheduled');
  });

  // 6. Installment Plans Table
  await createTableIfNotExists('installment_plans', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('initial_transaction_id').nullable().references('id').inTable('grow_transactions');

    // Plan details
    table.integer('total_amount').notNullable();
    table.integer('installment_count').notNullable();
    table.integer('installment_amount').notNullable();

    // Status: active, completed, failed, canceled
    table.string('status', 20).defaultTo('active');

    table.integer('payments_completed').defaultTo(1);

    // Timestamps
    table.timestamp('start_date').defaultTo(knex.fn.now());
    table.timestamp('end_date').nullable();
    table.timestamp('next_payment_date').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('user_id', 'idx_installment_plans_user');
    table.index(['next_payment_date', 'status'], 'idx_installment_plans_next_payment');
  });

  // 7. Admin Alerts Table (for edge cases requiring manual review)
  await createTableIfNotExists('admin_alerts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').nullable().references('id').inTable('users').onDelete('SET NULL');

    // Alert details
    table.string('type', 50).notNullable();
    // Types: potential_double_payment, webhook_failure, amount_mismatch,
    //        approve_transaction_failed, unknown_status_code, etc.

    table.string('severity', 20).defaultTo('medium'); // low, medium, high, critical
    table.string('status', 20).defaultTo('open'); // open, acknowledged, resolved

    // Content
    table.text('title').notNullable();
    table.text('description').nullable();
    table.jsonb('metadata').nullable();

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('acknowledged_at').nullable();
    table.timestamp('resolved_at').nullable();
    table.uuid('resolved_by').nullable();

    // Indexes
    table.index(['status', 'severity'], 'idx_admin_alerts_status');
    table.index('user_id', 'idx_admin_alerts_user');
  });

  // 8. Add columns to users table (only if not exists)
  const userColumns = [
    { name: 'payment_status', add: (t) => t.string('payment_status', 20).defaultTo('none') },
    { name: 'grace_period_start', add: (t) => t.timestamp('grace_period_start').nullable() },
    { name: 'grace_period_end', add: (t) => t.timestamp('grace_period_end').nullable() },
    { name: 'payment_failure_reason', add: (t) => t.text('payment_failure_reason').nullable() },
    { name: 'icount_client_id', add: (t) => t.string('icount_client_id', 50).nullable() },
    { name: 'last_payment_method', add: (t) => t.string('last_payment_method', 20).nullable() },
    { name: 'last_card_suffix', add: (t) => t.string('last_card_suffix', 4).nullable() },
    { name: 'last_card_brand', add: (t) => t.string('last_card_brand', 20).nullable() },
    { name: 'last_checkout_at', add: (t) => t.timestamp('last_checkout_at').nullable() },
    { name: 'checkout_count_today', add: (t) => t.integer('checkout_count_today').defaultTo(0) },
  ];

  for (const col of userColumns) {
    await addColumnIfNotExists('users', col.name, col.add);
  }

  // 9. Create webhook_events table for idempotency tracking
  await createTableIfNotExists('webhook_events', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Idempotency key (transaction_id from Grow)
    table.string('idempotency_key', 100).notNullable().unique();
    table.string('source', 20).notNullable().defaultTo('grow'); // grow, icount, etc.

    // Processing status
    table.string('status', 20).notNullable().defaultTo('processing');
    // Status: processing, completed, failed

    // Result
    table.boolean('subscription_activated').defaultTo(false);
    table.jsonb('result').nullable();

    // Timestamps
    table.timestamp('received_at').defaultTo(knex.fn.now());
    table.timestamp('processed_at').nullable();

    // Index for quick lookup
    table.index('idempotency_key', 'idx_webhook_events_idempotency');
  });
};

exports.down = async function(knex) {
  // Drop tables in reverse order (respecting foreign keys)
  await knex.schema.dropTableIfExists('webhook_events');
  await knex.schema.dropTableIfExists('admin_alerts');
  await knex.schema.dropTableIfExists('installment_plans');
  await knex.schema.dropTableIfExists('payment_notifications');
  await knex.schema.dropTableIfExists('invoice_queue');
  await knex.schema.dropTableIfExists('icount_invoices');
  await knex.schema.dropTableIfExists('checkout_sessions');
  await knex.schema.dropTableIfExists('grow_transactions');

  // Remove columns from users table
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('payment_status');
    table.dropColumn('grace_period_start');
    table.dropColumn('grace_period_end');
    table.dropColumn('payment_failure_reason');
    table.dropColumn('icount_client_id');
    table.dropColumn('last_payment_method');
    table.dropColumn('last_card_suffix');
    table.dropColumn('last_card_brand');
    table.dropColumn('last_checkout_at');
    table.dropColumn('checkout_count_today');
  });
};
