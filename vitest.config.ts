import { defineConfig } from 'vitest/config'

// useTheory is deliberately DOM-free, so the suite runs in plain node with no
// Nuxt runtime. Tests import the composable by relative path.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts']
  }
})
