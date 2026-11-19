import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests against the web build (the same screens, data layer and
 * Skia editor as the iPhone app; native-only parts such as HealthKit,
 * Instagram and the photo picker are covered by the device checklist in
 * SETUP.md). `npm run build` first, then `npm run e2e`.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:8099',
    ...devices['iPhone 14'],
    defaultBrowserType: 'chromium',
    trace: 'off',
  },
  webServer: {
    command: 'npx serve@14 dist -l 8099 -n -s',
    url: 'http://localhost:8099',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
