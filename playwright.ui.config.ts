import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  workers: 1,
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:4173' },
  projects: [{ name: 'mock-chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run preview --workspace=frontend -- --host 127.0.0.1',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
