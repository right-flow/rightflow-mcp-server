/**
 * Create Test Database Script
 * Creates the rightflow_test database for testing
 */

const { Client } = require('pg');

async function createDatabase() {
  // Connect to default postgres database first
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'postgres', // Connect to default database
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL');

    // Check if database exists
    const result = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = 'rightflow_test'"
    );

    if (result.rows.length === 0) {
      // Database doesn't exist, create it
      await client.query('CREATE DATABASE rightflow_test');
      console.log('✓ Database "rightflow_test" created successfully');
    } else {
      console.log('✓ Database "rightflow_test" already exists');
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

createDatabase();
