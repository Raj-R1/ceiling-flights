import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  root: 'app/renderer',
  base: './',
  resolve: {
    alias: {
      'maplibre-dist': path.resolve(__dirname, 'node_modules/maplibre-gl/dist')
    }
  },
  optimizeDeps: {
    exclude: ['maplibre-dist']
  },
  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: true
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    fs: {
      allow: [path.resolve(__dirname)]
    }
  }
});
