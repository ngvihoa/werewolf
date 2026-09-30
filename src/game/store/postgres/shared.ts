import type { GameMutationResult, StoreErrorCode, StoreResult } from '../model'
import type { games } from '#/db/schema'
import type { db } from '#/db/client'

export type DatabaseTransaction = Parameters<
  Parameters<typeof db.transaction>[0]
>[0]

export type GameRow = typeof games.$inferSelect

// Caller chỉ patch các cột state có thể thay đổi trong một game mutation.
// `version` và `updatedAt` luôn do updateGameAndIncrementVersion quản lý.
export type GameVersionChanges = Partial<
  Pick<
    typeof games.$inferInsert,
    'settings' | 'state' | 'status' | 'phase' | 'round'
  >
>

// Dependency đã resolve, dùng chung bởi mọi command module của Postgres store.
export type PostgresStoreDeps = {
  database: typeof db
  createRoomCode: () => string
  createSessionToken: () => string
  hashSessionToken: (token: string) => string
  createSessionExpiry: (now: Date) => Date
  now: () => Date
}

export type CommandReceiptInput = {
  gameId: string
  sessionId: string
  idempotencyKey: string
  requestHash: string
  commandType: string
  expectedVersion: number
  result: GameMutationResult
}

export function failure(
  code: StoreErrorCode,
  message: string,
): StoreResult<never> {
  // Mọi business error của store dùng chung một representation.
  return { ok: false, error: { code, message } }
}
