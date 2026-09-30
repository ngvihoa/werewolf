import { defineConfig } from 'vitest/config'
import 'dotenv/config'

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    // Integration test có hậu tố riêng để `pnpm test` thường không cần database.
    include: ['src/**/*.integration.ts'],
    environment: 'node',
    fileParallelism: false,

    // Remote PostgreSQL có thể chậm hơn ngưỢ单 mặc định của unit test.
    // Test full-flow (create → join → start → night action → confirm) tốn
    // nhiều round-trip qua pooler nên cần ngưỡng rộng hơn.
    testTimeout: 45_000,
    hookTimeout: 45_000,
  },
})
