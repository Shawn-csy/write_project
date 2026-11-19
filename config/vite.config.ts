import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import fs from "fs";

const repoRoot = path.resolve(__dirname, "..");
const studioRoot = path.join(repoRoot, "apps/studio");
const packageJson = JSON.parse(
  fs.readFileSync(path.join(repoRoot, "package.json"), "utf-8")
);
const APP_VERSION = packageJson.version || "0.0.0";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, repoRoot, '');
  const apiUrl = env.VITE_API_URL || "/api";
  const isAbsoluteApiUrl = /^https?:\/\//i.test(apiUrl);
  const proxyTarget =
    env.VITE_DEV_PROXY_TARGET ||
    (isAbsoluteApiUrl ? apiUrl : "http://localhost:1091");

  return {
    root: studioRoot,
    envDir: repoRoot,
    plugins: [
      react(),
      {
        name: "studio-build-output",
        apply: "build",
        config({ build }) {
          if (build?.emptyOutDir !== undefined) return;
          const relativeOutDir = path.relative(
            repoRoot,
            path.resolve(studioRoot, build?.outDir ?? "dist"),
          );
          // Preserve Vite's cleanup for repo-local outputs after changing its root.
          if (
            relativeOutDir &&
            relativeOutDir !== ".." &&
            !relativeOutDir.startsWith(`..${path.sep}`) &&
            !path.isAbsolute(relativeOutDir)
          ) {
            return { build: { emptyOutDir: true } };
          }
        },
      },
    ],
    css: { postcss: __dirname },
    define: {
      __APP_VERSION__: JSON.stringify(APP_VERSION),
    },
    resolve: {
      alias: {
        "@": path.join(studioRoot, "src"),
      },
    },
    server: {
      allowedHosts: [
        "open-scripts.shawnup.com",
      ],
      proxy: {
        "/api": {
          target: proxyTarget,
          changeOrigin: true,
          rewrite: (path) => {
             // If proxy target already ends with /api, strip /api from request path
             // so we don't end up with /api/api/...
             if (proxyTarget.endsWith('/api')) {
                 return path.replace(/^\/api/, '');
             }
             return path;
          }
        },
        "/media": {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
  preview: {
    allowedHosts: [
      "scripts-666540946249.asia-east1.run.app",
      "scripts.shawnup.com",
      "open-scripts.shawnup.com",
    ],
  },
  build: {
    outDir: path.join(repoRoot, 'dist'),
    target: 'esnext',
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-scroll-area', '@radix-ui/react-select', '@radix-ui/react-slot', '@radix-ui/react-switch', '@radix-ui/react-tabs', '@radix-ui/react-label', 'lucide-react', 'class-variance-authority', 'clsx', 'tailwind-merge'],
          'vendor-editor': ['@uiw/react-codemirror', '@codemirror/theme-one-dark'],
          'vendor-dnd': ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
          'vendor-firebase': ['@firebase/app', '@firebase/auth'],
        },
      },
    },
  },
  };
});
