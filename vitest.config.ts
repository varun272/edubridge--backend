import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    fileParallelism: false,
    hookTimeout: 60000,
    testTimeout: 60000,
    setupFiles: ['./tests/env.ts', './tests/setup.ts'],
  },
})
