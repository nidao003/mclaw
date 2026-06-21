import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@shared': resolve(__dirname, '../../packages/shared/src'),
      '@shared/*': resolve(__dirname, '../../packages/shared/src/*'),
    },
    dedupe: ['react', 'react-dom', 'react-i18next', 'zustand', 'sonner', 'lucide-react'],
  },
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'https://[REDACTED]',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
