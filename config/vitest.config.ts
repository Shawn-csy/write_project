import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

const repoRoot = path.resolve(__dirname, "..");

export default defineConfig({
  root: repoRoot,
  test: {
    pool: 'forks',
    maxWorkers: '50%',
    exclude: ['tests-e2e/**', 'node_modules/**', 'apps/public/.pages-build/**'],
    coverage: {
      provider: 'v8',
      all: true,
      include: ['apps/studio/src/**/*.{ts,tsx}'],
      exclude: ['apps/studio/src/**/*.{test,spec}.{ts,tsx}', 'apps/studio/src/test/**', 'apps/studio/src/tests/**', 'apps/studio/src/main.tsx'],
    },
    projects: [
      // Main app + packages — @/ resolves to ./src
      {
        plugins: [react()],
        test: {
          name: 'main',
          include: ['apps/studio/src/**/*.{test,spec}.{ts,tsx}', 'packages/**/*.{test,spec}.{ts,tsx}'],
          environment: 'jsdom',
          globals: true,
          setupFiles: ['./apps/studio/src/test/setup.ts'],
        },
        resolve: {
          alias: {
            '@': path.join(repoRoot, 'apps/studio/src'),
          },
        },
      },
      // apps/public Next.js — @/ resolves to apps/public/
      {
        plugins: [react()],
        test: {
          name: 'public',
          include: ['apps/public/**/*.{test,spec}.{ts,tsx}'],
          exclude: ['apps/public/.pages-build/**', 'apps/public/node_modules/**'],
          environment: 'jsdom',
          globals: true,
          setupFiles: ['./apps/studio/src/test/setup.ts'],
        },
        resolve: {
          alias: {
            '@': path.join(repoRoot, 'apps/public'),
          },
        },
      },
    ],
  },
});
