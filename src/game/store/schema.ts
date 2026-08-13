import { z } from 'zod'

// Token schema chỉ xác nhận request có token.
// Việc token có tồn tại, hết hạn hay bị revoke vẫn do GameStore kiểm tra.
export const sessionTokenSchema = z.string().min(1)

// Version dương được dùng cho optimistic locking.
// Server từ chối mutation nếu version này đã cũ.
export const expectedVersionSchema = z.number().int().positive()

// Runtime schema là source of truth cho toàn bộ lỗi nghiệp vụ của store.
// TypeScript types trong model.ts sẽ được infer từ schema này.
export const storeErrorCodeSchema = z.enum([
  'DUPLICATE_DISPLAY_NAME',
  'GAME_ALREADY_STARTED',
  'GAME_NOT_FOUND',
  'INVALID_GAME_STATE',
  'NOT_ALL_PLAYERS_READY',
  'NOT_AUTHORIZED',
  'ROLES_NOT_ASSIGNED',
  'SESSION_NOT_FOUND',
  'STALE_VERSION',
])

export const storeErrorSchema = z.object({
  code: storeErrorCodeSchema,
  message: z.string(),
})

// Raw session token chỉ được trả cho client khi session vừa được tạo.
// Database implementation sau này chỉ lưu hash của token này.
export const createdGameSchema = z.object({
  gameId: z.string(),
  roomCode: z.string().length(6),
  moderatorSessionToken: sessionTokenSchema,
})

export const joinedGameSchema = z.object({
  gameId: z.string(),
  playerId: z.string(),
  playerSessionToken: sessionTokenSchema,
})

// Mutation trả metadata nhỏ thay vì làm lộ raw persistence model.
export const gameMutationResultSchema = z.object({
  gameId: z.string(),
  version: expectedVersionSchema,
})

// Helper tạo runtime schema tương ứng với StoreResult<T>.
// Contract chỉ cần truyền schema của value, không phải lặp lại nhánh error.
export function storeResultSchema<T extends z.ZodType>(valueSchema: T) {
  return z.discriminatedUnion('ok', [
    z.object({ ok: z.literal(true), value: valueSchema }),
    z.object({ ok: z.literal(false), error: storeErrorSchema }),
  ])
}

export const createGameResultSchema = storeResultSchema(createdGameSchema)
export const joinGameResultSchema = storeResultSchema(joinedGameSchema)
