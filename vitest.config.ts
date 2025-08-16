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
        '**/*.old.{ts,tsx}',
        'src/renderer/index.tsx',
        'src/services/index.ts',
        '**/types.ts',
      ],
      thresholds: {
        lines: 85,
        functions: 85,
        statements: 85,
        branches: 85,
      },
    },
  },
});
