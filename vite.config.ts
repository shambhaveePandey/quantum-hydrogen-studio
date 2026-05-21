import { defineConfig } from 'vite';
import glsl from 'vite-plugin-glsl';

export default defineConfig({
  plugins: [glsl()],
  server: {
    port: 5173,
    host: true,
    strictPort: false,
  },
  build: {
    target: 'ES2020',
    minify: 'terser',
    sourcemap: true,
    outDir: 'dist',
    assetsDir: 'assets',
  },
  resolve: {
    alias: {
      '@': '/src',
      '@/core': '/src/core',
      '@/physics': '/src/physics',
      '@/ui': '/src/ui',
    },
  },
});
