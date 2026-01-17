#!/usr/bin/env node
/**
 * Script to update form titles from "Untitled Form" to proper names
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function fixFormTitles() {
  try {
    console.log('🔍 Looking for forms with "Untitled Form" title...\n');

    // Get all untitled forms
    const result = await pool.query(
      `SELECT id, title, created_at, fields
       FROM forms
       WHERE title = 'Untitled Form'
       ORDER BY created_at DESC`
    );

    if (result.rows.length === 0) {
      console.log('✅ No untitled forms found! All forms have proper titles.');
      await pool.end();
      return;
    }

    console.log(`Found ${result.rows.length} untitled forms:\n`);

    for (let i = 0; i < result.rows.length; i++) {
      const form = result.rows[i];
      const newTitle = `טופס ${i + 1}`;
      const date = new Date(form.created_at).toLocaleDateString('he-IL');

      console.log(`  ${i + 1}. Form ID: ${form.id}`);
      console.log(`     Created: ${date}`);
      console.log(`     Fields: ${form.fields.length}`);
      console.log(`     New Title: "${newTitle}"\n`);

      // Update the title
      await pool.query(
        'UPDATE forms SET title = $1 WHERE id = $2',
        [newTitle, form.id]
      );
    }

    console.log(`✅ Updated ${result.rows.length} form titles!`);
    console.log('\n📋 Summary:');
    console.log(`   - Changed from: "Untitled Form"`);
    console.log(`   - Changed to: "טופס 1", "טופס 2", etc.`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

fixFormTitles();
