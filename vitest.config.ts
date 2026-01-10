import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],

    // Include co-located tests and centralized tests, exclude E2E
    include: [
      '**/*.test.{ts,tsx}',
      '**/*.spec.{ts,tsx}',
    ],
    exclude: [
      'node_modules/**',
      'e2e/**',
      '.next/**',
    ],

    threads: true,
    maxThreads: 4,
    minThreads: 2,
    isolate: true,

    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',

      // What to measure - focus on services, hooks, components, lib
      include: [
        'features/**/services/**/*.ts',
        'features/**/hooks/**/*.ts',
        'features/**/components/**/*.tsx',
        'features/**/utils/**/*.ts',
        'lib/**/*.ts',
        'components/**/*.tsx',
      ],

      // Exclude from coverage
      exclude: [
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
        '**/types/**',
        '**/actions/**', // Server Actions tested via E2E
        '**/*.d.ts',
        '**/index.ts',
        'e2e/**',
        'node_modules/**',
      ],

      // Gradual thresholds - ratchet these up over time
      // Current baseline: ~3-5% (2025-01-09)
      // Ratchet up as service extraction progresses
      thresholds: {
        // Global baseline - start below current, increase as tests are added
        statements: 3,
        branches: 4,
        functions: 1,
        lines: 3,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
