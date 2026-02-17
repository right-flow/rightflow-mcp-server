/**
 * Migration: Add Pending Credit Days Column
 * Stores credit days for mid-period upgrades
 *
 * When a user upgrades mid-period, we calculate the remaining days
 * from their current subscription and store them here. When payment
 * is confirmed, we add these days to their new subscription period.
 */

exports.up = async function(knex) {
  await knex.schema.alterTable('users', (table) => {
    // Credit days to apply when upgrade payment is confirmed
    // Set during checkout, applied during payment confirmation
    table.integer('pending_credit_days').nullable().defaultTo(0);
  });
};

exports.down = async function(knex) {
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('pending_credit_days');
  });
};
