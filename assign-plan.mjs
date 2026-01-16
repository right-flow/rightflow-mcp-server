#!/usr/bin/env node
import dotenv from 'dotenv';
import pkg from 'pg';
const { Client } = pkg;
dotenv.config();

const client = new Client({ connectionString: process.env.DATABASE_URL });

async function assignPlan() {
  try {
    await client.connect();

    // Get the Test Plan (free tier)
    const plan = await client.query(
      "SELECT id FROM plans WHERE name = 'Test Plan' AND monthly_price_ils = 0 LIMIT 1"
    );

    if (plan.rows.length === 0) {
      console.log('❌ Test Plan not found');
      return;
    }

    const planId = plan.rows[0].id;

    // Update user with plan
    await client.query(
      "UPDATE users SET plan_id = $1 WHERE clerk_id = 'user_38KTfLeYa9UzUApugud4YQbEWA4'",
      [planId]
    );

    console.log('✅ Test Plan assigned to your user');
    console.log(`   Plan ID: ${planId}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

assignPlan();
