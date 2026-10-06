import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    setupFiles: ['./tests/setup/vitest.setup.ts'],
    projects: [
      {
        test: {
          name: 'unit',
          environment: 'node',
          include: ['src/**/*.unit.test.{ts,tsx}'],
          exclude: ['src/**/*.integration.test.{ts,tsx}', 'tests/**'],
        },
      },
      {
        test: {
          name: 'integration',
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
