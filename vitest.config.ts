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
          setupFiles: ['./apps/public/test-setup.tsx'],
        },
        resolve: {
          // apps/public 是 Next 16 app，依賴 React 19（apps/public/node_modules）；
          // 根工作區的 Vite SPA 依賴 React 18。測試檔會解析到前者，而根目錄的
          // @testing-library/react 解析到後者 —— 同一次 render 出現兩份 React，
          // 所有 hook 都會拋 "Invalid hook call"。
          //
          // next 16.2.7 時 next 被提升到 root node_modules，安裝佈局讓兩邊剛好
          // 收斂到同一份；升到 16.3.1 後 next 改為巢狀安裝在 apps/public，
          // 分岔才浮現。
          //
          // 明確釘到 root 這一份：@write/* 是 symlink 到 packages/，其 react
          // 解析到 root；@testing-library/react 亦然。釘到 root 等同於升級前
          // 實際生效的行為，只是不再依賴安裝佈局的巧合。
          dedupe: ['react', 'react-dom'],
          alias: {
            '@': path.resolve(__dirname, './apps/public'),
            react: path.resolve(__dirname, './node_modules/react'),
            'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
          },
        },
      },
    ],
  },
});
