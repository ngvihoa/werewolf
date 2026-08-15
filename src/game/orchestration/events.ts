import type { gameEventSchema } from './schema'
import type { z } from 'zod'

// Schema là source of truth cho cả runtime validation và TypeScript type.
export type GameEvent = z.infer<typeof gameEventSchema>
