import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../../shared'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 4000,
    allowedHosts: true,
    // خادم المنصة (apps/api) على المنفذ 5000.
    // مسار نسبي حتى يعمل داخل المعاينة: المتصفح لا يصل إلى localhost مباشرة.
    proxy: {
      '/backend': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        rewrite: (p: string) => p.replace(/^\/backend/, ''),
      },
    },
  },
  preview: { host: '0.0.0.0', port: 4000, allowedHosts: true },
});
