import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
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
});