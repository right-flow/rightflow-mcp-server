/**
 * Access Control Database Schema Migration
 * Creates tables for plans, subscriptions, and usage metrics
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Plans table
  await knex.schema.createTable('plans', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name').notNullable();
    table.string('tier').notNullable(); // 'free', 'pro', 'enterprise'
    table.decimal('price_monthly', 10, 2);
    table.decimal('price_yearly', 10, 2);
    table.jsonb('features').notNullable();
    table.jsonb('limits').notNullable();
    table.boolean('active').defaultTo(true);
    table.timestamps(true, true);
  });

  // Subscriptions table
  await knex.schema.createTable('subscriptions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users');
    table.uuid('plan_id').notNullable().references('id').inTable('plans');
    table.string('status').notNullable(); // 'active', 'cancelled', 'expired'
    table.string('billing_cycle').notNullable(); // 'monthly', 'yearly'
    table.timestamp('current_period_start');
    table.timestamp('current_period_end');
    table.timestamp('trial_ends_at');
    table.string('external_subscription_id'); // Grow subscription ID
    table.timestamps(true, true);
  });

  // Usage metrics table
  await knex.schema.createTable('usage_metrics', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users');
    table.string('metric_type').notNullable(); // 'forms_count', 'api_calls', etc.
    table.integer('count').defaultTo(0);
    table.date('period').notNullable(); // YYYY-MM-DD for monthly tracking
    table.timestamps(true, true);

    table.unique(['user_id', 'metric_type', 'period']);
  });

  // Insert default plans
  await knex('plans').insert([
    {
      name: 'Free',
      tier: 'free',
      price_monthly: 0,
      price_yearly: 0,
      features: JSON.stringify(['basic_editor', 'form_creation', 'pdf_viewing']),
      limits: JSON.stringify({
        forms_count: 10,
        fields_per_form: 20,
        monthly_submissions: 100,
        storage_mb: 50,
        api_calls_per_hour: 10,
      }),
      active: true,
    },
    {
      name: 'Pro',
      tier: 'pro',
      price_monthly: 29,
      price_yearly: 290,
      features: JSON.stringify([
        'basic_editor',
        'form_creation',
        'pdf_viewing',
        'ai_extraction',
        'advanced_workflow',
        'custom_templates',
      ]),
      limits: JSON.stringify({
        forms_count: -1, // unlimited
        fields_per_form: -1,
        monthly_submissions: -1,
        storage_mb: 5000,
        api_calls_per_hour: 1000,
      }),
      active: true,
    },
  ]);
}

export async function down(knex: Knex): Promise<void> {
  // Drop tables in reverse dependency order
  await knex.schema.dropTableIfExists('usage_metrics');
  await knex.schema.dropTableIfExists('subscriptions');
  await knex.schema.dropTableIfExists('plans');
}
