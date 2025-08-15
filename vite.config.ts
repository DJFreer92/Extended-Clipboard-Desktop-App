import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    emptyOutDir: false, // Don't clear the dist directory before building
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
