import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      '/auth': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      '/file-export': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      '/opportunity-bookmark': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      '/draft-create': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      '/process-run': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      '/integration-connect': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      '/integration-disconnect': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      '/integration-update': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
});
