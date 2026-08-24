// playwright.config.js
//
// Browser E2E tests for the storefront. Runs against a real Vite dev
// server (real routing, real React tree, real CSS, real client-side
// business logic). The backend network boundary is intercepted per-test
// via page.route() with fixtures that mirror the actual backend response
// contracts documented in e2e/fixtures — see e2e/README.md for why.
import { defineConfig, devices } from '@playwright/test';
import fs from 'fs';

// Only used in the sandboxed environment this suite was originally
// authored in, where browsers ship pre-installed at this fixed path and
// `npx playwright install` isn't available. On a normal machine (where
// you've run `npx playwright install chromium`), this path won't exist
// and Playwright falls back to its own default browser resolution —
// don't hardcode a path here, or every other machine breaks.
const SANDBOX_CHROMIUM_PATH = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const sandboxExecutablePath = fs.existsSync(SANDBOX_CHROMIUM_PATH) ? SANDBOX_CHROMIUM_PATH : undefined;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  timeout: 30000,
  expect: { timeout: 5000 },
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        ...(sandboxExecutablePath && { launchOptions: { executablePath: sandboxExecutablePath } }),
      },
    },
  ],
  webServer: process.env.E2E_NO_WEBSERVER
    ? undefined
    : {
        command: 'npm run dev -- --port 5173 --strictPort',
        url: 'http://localhost:5173',
        reuseExistingServer: !process.env.CI,
        timeout: 60000,
      },
});
