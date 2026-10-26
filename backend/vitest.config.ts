import { defineConfig } from 'vitest/config'

export default defineConfig({
  // PostCSS en línea: sin esto Vite sube hasta el `postcss.config.js` del
  // frontend, que exige `tailwindcss`, y en CI (solo deps de backend) aborta.
  css: { postcss: {} },
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    // `config.ts` valida el entorno al importarse y aborta si falta algo.
    env: {
      NODE_ENV: 'test',
      JWT_SECRET: 'secret-de-pruebas-no-usar-en-produccion',
      DATABASE_URL: 'postgresql://alerta:alerta@localhost:5432/alerta360_test',
      USGS_ENABLED: 'false',
      NOAA_ENABLED: 'false',
    },
  },
})
