import { defineConfig, devices } from '@playwright/test'

// Dev server và e2e luôn chạy trên port 3100 (port 3000 để lại cho dự án khác);
// vẫn có thể ghi đè bằng E2E_PORT nếu cần.
const e2ePort = Number(process.env.E2E_PORT ?? 3100)

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  timeout: 90_000,
  expect: { timeout: 12_000 },
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'html',
  use: {
    baseURL: `http://127.0.0.1:${e2ePort}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      testIgnore: /portfolio-capture/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'capture',
      testMatch: /portfolio-capture/,
      use: {
        viewport: { width: 1600, height: 1000 },
        deviceScaleFactor: 2,
      },
    },
  ],
  webServer: {
    command: `pnpm exec vite dev --port ${e2ePort} --host`,
    url: `http://127.0.0.1:${e2ePort}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
