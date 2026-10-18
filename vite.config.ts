import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    allowedHosts: true,
    // El frontend llama a `/api` y `/ws` en el mismo origen; Vite las reenvía
    // al backend. Evita CORS en desarrollo y funciona igual en producción
    // (nginx hace el mismo trabajo).
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:3000',
        ws: true,
        changeOrigin: true,
      },
    },
    watch: {
      ignored: ['**/alerta360-ui-redesign/**', '**/*.patch'],
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
