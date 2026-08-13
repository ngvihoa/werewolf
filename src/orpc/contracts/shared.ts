import { storeErrorSchema } from '#/game/store/schema'
import { z } from 'zod'

// API mutation cố tình bỏ internal value của StoreResult.
// Sau khi thành công, browser refetch permission-aware GameView.
export const operationResultSchema = z.discriminatedUnion('ok', [
  z.object({ ok: z.literal(true) }),
  z.object({ ok: z.literal(false), error: storeErrorSchema }),
])
