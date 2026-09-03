import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// A localhost API URL is exactly right for `vite dev` (this repo's own
// .env sets it that way on purpose) but never correct for a built
// production bundle — src/utils/env.js's `VITE_API_URL || 'http://
// localhost:5000'` fallback exists so local dev never crashes over a
// missing var, but that same fallback silently means a `vite build` run
// without VITE_API_URL actually set for that build ships every visitor's
// browser a bundle that tries to call ITS OWN localhost. Vite bakes
// import.meta.env.VITE_API_URL into the bundle at build time, so this has
// to be caught here (in Node, before the bundle exists) — checking it
// inside application code would be too late; by then it's already been
// inlined into static assets served to real visitors.
function assertProductionApiUrl(mode) {
  const env = loadEnv(mode, process.cwd(), '');
  const apiUrl = env.VITE_API_URL;
  const looksLikeLocalhost = !apiUrl || /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/i.test(apiUrl);

  if (looksLikeLocalhost) {
    throw new Error(
      `Refusing to build: VITE_API_URL is ${apiUrl ? `set to "${apiUrl}"` : 'not set'} for mode "${mode}". ` +
        'Building without a real backend URL would ship every visitor a bundle pointing at localhost. ' +
        'Set VITE_API_URL via .env.production(.local) or your deploy platform\'s environment variables before building.'
    );
  }
}

export default defineConfig(({ command, mode }) => {
  if (command === 'build') {
    assertProductionApiUrl(mode);
  }

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    optimizeDeps: {
      include: ['i18next', 'react-i18next'],
    },
    build: {
      commonjsOptions: {
        transformMixedEsModules: true,
      },
    },
  };
});