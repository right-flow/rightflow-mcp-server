#!/usr/bin/env node
/**
 * Create User in Database
 * Adds a Clerk user to the RightFlow database
 */

import dotenv from 'dotenv';
import pkg from 'pg';
import crypto from 'crypto';
import readline from 'readline';

const { Client } = pkg;
dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function createUser() {
  console.log('\n🔧 RightFlow User Creation Tool\n');
  console.log('This will add your Clerk user to the RightFlow database.\n');

  // Get Clerk user ID
  const clerkId = await question('Enter your Clerk User ID (from browser console): ');
  if (!clerkId || !clerkId.startsWith('user_')) {
    console.error('❌ Invalid Clerk ID. Must start with "user_"');
    rl.close();
    return;
  }

  // Get email
  const email = await question('Enter your email: ');
  if (!email || !email.includes('@')) {
    console.error('❌ Invalid email address');
    rl.close();
    return;
  }

  rl.close();

  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('\n✅ Connected to database');

    // Check if user already exists
    const existingUser = await client.query(
      'SELECT id FROM users WHERE clerk_id = $1',
      [clerkId]
    );

    if (existingUser.rows.length > 0) {
      console.log('⚠️  User already exists with this Clerk ID!');
      console.log(`   User ID: ${existingUser.rows[0].id}`);
      return;
    }

    // Get the Free plan ID
    const freePlan = await client.query(
      "SELECT id FROM plans WHERE name = 'Free' AND is_active = true LIMIT 1"
    );

    const planId = freePlan.rows.length > 0 ? freePlan.rows[0].id : null;

    if (!planId) {
      console.log('⚠️  Warning: No Free plan found. User will be created without a plan.');
    }

    // Create new user
    const userId = crypto.randomUUID();
    await client.query(
      `INSERT INTO users (id, clerk_id, email, tenant_type, plan_id, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [userId, clerkId, email, 'rightflow', planId]
    );

    console.log('\n✅ User created successfully!');
    console.log(`   User ID: ${userId}`);
    console.log(`   Clerk ID: ${clerkId}`);
    console.log(`   Email: ${email}`);
    console.log(`   Plan: ${planId ? 'Free' : 'None'}`);
    console.log(`   Tenant: rightflow`);
    console.log('\n🎉 You can now create forms!');
    console.log('   Refresh your dashboard and try clicking "New Form +" again.\n');

  } catch (error) {
    console.error('\n❌ Error creating user:', error.message);
    if (error.code === '23505') {
      console.error('   This user already exists (duplicate key)');
    }
  } finally {
    await client.end();
  }
}

createUser();
