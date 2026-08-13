import type { gameCommandSchema } from './schema'
import type { z } from 'zod'

// Schema là source of truth duy nhất.
// Type dùng trong rule engine và UI được suy ra tự động từ runtime schema.
export type GameCommand = z.infer<typeof gameCommandSchema>
