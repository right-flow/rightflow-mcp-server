/**
 * Data Sources Table Migration
 * Creates data_sources table for Dynamic Dropdown Fields feature
 *
 * Supports multiple source types:
 * - table: Direct database table reference
 * - custom_query: Custom SQL queries with parameters
 * - static: Hardcoded key-value pairs
 * - csv_import: Uploaded CSV file (v1.0)
 * - json_import: Uploaded JSON file (v1.0)
 * - webhook: External CRM integration via webhooks (v1.5 future)
 * - api: Direct API integration (v1.5 future)
 */

exports.up = async function(knex) {
  await knex.schema.createTable('data_sources', (table) => {
    // Primary key
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Multi-tenant isolation
    table.uuid('user_id').notNullable();

    // Data source configuration
    table.string('name', 255).notNullable();
    table.string('description', 500).nullable();
    table.string('source_type', 50).notNullable();

    // Configuration stored as JSONB
    // For 'table': { table_name: string, label_column: string, value_column: string, filter?: string }
    // For 'custom_query': { query: string, params?: object }
    // For 'static': { options: Array<{label: string, value: string}> }
    // For 'csv_import': { file_path: string, file_size: number, row_count: number }
    // For 'json_import': { file_path: string, file_size: number, item_count: number }
    // For 'webhook': { endpoint_url: string, secret: string, cache_ttl: number } (future v1.5)
    // For 'api': { api_url: string, headers: object, transform_script?: string } (future v1.5)
    table.jsonb('config').defaultTo('{}').notNullable();

    // Caching configuration
    table.integer('cache_ttl').defaultTo(3600).notNullable(); // TTL in seconds, default 1 hour

    // Status
    table.boolean('is_active').defaultTo(true).notNullable();

    // Audit timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();
    table.timestamp('updated_at').nullable();
    table.timestamp('deleted_at').nullable();

    // Foreign keys
    table.foreign('user_id').references('users.id').onDelete('CASCADE');

    // Indexes for performance
    table.index('user_id');
    table.index('source_type');
    table.index('is_active');
    table.index(['user_id', 'is_active']); // Composite index for common queries
    table.index('deleted_at'); // For soft delete queries
  });

  // Add check constraint for valid source types
  await knex.raw(`
    ALTER TABLE data_sources
    ADD CONSTRAINT check_source_type
    CHECK (source_type IN ('table', 'custom_query', 'static', 'csv_import', 'json_import', 'webhook', 'api'))
  `);
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('data_sources');
};
