#!/usr/bin/env node
/**
 * Debug Form Creation Issue
 * Checks why form creation is failing with 400 error
 */

import dotenv from 'dotenv';
import pkg from 'pg';
const { Client } = pkg;

dotenv.config();

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function debug() {
  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Check 1: Do we have any users?
    console.log('📋 Checking users table...');
    const usersResult = await client.query('SELECT id, clerk_id, email, created_at FROM users ORDER BY created_at DESC LIMIT 5');

    if (usersResult.rows.length === 0) {
      console.log('❌ NO USERS FOUND in database!');
      console.log('\n🔧 This is the problem! The Clerk webhook hasn\'t created your user yet.\n');
      console.log('Solutions:');
      console.log('1. Sign out and sign in again (triggers Clerk webhook)');
      console.log('2. Manually create a test user (see instructions below)');
      console.log('3. Set up Clerk webhook endpoint\n');
    } else {
      console.log(`✅ Found ${usersResult.rows.length} user(s):\n`);
      usersResult.rows.forEach((user, index) => {
        console.log(`${index + 1}. ID: ${user.id}`);
        console.log(`   Clerk ID: ${user.clerk_id}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Created: ${user.created_at}`);
        console.log('');
      });
    }

    // Check 2: Do we have any plans?
    console.log('📋 Checking plans table...');
    const plansResult = await client.query('SELECT id, name, monthly_price_ils FROM plans WHERE is_active = true ORDER BY monthly_price_ils LIMIT 5');

    if (plansResult.rows.length === 0) {
      console.log('❌ NO PLANS FOUND! Need to run seed.');
      console.log('   Run: npm run db:seed\n');
    } else {
      console.log(`✅ Found ${plansResult.rows.length} plan(s):\n`);
      plansResult.rows.forEach((plan, index) => {
        console.log(`${index + 1}. ${plan.name}: ₪${plan.monthly_price_ils / 100}/month (ID: ${plan.id})`);
      });
      console.log('');
    }

    // Check 3: What's your current Clerk user?
    console.log('📋 To manually create a user for testing:\n');
    console.log('Run this in your browser console while signed in to Clerk:');
    console.log('```javascript');
    console.log('JSON.stringify({');
    console.log('  userId: window.Clerk?.user?.id,');
    console.log('  email: window.Clerk?.user?.primaryEmailAddress?.emailAddress');
    console.log('})');
    console.log('```\n');

    console.log('Then run this SQL (replace with your actual values):');
    console.log('```sql');
    console.log("INSERT INTO users (id, clerk_id, email, tenant_type)");
    console.log("VALUES (");
    console.log("  gen_random_uuid(),");
    console.log("  'YOUR_CLERK_USER_ID_HERE',");
    console.log("  'your-email@example.com',");
    console.log("  'rightflow'");
    console.log(");");
    console.log('```\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

debug();
