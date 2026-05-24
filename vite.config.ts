import { defineConfig } from 'vite';

export default defineConfig({
  base: '/quantum-hydrogen-studio/',
  server: {
    port: 5173,
    host: true,
    strictPort: false,
  },
  build: {
    target: 'ES2023',
    sourcemap: true,
    outDir: 'dist',
    assetsDir: 'assets',
  },
});