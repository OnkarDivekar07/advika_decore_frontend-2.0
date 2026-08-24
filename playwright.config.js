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

// --- Real full-stack E2E project ---------------------------------------
// A second, fully separate project (own testDir, own dev server port, own
// webServer) alongside the existing mocked "chromium" project above — that
// project and every spec under e2e/ are UNCHANGED. This one (testDir
// e2e-real/) runs against a real Vite dev server on a different port
// (5174, so it can run alongside the mocked dev server on 5173 without
// colliding) talking to the REAL backend (see backend 2.0/.env.e2e +
// `npm run e2e:server`, started separately — not spawned by this config,
// since it also needs the mock MSG91/Ekart servers and a seeded database
// up first). No page.route() interception happens anywhere under
// e2e-real/ — see e2e-real/support/realApi.js.
const E2E_REAL_PORT = 5174;

export default defineConfig({
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  timeout: 30000,
  expect: { timeout: 5000 },
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  // `webServer` is a top-level-only config option (a single object or
  // array) — Playwright does NOT read a `webServer` key nested inside an
  // individual `projects[]` entry (it's silently ignored, which is why an
  // earlier version of this config that put it there never actually
  // started either dev server). An array here starts both regardless of
  // which project you run with `--project=`; each one no-ops instantly via
  // reuseExistingServer if its own port is already up.
  // Running BOTH Vite dev servers at once (mocked + real) was observed to
  // exhaust memory on a constrained machine (esbuild's dependency
  // pre-bundling service OOM-crashed) — E2E_REAL_ONLY=1 skips starting the
  // mocked project's own dev server when you only intend to run
  // `--project=frontend-real` (see E2E_REAL_README.md).
  webServer: process.env.E2E_NO_WEBSERVER
    ? undefined
    : [
        ...(process.env.E2E_REAL_ONLY
          ? []
          : [
              {
                command: 'npm run dev -- --port 5173 --strictPort',
                url: 'http://localhost:5173',
                reuseExistingServer: !process.env.CI,
                timeout: 60000,
              },
            ]),
        {
          // `--mode e2e` makes Vite load .env.e2e (VITE_API_URL=
          // http://localhost:5001, pointing at the real E2E backend — see
          // that file) instead of the regular .env — Vite only ever
          // exposes VITE_-prefixed vars to client code via its own
          // .env.[mode] file loading, not via arbitrary process env
          // passthrough, so this is the reliable way to point the real dev
          // server at the real E2E backend.
          // --host binds Vite to all interfaces (0.0.0.0), not just IPv6
          // loopback — on this machine, Vite's default (no --host) bound
          // only [::1], while Playwright's own health-check/Node fetch
          // resolved "localhost" to 127.0.0.1 and saw ECONNREFUSED even
          // though the server was genuinely up. Confirmed by reproducing
          // manually (netstat showed only [::1]:5174 listening).
          command: `npm run dev -- --port ${E2E_REAL_PORT} --mode e2e --strictPort --host`,
          url: `http://localhost:${E2E_REAL_PORT}`,
          reuseExistingServer: !process.env.CI,
          timeout: 60000,
        },
      ],
  projects: [
    {
      name: 'chromium',
      testDir: './e2e',
      workers: process.env.CI ? 2 : undefined,
      use: {
        baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',
        ...devices['Desktop Chrome'],
        ...(sandboxExecutablePath && { launchOptions: { executablePath: sandboxExecutablePath } }),
      },
    },
    {
      name: 'frontend-real',
      testDir: './e2e-real',
      workers: 1,
      timeout: 60000,
      use: {
        baseURL: process.env.E2E_REAL_BASE_URL || `http://localhost:${E2E_REAL_PORT}`,
        ...devices['Desktop Chrome'],
        ...(sandboxExecutablePath && { launchOptions: { executablePath: sandboxExecutablePath } }),
      },
    },
  ],
});
