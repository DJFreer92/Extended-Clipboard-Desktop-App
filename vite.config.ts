import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    emptyOutDir: false, // Don't clear the dist directory before building
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        tray: resolve(__dirname, 'tray.html'),
      },
    },
  },
  server: {
    port: 5174,
    strictPort: true,
    proxy: {
      // Proxy API requests to FastAPI to avoid CORS in dev
      '/clipboard': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
