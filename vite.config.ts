import path from 'node:path'

import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiOrigin = env.VITE_API_ORIGIN || ''
  const devProxyTarget = env.VITE_DEV_PROXY_TARGET || 'http://127.0.0.1:8080'
  const useLocalProxy = mode === 'development' && !apiOrigin

  return {
    base: env.VITE_BASE_PATH || '/ui/',
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    server: useLocalProxy
      ? {
          proxy: {
            '/api': {
              target: devProxyTarget,
              changeOrigin: true,
            },
            '/healthz': {
              target: devProxyTarget,
              changeOrigin: true,
            },
            '/swagger': {
              target: devProxyTarget,
              changeOrigin: true,
            },
          },
        }
      : undefined,
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom', 'react-router-dom'],
            arco: ['@arco-design/web-react', '@arco-design/web-react/icon'],
            query: ['@tanstack/react-query'],
          },
        },
      },
    },
  }
})
