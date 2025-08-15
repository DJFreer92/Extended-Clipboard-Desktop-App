import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [
      'src/**/*.{test,spec}.{ts,tsx}',
      'src/**/*_tests.{ts,tsx}',
    ],
    environment: 'jsdom',
    setupFiles: ['src/test.setup.ts'],
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
