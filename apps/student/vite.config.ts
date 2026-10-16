import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        '@shared': path.resolve(__dirname, '../../shared'),
      },
    },
    server: {
      host: '0.0.0.0',
      allowedHosts: ['.e2b.app', 'localhost'],
      // خادم المنصة (apps/api) على المنفذ 5000.
      // مسار نسبي حتى يعمل داخل المعاينة: المتصفح لا يصل إلى localhost مباشرة.
      proxy: {
        '/backend': {
          target: 'http://127.0.0.1:5000',
          changeOrigin: true,
          rewrite: (p: string) => p.replace(/^\/backend/, ''),
        },
        '/uploads': {
          target: 'http://127.0.0.1:5000',
          changeOrigin: true,
        },
      },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
