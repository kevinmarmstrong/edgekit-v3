import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environmentMatchGlobs: [
      ['packages/ui/**', 'jsdom'],
      ['packages/react/**', 'jsdom'],
      ['examples/**', 'jsdom'],
    ],
    environment: 'node',
    include: ['packages/**/*.test.ts', 'examples/**/*.test.ts'],
  },
})
