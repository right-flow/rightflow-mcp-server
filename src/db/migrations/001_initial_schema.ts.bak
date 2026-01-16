/**
 * Initial Database Schema Migration
 * Creates foundational tables for RightFlow self-serve platform
 *
 * DocsFlow-ready: Includes tenant_type for future integration
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create users table
  await knex.schema.createTable('users', (table) => {
    table.uuid('id').primary();
    table.string('clerk_id', 255).unique().notNullable();
    table.string('email', 255).notNullable();
    table.string('tenant_type', 50).defaultTo('rightflow').notNullable();
    table.uuid('plan_id').nullable();
    table.string('grow_customer_id', 255).nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();
    table.timestamp('updated_at').nullable();
    table.timestamp('deleted_at').nullable();

    // Indexes
    table.index('clerk_id');
    table.index('email');
    table.index('tenant_type');
  });

  // Create plans table
  await knex.schema.createTable('plans', (table) => {
    table.uuid('id').primary();
    table.string('name', 100).notNullable();  // 'Free', 'Starter', 'Pro', 'Business'
    table.string('grow_product_id', 255).nullable();
    table.integer('monthly_price_ils').notNullable();  // Price in Israeli Shekels (agorot)
    table.integer('yearly_price_ils').nullable();
    table.integer('max_forms').notNullable();  // -1 for unlimited
    table.integer('max_responses_monthly').notNullable();
    table.integer('max_storage_mb').notNullable();
    table.jsonb('features').defaultTo('{}').notNullable();
    table.boolean('is_active').defaultTo(true).notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();

    // Indexes
    table.index('name');
    table.index('is_active');
  });

  // Create organizations table (for team features)
  await knex.schema.createTable('organizations', (table) => {
    table.uuid('id').primary();
    table.string('name', 255).notNullable();
    table.string('tenant_type', 50).defaultTo('rightflow').notNullable();
    table.uuid('owner_id').notNullable();
    table.jsonb('settings').defaultTo('{}').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();
    table.timestamp('updated_at').nullable();

    // Foreign keys
    table.foreign('owner_id').references('users.id');

    // Indexes
    table.index('owner_id');
    table.index('tenant_type');
  });

  // Create forms table
  await knex.schema.createTable('forms', (table) => {
    table.uuid('id').primary();
    table.uuid('user_id').notNullable();
    table.uuid('org_id').nullable();  // For team collaboration
    table.string('tenant_type', 50).defaultTo('rightflow').notNullable();
    table.string('slug', 255).unique().notNullable();
    table.string('title', 255).notNullable();
    table.text('description').nullable();
    table.string('status', 50).defaultTo('draft').notNullable();  // 'draft', 'published', 'archived'
    table.jsonb('fields').defaultTo('[]').notNullable();
    table.jsonb('stations').defaultTo('[]').notNullable();  // DocsFlow station support
    table.jsonb('settings').defaultTo('{}').notNullable();
    table.string('pdf_storage_path', 500).nullable();
    table.timestamp('published_at').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();
    table.timestamp('updated_at').nullable();
    table.timestamp('deleted_at').nullable();

    // Foreign keys
    table.foreign('user_id').references('users.id');
    table.foreign('org_id').references('organizations.id');

    // Indexes
    table.index('user_id');
    table.index('org_id');
    table.index('slug');
    table.index('status');
    table.index('tenant_type');
  });

  // Create responses table (form submissions)
  await knex.schema.createTable('responses', (table) => {
    table.uuid('id').primary();
    table.uuid('form_id').notNullable();
    table.jsonb('data').defaultTo('{}').notNullable();
    table.string('filled_pdf_path', 500).nullable();
    table.string('submitter_ip', 45).nullable();
    table.string('submitter_user_agent', 500).nullable();
    table.jsonb('metadata').defaultTo('{}').notNullable();
    table.timestamp('submitted_at').defaultTo(knex.fn.now()).notNullable();

    // Foreign keys
    table.foreign('form_id').references('forms.id');

    // Indexes
    table.index('form_id');
    table.index('submitted_at');
  });

  // Create usage_metrics table (for billing)
  await knex.schema.createTable('usage_metrics', (table) => {
    table.uuid('id').primary();
    table.uuid('user_id').notNullable();
    table.integer('forms_count').defaultTo(0).notNullable();
    table.integer('responses_count').defaultTo(0).notNullable();
    table.bigInteger('storage_used_bytes').defaultTo(0).notNullable();
    table.date('period_start').notNullable();
    table.date('period_end').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();
    table.timestamp('updated_at').nullable();

    // Foreign keys
    table.foreign('user_id').references('users.id');

    // Indexes
    table.index('user_id');
    table.index(['user_id', 'period_start', 'period_end']);
  });

  // Add foreign key constraint for plans
  await knex.schema.alterTable('users', (table) => {
    table.foreign('plan_id').references('plans.id');
  });
}

export async function down(knex: Knex): Promise<void> {
  // Drop tables in reverse order
  await knex.schema.dropTableIfExists('usage_metrics');
  await knex.schema.dropTableIfExists('responses');
  await knex.schema.dropTableIfExists('forms');
  await knex.schema.dropTableIfExists('organizations');
  await knex.schema.dropTableIfExists('users');
  await knex.schema.dropTableIfExists('plans');
}
