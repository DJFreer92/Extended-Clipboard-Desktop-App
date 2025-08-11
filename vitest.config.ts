import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [
      'tests/**/*.test.{ts,tsx}',
      'tests/**/*_tests.{ts,tsx}',
      'tests/**/*.spec.{ts,tsx}',
      'tests/**/*.{test,spec}.ts',
      'tests/**/*.{test,spec}.tsx',
    ],
    environment: 'jsdom',
    setupFiles: ['tests/test.setup.ts'],
    css: false,
  globals: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      reportsDirectory: 'coverage',
      all: true,
      include: [
        'src/services/**/*.{ts,tsx}',
        'src/models/**/*.{ts,tsx}',
        'src/renderer/**/*.{ts,tsx}',
      ],
      exclude: [
        'src/main/**',
        '**/*.d.ts',
        'src/renderer/styles/**',
      ],
      thresholds: {
        lines: 100,
        functions: 100,
        statements: 100,
        branches: 100,
      },
    },
  },
});
