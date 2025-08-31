import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  // Base path for GitHub Pages deployment
  base: '/Extended-Clipboard-Desktop-App/',
  
  build: {
    // Output to dist-web directory for web builds
    outDir: 'dist-web',
    emptyOutDir: true, // Clear the dist-web directory before building
    rollupOptions: {
      input: resolve(__dirname, 'web.html'),
    },
  },
  
  // Development server configuration
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
  
  // Define global constants for web build
  define: {
    __IS_WEB_BUILD__: true,
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  
  // Optimize for web deployment
  esbuild: {
    // Remove console logs in production
    drop: ['console', 'debugger'],
  },
});