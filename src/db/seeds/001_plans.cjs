/**
 * Seed Plans Data
 * Populates the plans table with RightFlow pricing tiers
 */

const crypto = require('crypto');

exports.seed = async function(knex) {
  // Clear existing plans
  await knex('plans').del();

  // Insert pricing tiers (prices in agorot: 1 ILS = 100 agorot)
  await knex('plans').insert([
    {
      id: crypto.randomUUID(),
      name: 'Free',
      grow_product_id: null,
      monthly_price_ils: 0,
      yearly_price_ils: 0,
      max_forms: 3,
      max_responses_monthly: 100,
      max_storage_mb: 100,
      features: JSON.stringify({
        email_notifications: false,
        webhooks: false,
        team_collaboration: false,
        api_access: false,
        custom_branding: false,
      }),
      is_active: true,
    },
    {
      id: crypto.randomUUID(),
      name: 'Starter',
      grow_product_id: 'prod_starter',  // Replace with actual Grow product ID
      monthly_price_ils: 4900,  // ₪49.00
      yearly_price_ils: 49000,  // ₪490.00
      max_forms: 10,
      max_responses_monthly: 1000,
      max_storage_mb: 1024,  // 1GB
      features: JSON.stringify({
        email_notifications: true,
        webhooks: false,
        team_collaboration: false,
        api_access: false,
        custom_branding: false,
      }),
      is_active: true,
    },
    {
      id: crypto.randomUUID(),
      name: 'Pro',
      grow_product_id: 'prod_pro',
      monthly_price_ils: 14900,  // ₪149.00
      yearly_price_ils: 149000,  // ₪1,490.00
      max_forms: 50,
      max_responses_monthly: 10000,
      max_storage_mb: 10240,  // 10GB
      features: JSON.stringify({
        email_notifications: true,
        webhooks: true,
        team_collaboration: true,
        api_access: true,
        custom_branding: false,
      }),
      is_active: true,
    },
    {
      id: crypto.randomUUID(),
      name: 'Business',
      grow_product_id: 'prod_business',
      monthly_price_ils: 34900,  // ₪349.00
      yearly_price_ils: 349000,  // ₪3,490.00
      max_forms: -1,  // Unlimited
      max_responses_monthly: 50000,
      max_storage_mb: 102400,  // 100GB
      features: JSON.stringify({
        email_notifications: true,
        webhooks: true,
        team_collaboration: true,
        api_access: true,
        custom_branding: true,
        priority_support: true,
        sla: true,
      }),
      is_active: true,
    },
  ]);
};
