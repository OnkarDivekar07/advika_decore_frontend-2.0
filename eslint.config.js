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
    // Test files run under Vitest's Node process, so Node globals (e.g.
    // Buffer, used by a couple of test-only base64 helpers) are genuinely
    // available even though the app code targets the browser.
    files: ['**/__tests__/**/*.{js,jsx}', 'src/test/**/*.{js,jsx}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },
])
