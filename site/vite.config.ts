import { defineConfig } from 'vite'
import { resolve } from 'node:path'

const crossOriginIsolationHeaders = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
}

export default defineConfig({
  base: '/edgekit/',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        docs: resolve(__dirname, 'docs/index.html'),
        'docs-getting-started': resolve(__dirname, 'docs/getting-started/index.html'),
        'docs-concepts': resolve(__dirname, 'docs/concepts/index.html'),
        'docs-api': resolve(__dirname, 'docs/api/index.html'),
        'docs-ui': resolve(__dirname, 'docs/ui/index.html'),
        'docs-cli': resolve(__dirname, 'docs/cli/index.html'),
        'docs-testing': resolve(__dirname, 'docs/testing/index.html'),
        'docs-deployment': resolve(__dirname, 'docs/deployment/index.html'),
      },
    },
  },
  server: {
    port: 5174,
    headers: crossOriginIsolationHeaders,
  },
  preview: {
    headers: crossOriginIsolationHeaders,
  },
})
