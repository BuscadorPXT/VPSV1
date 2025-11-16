import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
// ⚡ OTIMIZAÇÃO #20: Brotli compression
import viteCompression from 'vite-plugin-compression';

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
        ]
      : []),
    // ⚡ OTIMIZAÇÃO #20: Brotli compression (production only)
    ...(process.env.NODE_ENV === "production"
      ? [
          viteCompression({
            algorithm: 'brotliCompress',
            ext: '.br',
            threshold: 1024, // Only compress files > 1KB
            deleteOriginFile: false,
          }),
          viteCompression({
            algorithm: 'gzip',
            ext: '.gz',
            threshold: 1024,
            deleteOriginFile: false,
          }),
        ]
      : []),
  ],
  optimizeDeps: {
    exclude: ['chunk-MCOITDEE', 'chunk-FJLDFYJH', 'chunk-ZT7N5QXM', 'chunk-FPRJ6B2S', 'chunk-H62FIVL3', 'chunk-J3M4F5LV', 'chunk-CPMFSCIS']
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    // ⚡ OTIMIZAÇÃO #19: Rollup optimization
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          // Separar vendor chunks para melhor caching
          'react-vendor': ['react', 'react-dom'],
          'query-vendor': ['@tanstack/react-query'],
        },
      },
    },
  },
});
