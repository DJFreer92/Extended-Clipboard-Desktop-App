import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  const isWebBuild = process.env.VITE_BUILD_TARGET === 'web';

  const baseInput = {
    main: resolve(__dirname, 'index.html'),
  };

  const electronInput = {
    ...baseInput,
    tray: resolve(__dirname, 'tray.html'),
  };

  return {
    base: isWebBuild ? '/Extended-Clipboard-Desktop-App/' : './',
    build: {
      emptyOutDir: false, // Don't clear the dist directory before building
      rollupOptions: {
        input: isWebBuild ? baseInput : electronInput,
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
    define: {
      __IS_WEB_BUILD__: isWebBuild,
    },
  };
});
