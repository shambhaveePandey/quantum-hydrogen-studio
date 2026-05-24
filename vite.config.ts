import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    host: true,
    strictPort: false,
  },
  build: {
    target: 'ES2020',
    sourcemap: true,
    outDir: 'dist',
    assetsDir: 'assets',
  },
});
