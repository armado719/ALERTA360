import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // "forks" no arranca en esta máquina (timeout de worker en Windows).
    // "threads" usa el pool de worker_threads y funciona en local y CI.
    pool: 'threads',
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.ts'],
  },
})