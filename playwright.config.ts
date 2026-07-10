import { defineConfig, devices } from '@playwright/test';

const sharedUse = {
  baseURL: 'http://localhost:5173',
  trace: 'on-first-retry' as const,
};

const mobileChrome = {
  ...devices['Desktop Chrome'],
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
};

const tabletChrome = {
  ...devices['Desktop Chrome'],
  viewport: { width: 768, height: 1024 },
  isMobile: true,
  hasTouch: true,
};

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  snapshotPathTemplate: '{testDir}/{testFileDir}/{testFileName}-snapshots/{projectName}/{arg}{ext}',
  use: sharedUse,
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5173',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    env: {
      VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL ?? 'https://auth.test.invalid',
      VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY ?? 'test-anon-key',
      // Hide DEV-only Settings preview controls so e2e/visual stay stable.
      VITE_E2E: 'true',
    },
  },
  projects: [
    {
      name: 'desktop',
      testIgnore: ['**/visual/**', '**/overflow-audit.spec.ts', '**/overlay-scroll.spec.ts', '**/pwa-update.spec.ts'],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile',
      testMatch: ['**/overlay-scroll.spec.ts'],
      use: mobileChrome,
    },
    {
      name: 'pwa',
      testMatch: ['**/pwa-update.spec.ts'],
      fullyParallel: false,
      use: {
        ...devices['Desktop Chrome'],
        serviceWorkers: 'allow',
      },
    },
    {
      name: 'audit',
      testMatch: ['**/overflow-audit.spec.ts'],
      use: mobileChrome,
    },
    {
      name: 'visual-mobile',
      testDir: './e2e/visual',
      use: mobileChrome,
    },
    {
      name: 'visual-tablet',
      testDir: './e2e/visual',
      use: tabletChrome,
    },
    {
      name: 'visual-desktop',
      testDir: './e2e/visual',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
