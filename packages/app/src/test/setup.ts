import '@testing-library/jest-dom';

// Set test database URL before running any tests
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/rightflow_test';
}
