import { defineConfig } from '@playwright/test';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const storageState = join(__dirname, 'tests-e2e', '.auth', 'user.json');

export default defineConfig({
  testDir: './tests-e2e',
  timeout: 180_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  workers: process.env.CI ? 2 : undefined,
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    headless: true,
    viewport: { width: 1280, height: 720 },
  },
  projects: [
    { name: 'setup', testMatch: '**/*.setup.js' },
    {
      name: 'chromium',
      testMatch: '**/*.spec.js',
      dependencies: ['setup'],
      use: { storageState },
    },
  ],
});
