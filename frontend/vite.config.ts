import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: '127.0.0.1',
    proxy: {
      '/api': {
        target: process.env.VITE_BACKEND_PROXY_URL || 'http://127.0.0.1:8080',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 3000,
    host: '127.0.0.1',
  },
});
