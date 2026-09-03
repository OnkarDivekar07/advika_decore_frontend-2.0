import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    ignores: ['*.config.js', '*.config.cjs'],
    extends: [
      js.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },
  {
    // CommonJS build-tool configs (tailwind, postcss) run in Node.
    files: ['tailwind.config.js', '*.config.cjs'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.node,
      sourceType: 'commonjs',
    },
  },
  {
    // vite.config.js is ESM but Vite injects __dirname/__filename when it
    // bundles this file, so it's valid at runtime despite not being a
    // standard ESM global.
    files: ['vite.config.js'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.node,
      sourceType: 'module',
    },
  },
  {
    // Vitest runs test files under Node, not just jsdom's simulated browser
    // globals — a couple of JWT/token-decoding tests use `Buffer` directly.
    // Extends (rather than replaces) the browser globals above, since these
    // files also use `window`/`localStorage`/etc via jsdom.
    files: ['**/*.test.{js,jsx}', '**/__tests__/**/*.{js,jsx}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },
  {
    // Playwright specs/support files (e2e/, e2e-real/) run under Node via
    // the Playwright test runner, not jsdom — same reasoning as the Vitest
    // override above (process.env for reading .env.e2e config, Buffer for
    // fixture bytes), plus these files also drive a real browser page via
    // page.route()/page.goto(), hence keeping the browser globals too.
    files: ['e2e/**/*.js', 'e2e-real/**/*.js'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },
])
