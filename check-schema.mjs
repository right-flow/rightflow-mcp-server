#!/usr/bin/env node
import dotenv from 'dotenv';
import pkg from 'pg';
const { Client } = pkg;
dotenv.config();

const client = new Client({ connectionString: process.env.DATABASE_URL });

async function checkSchema() {
  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Check forms table structure
    const formsSchema = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'forms'
      ORDER BY ordinal_position;
    `);

    console.log('📋 Forms table structure:');
    formsSchema.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(required)' : '(optional)'}`);
    });

    // Check if form_versions table exists
    const tablesQuery = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    console.log('\n📋 Existing tables:');
    tablesQuery.rows.forEach(t => console.log(`  - ${t.table_name}`));

    // Check if form_versions exists
    const hasVersions = tablesQuery.rows.some(t => t.table_name === 'form_versions');
    console.log(`\n${hasVersions ? '✅' : '❌'} form_versions table ${hasVersions ? 'exists' : 'does NOT exist'}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkSchema();
