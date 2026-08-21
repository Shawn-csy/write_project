import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  test: {
    pool: 'forks',
    maxWorkers: '50%',
    exclude: ['tests-e2e/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      all: true,
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.{test,spec}.{ts,tsx}', 'src/test/**', 'src/tests/**', 'src/main.tsx'],
    },
    projects: [
      // Main app + packages — @/ resolves to ./src
      {
        plugins: [react()],
        test: {
          name: 'main',
          include: ['src/**/*.{test,spec}.{ts,tsx}', 'packages/**/*.{test,spec}.{ts,tsx}'],
          environment: 'jsdom',
          globals: true,
          setupFiles: ['./src/test/setup.ts'],
        },
        resolve: {
          alias: {
            '@': path.resolve(__dirname, './src'),
          },
        },
      },
      // apps/public Next.js — @/ resolves to apps/public/
      {
        plugins: [react()],
        test: {
          name: 'public',
          include: ['apps/public/**/*.{test,spec}.{ts,tsx}'],
          environment: 'jsdom',
          globals: true,
          setupFiles: ['./src/test/setup.ts'],
        },
        resolve: {
          alias: {
            '@': path.resolve(__dirname, './apps/public'),
          },
        },
      },
    ],
  },
});
