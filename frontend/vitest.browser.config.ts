import path from 'node:path';

import react from '@vitejs/plugin-react';
import { loadEnv } from 'vite';
import { configDefaults, defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';

export default defineConfig(({ mode }) => ({
  define: {
    global: {},
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  test: {
    env: loadEnv(mode, process.cwd(), ''),
    globals: true,
    // Vitest 5 moved this off `browser`; `browser.api` is deprecated.
    api: { port: 3315 },
    setupFiles: [
      './src/config/tests/setup-browser.ts',
      './src/config/tests/custom-matchers.ts',
    ],
    include: ['src/**/*.browser.test.{ts,tsx}'],
    exclude: [...configDefaults.exclude, 'dist/**', 'build/**'],
    browser: {
      enabled: true,
      provider: playwright(),
      instances: [{ browser: 'chromium' }],
    },
  },
}));