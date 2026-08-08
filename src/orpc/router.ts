import type { ORPCContext } from './context'

import { os } from '@orpc/server'
import { z } from 'zod'

const procedure = os.$context<ORPCContext>()

const health = procedure
  .input(z.object({}))
  .output(
    z.object({
      status: z.literal('ok'),
      timestamp: z.string(),
    }),
  )
  .handler(() => ({
    status: 'ok' as const,
    timestamp: new Date().toISOString(),
  }))

export const appRouter = {
  health,
}

export type AppRouter = typeof appRouter
