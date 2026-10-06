import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    setupFiles: ['./tests/setup/vitest.setup.ts'],
    projects: [
      {
        name: 'unit',
        test: {
          environment: 'node',
          include: ['src/**/*.unit.test.{ts,tsx}'],
          exclude: ['src/**/*.integration.test.{ts,tsx}', 'tests/**'],
        },
      },
      {
        name: 'integration',
        test: {
          environment: 'happy-dom',
          include: ['src/**/*.integration.test.{ts,tsx}', 'tests/**/*.test.{ts,tsx}'],
          exclude: ['tests/e2e/**', 'node_modules/**'],
        },
      },
    ],
    coverage: {
      enabled: false,
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['src/**/index.ts', 'tests/**'],
    },
  },
});
