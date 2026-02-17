/**
 * Migration: Add Grow Payment Billing Columns
 * Adds columns to users table for Grow payment integration
 *
 * Changes:
 * 1. Add pending checkout tracking columns
 * 2. Add subscription date tracking columns
 * 3. Add billing period column
 */

exports.up = async function(knex) {
  // Add billing columns to users table
  await knex.schema.alterTable('users', (table) => {
    // Pending checkout tracking (set when user initiates checkout)
    table.uuid('pending_plan_id').nullable();
    table.string('pending_billing_period', 20).nullable(); // 'monthly' or 'yearly'
    table.timestamp('checkout_initiated_at').nullable();

    // Subscription date tracking
    table.timestamp('subscription_start_date').nullable();
    table.timestamp('subscription_end_date').nullable();
    table.timestamp('subscription_canceled_at').nullable();

    // Current billing period
    table.string('billing_period', 20).nullable(); // 'monthly' or 'yearly'

    // Foreign key for pending plan
    table.foreign('pending_plan_id').references('plans.id').onDelete('SET NULL');
  });
};

exports.down = async function(knex) {
  // Remove billing columns from users table
  await knex.schema.alterTable('users', (table) => {
    table.dropForeign('pending_plan_id');
    table.dropColumn('pending_plan_id');
    table.dropColumn('pending_billing_period');
    table.dropColumn('checkout_initiated_at');
    table.dropColumn('subscription_start_date');
    table.dropColumn('subscription_end_date');
    table.dropColumn('subscription_canceled_at');
    table.dropColumn('billing_period');
  });
};
