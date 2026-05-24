import { defineConfig } from 'vitest/config'

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      external: ['react', '@kevinmarmstrong/edgekit', '@kevinmarmstrong/edgekit-ui'],
    },
  },
  test: {
    environment: 'jsdom',
  },
})
