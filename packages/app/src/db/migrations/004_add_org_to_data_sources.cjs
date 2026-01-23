/**
 * Migration: Add Organization Support to Data Sources
 * Allows data sources to be owned by organizations (not just users)
 *
 * Changes:
 * 1. Adds org_id to data_sources table
 * 2. Makes org_id and user_id work together (org XOR user ownership)
 */

exports.up = async function(knex) {
  // Add org_id to data_sources table
  await knex.schema.alterTable('data_sources', (table) => {
    table.uuid('org_id').nullable();

    // Foreign key to organizations
    table.foreign('org_id').references('organizations.id').onDelete('CASCADE');

    // Index for org-based queries
    table.index('org_id', 'idx_data_sources_org_id');
  });

  // Note: We don't add a constraint that org_id and user_id are mutually exclusive
  // because a data source could theoretically be personal but later transferred to an org.
  // The application logic will handle the semantics:
  // - If org_id is set: data source belongs to org
  // - If org_id is null: data source belongs to user (personal)
};

exports.down = async function(knex) {
  // Remove org_id from data_sources
  await knex.schema.alterTable('data_sources', (table) => {
    table.dropForeign('org_id');
    table.dropIndex('org_id', 'idx_data_sources_org_id');
    table.dropColumn('org_id');
  });
};
