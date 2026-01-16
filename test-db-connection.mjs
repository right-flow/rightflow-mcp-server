#!/usr/bin/env node
import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

try {
  await client.connect();
  console.log('✅ Database connection successful!');

  const plansResult = await client.query('SELECT * FROM plans');
  console.log(`\n📋 Plans in database: ${plansResult.rows.length}`);
  plansResult.rows.forEach(plan => {
    console.log(`   - ${plan.name}: ₪${plan.monthly_price_ils / 100}/month`);
  });

  const usersResult = await client.query('SELECT COUNT(*) as count FROM users');
  console.log(`\n👥 Users in database: ${usersResult.rows[0].count}`);

  const formsResult = await client.query('SELECT COUNT(*) as count FROM forms');
  console.log(`📝 Forms in database: ${formsResult.rows[0].count}`);

  console.log('\n✅ Local PostgreSQL database is working correctly!');
  console.log('\n🎯 Next step: Restart your dev server and try creating a form.');

} catch (err) {
  console.error('❌ Database error:', err.message);
  process.exit(1);
} finally {
  await client.end();
}
