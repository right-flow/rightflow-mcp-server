/**
 * Migration: Add Clerk Organizations Support
 * Adds support for Clerk Organizations including org members tracking
 *
 * Changes:
 * 1. Adds clerk_org_id and clerk_slug to organizations table
 * 2. Creates organization_members table for tracking memberships
 */

exports.up = async function(knex) {
  // 1. Add Clerk organization fields to existing organizations table
  await knex.schema.alterTable('organizations', (table) => {
    table.string('clerk_org_id', 255).unique().nullable();
    table.string('clerk_slug', 255).unique().nullable();
    table.timestamp('deleted_at').nullable(); // For soft delete

    // Add indexes for Clerk organization lookups
    table.index('clerk_org_id', 'idx_organizations_clerk_org_id');
    table.index('clerk_slug', 'idx_organizations_clerk_slug');
    table.index('deleted_at', 'idx_organizations_deleted_at');
  });

  // 2. Create organization_members table
  await knex.schema.createTable('organization_members', (table) => {
    table.uuid('id').primary();
    table.uuid('org_id').notNullable();
    table.uuid('user_id').notNullable();
    table.string('clerk_membership_id', 255).unique().notNullable();
    table.string('role', 50).notNullable(); // 'admin', 'member', 'viewer'
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();
    table.timestamp('updated_at').nullable();

    // Foreign keys
    table.foreign('org_id').references('organizations.id').onDelete('CASCADE');
    table.foreign('user_id').references('users.id').onDelete('CASCADE');

    // Unique constraint: one membership per user per org
    table.unique(['org_id', 'user_id'], 'uq_org_user_membership');

    // Indexes for efficient lookups
    table.index('org_id', 'idx_org_members_org_id');
    table.index('user_id', 'idx_org_members_user_id');
    table.index('clerk_membership_id', 'idx_org_members_clerk_membership_id');
    table.index('role', 'idx_org_members_role');
  });
};

exports.down = async function(knex) {
  // Drop in reverse order
  await knex.schema.dropTableIfExists('organization_members');

  // Remove Clerk fields from organizations table
  await knex.schema.alterTable('organizations', (table) => {
    table.dropIndex('clerk_org_id', 'idx_organizations_clerk_org_id');
    table.dropIndex('clerk_slug', 'idx_organizations_clerk_slug');
    table.dropIndex('deleted_at', 'idx_organizations_deleted_at');
    table.dropColumn('clerk_org_id');
    table.dropColumn('clerk_slug');
    table.dropColumn('deleted_at');
  });
};
