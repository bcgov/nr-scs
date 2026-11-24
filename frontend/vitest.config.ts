import path from 'node:path';

import react from '@vitejs/plugin-react';
import { loadEnv } from 'vite';
import { configDefaults, defineConfig } from 'vitest/config';

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
    environment: 'happy-dom',
    globalSetup: ['./src/config/tests/apiManifest.globalSetup.ts'],
    setupFiles: [
      './src/config/tests/setup-env.ts',
      './src/config/tests/custom-matchers.ts',
    ],
    include: ['src/**/*.unit.test.{ts,tsx}'],
    // The full suite runs many page renders in parallel; a page that loads promptly on its own can
    // take several seconds under that contention. Every entry point (test, test:ci, IDE) inherits this.
    testTimeout: 45000,
    hookTimeout: 45000,
    exclude: [...configDefaults.exclude, 'dist/**', 'build/**'],
    coverage: {
      provider: 'v8',
      reporter: ['lcov', 'cobertura', 'html', 'json', 'text'],
      reportsDirectory: './coverage',
      all: true,
      exclude: [
        '**/node_modules/**',
        '**/tests/**',
        '**/*.test.{ts,tsx}',
        '**/vite-env.d.ts',
        '**/types/**',
        '**/constants/**',
        '**/config/fam/*',
        '**/config/react-query/*',
        '**/config/tests/*',
        'src/env.ts',
        '**/*.types.ts',
        '**/*.scss',
        '**/*.css',
        '**/*.d.ts',
        '**/types.ts',
        '**/main.tsx',
        '**/App.tsx',
      ],
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      // Vitest 4 reads thresholds from here, not from `coverage` itself. Set just under the
      // measured figures (lines ~89, statements ~88, branches ~80, functions ~80): close enough
      // that a real regression fails CI, with a point or two for run-to-run noise.
      thresholds: {
        lines: 87,
        statements: 87,
        branches: 78,
        functions: 78,
      },
    },
  },
}));