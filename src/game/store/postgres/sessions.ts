import type { DatabaseTransaction, GameRow, GameVersionChanges } from './shared'
import type { StoreResult } from '../model'

import { gameSessions, gamePlayers, games } from '#/db/schema'
import { and, eq, gt, isNotNull, isNull } from 'drizzle-orm'

import { storeErrorCodeSchema } from '../schema'

import { failure } from './shared'

// Runtime schema là source of truth cho mọi error code được trả qua StoreResult.
const STORE_ERROR_CODE = storeErrorCodeSchema.enum

export async function findActiveSession(
  transaction: DatabaseTransaction,
  tokenHash: string,
  now: Date,
) {
  // Helper chỉ resolve session; từng mutation vẫn tự kiểm tra quyền cụ thể.
  const [session] = await transaction
    .select({
      id: gameSessions.id,
      gameId: gameSessions.gameId,
      playerId: gameSessions.playerId,
      kind: gameSessions.kind,
    })
    .from(gameSessions)
    .where(
      and(
        eq(gameSessions.tokenHash, tokenHash),
        isNull(gameSessions.revokedAt),
        gt(gameSessions.expiresAt, now),
      ),
    )
    .limit(1)

  return session ?? null
}

export async function lockGame(
  transaction: DatabaseTransaction,
  gameId: string,
): Promise<GameRow | null> {
  // Tất cả mutation lock cùng game row để có chung thứ tự version và event.
  const [game] = await transaction
    .select()
    .from(games)
    .where(eq(games.id, gameId))
    .limit(1)
    .for('update')

  return game ?? null
}

// Ai được điều khiển sảnh (phân vai, start, rematch):
// - MODERATED: session Moderator.
// - SELF: chủ phòng — player tạo phòng (game_players.is_host).
// Game row phải được lock trước khi gọi để tránh đếnh hạng theo dữ liệu cũ.
export async function isGameController(
  transaction: DatabaseTransaction,
  session: { kind: 'MODERATOR' | 'PLAYER'; playerId: string | null },
  game: GameRow,
): Promise<boolean> {
  if (session.kind === 'MODERATOR') return true
  if (session.kind !== 'PLAYER' || !session.playerId) return false
  if (game.mode !== 'SELF') return false

  const [player] = await transaction
    .select({ isHost: gamePlayers.isHost })
    .from(gamePlayers)
    .where(
      and(
        eq(gamePlayers.gameId, game.id),
        eq(gamePlayers.id, session.playerId),
      ),
    )
    .limit(1)

  return player?.isHost ?? false
}

// R23: id các player đã rời game giữa ván — bot (clock) dùng để skip
// step/abstain phiếu của họ ngay thay vì chờ timer.
export async function findLeftPlayerIds(
  transaction: DatabaseTransaction,
  gameId: string,
): Promise<string[]> {
  const rows = await transaction
    .select({ id: gamePlayers.id })
    .from(gamePlayers)
    .where(and(eq(gamePlayers.gameId, gameId), isNotNull(gamePlayers.leftAt)))

  return rows.map((row) => row.id)
}

export function validateLobbyMutation(
  game: GameRow | null,
  expectedVersion: number,
): StoreResult<GameRow> {
  // Các kiểm tra này chạy trong memory sau một query lock duy nhất.
  if (!game) return failure(STORE_ERROR_CODE.GAME_NOT_FOUND, 'Game not found')

  if (game.version !== expectedVersion) {
    return failure(STORE_ERROR_CODE.STALE_VERSION, 'Game version is stale')
  }

  if (game.status !== 'LOBBY') {
    return failure(
      STORE_ERROR_CODE.GAME_ALREADY_STARTED,
      'Game has already started',
    )
  }

  return { ok: true, value: game }
}

export async function updateGameAndIncrementVersion(
  transaction: DatabaseTransaction,
  game: Pick<GameRow, 'id' | 'version'>,
  now: Date,
  changes: GameVersionChanges = {},
): Promise<number> {
  const nextVersion = game.version + 1

  // Version thay đổi trong cùng transaction với state và event tương ứng.
  await transaction
    .update(games)
    .set({ ...changes, version: nextVersion, updatedAt: now })
    .where(eq(games.id, game.id))

  return nextVersion
}
