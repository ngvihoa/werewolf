import { defineConfig } from 'vitest/config'
import 'dotenv/config'

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    // Integration test có hậu tố riêng để `pnpm test` thường không cần database.
    include: ['src/**/*.integration.ts'],
    environment: 'node',
    fileParallelism: false,

    // Remote PostgreSQL có thể chậm hơn ngưỡng mặc định 5 giây của unit test.
    testTimeout: 15_000,
    hookTimeout: 15_000,
  },
})
