/**
 * Knex Configuration File (JavaScript version for migrations)
 * Database migrations and seeds configuration
 *
 * Aligned with DocsFlow backend patterns
 */

require('dotenv').config();

module.exports = {
  development: {
    client: 'pg',
    connection: process.env.DATABASE_URL || {
      host: 'localhost',
      port: 5432,
      user: 'postgres',
      password: 'postgres',
      database: 'rightflow_dev',
    },
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      directory: './src/db/migrations',
      extension: 'cjs',
      tableName: 'knex_migrations',
    },
    seeds: {
      directory: './src/db/seeds',
    },
  },

  staging: {
    client: 'pg',
    connection: process.env.DATABASE_URL,
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      directory: './src/db/migrations',
      extension: 'cjs',
      tableName: 'knex_migrations',
    },
  },

  production: {
    client: 'pg',
    connection: process.env.DATABASE_URL,
    pool: {
      min: 2,
      max: 20,
    },
    migrations: {
      directory: './src/db/migrations',
      extension: 'cjs',
      tableName: 'knex_migrations',
    },
  },

  test: {
    client: 'pg',
    connection: process.env.DATABASE_URL || {
      host: 'localhost',
      port: 5432,
      user: 'postgres',
      password: 'postgres',
      database: 'rightflow_test',
    },
    pool: {
      min: 1,
      max: 5,
    },
    migrations: {
      directory: './src/db/migrations',
      extension: 'cjs',
      tableName: 'knex_migrations',
    },
  },
};
