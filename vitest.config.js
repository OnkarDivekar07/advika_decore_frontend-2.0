import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

const rootDir = import.meta.dirname ?? path.dirname(new URL(import.meta.url).pathname);

// Separate from vite.config.js (build config) so test-only settings never
// leak into the production build config, and vice versa. Shares the same
// '@' alias as the app itself so test files can import modules exactly the
// way application code does.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(rootDir, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    css: false,
    restoreMocks: true,
    // Vitest's default include glob (**/*.{test,spec}.*) would otherwise
    // also pick up e2e/**/*.spec.js — Playwright test files, not Vitest
    // ones, which fail immediately outside a Playwright runner ("did not
    // expect test.describe() to be called here"). Excluded rather than
    // renamed so both suites keep their respective tools' natural
    // filename convention (Playwright's own default is *.spec.js).
    // e2e-real/**/*.spec.js (the real full-stack Playwright layer, added
    // later) needs the same exclusion — missing it here was an oversight
    // when that directory was created; caught the hard way via `npm test`
    // reporting spurious failures for files that were never Vitest tests
    // in the first place.
    exclude: ['**/node_modules/**', 'e2e/**', 'e2e-real/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{js,jsx}'],
      exclude: [
        'src/**/*.test.{js,jsx}',
        'src/test/**',
        'src/main.jsx',
        'src/**/*.d.ts',
      ],
    },
  },
});
