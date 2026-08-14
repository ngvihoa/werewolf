import { defineConfig } from 'vitest/config'
import 'dotenv/config'

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    // Integration test có hậu tố riêng để `pnpm test` thường không cần database.
    include: ['src/**/*.integration.ts'],
    environment: 'node',
    fileParallelism: false,
  },
})
