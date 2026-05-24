import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'pnpm --filter @edgekit/ecommerce-demo preview --host 127.0.0.1 --port 4173',
      url: 'http://127.0.0.1:4173',
      reuseExistingServer: !process.env.CI && !process.env.EDGEKIT_E2E_FRESH,
    },
    {
      command: 'pnpm --filter @edgekit/site preview --host 127.0.0.1 --port 4174',
      url: 'http://127.0.0.1:4174/edgekit/',
      reuseExistingServer: !process.env.CI && !process.env.EDGEKIT_E2E_FRESH,
    },
  ],
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'] } },
  ],
})
