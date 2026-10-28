import { defineConfig } from 'vitest/config';

// In CI, the database is a throwaway container, so keep the DATABASE_URL GitHub provides.
// Locally, redirect tests to a separate test database so development data is never wiped.
const localTestDb = 'postgresql://postgres:root@localhost:5432/neostats_test?schema=public';

export default defineConfig({
  test: {
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: process.env.CI ? process.env.DATABASE_URL! : localTestDb,
    },
  },
});