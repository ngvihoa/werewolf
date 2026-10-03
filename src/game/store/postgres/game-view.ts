import type { GameView, ProjectionViewer } from '../../projections/model'
import type { LocalGame, StoreResult } from '../model'
import type { PostgresStoreDeps } from './shared'

import { gameEvents, gamePlayers, games } from '#/db/schema'
import { desc, eq } from 'drizzle-orm'

import { eventActorSchema, storeErrorCodeSchema } from '../schema'
import { deserializeGameEvent } from '../event-persistence'
import { projectGameView } from '../../projections/project-game-view'

import { findActiveSession } from './sessions'
import { failure } from './shared'

// Runtime schema là source of truth cho mọi error code được trả qua StoreResult.
const STORE_ERROR_CODE = storeErrorCodeSchema.enum

export async function getGameView(
  deps: PostgresStoreDeps,
  sessionToken: string,
): Promise<StoreResult<GameView>> {
  const sessionHash = deps.hashSessionToken(sessionToken)
  const now = deps.now()

  return deps.database.transaction(
    async (transaction) => {
      const session = await findActiveSession(transaction, sessionHash, now)

      if (!session) {
        return failure(
          STORE_ERROR_CODE.SESSION_NOT_FOUND,
          'Session does not exist or is no longer active',
        )
      }

      // Player session bắt buộc phải gắn với player id. Không dùng chuỗi rỗng
      // làm fallback vì nó sẽ che mất dữ liệu vi phạm DB invariant.
      const viewer: ProjectionViewer | null =
        session.kind === 'MODERATOR'
          ? { kind: 'MODERATOR', playerId: null }
          : session.playerId
            ? { kind: 'PLAYER', playerId: session.playerId }
            : null

      if (!viewer) {
        return failure(
          STORE_ERROR_CODE.INVALID_GAME_STATE,
          'Session is not valid',
        )
      }

      const [game] = await transaction
        .select()
        .from(games)
        .where(eq(games.id, session.gameId))
        .limit(1)

      if (!game) {
        return failure(STORE_ERROR_CODE.GAME_NOT_FOUND, 'Game not found')
      }

      const players = await transaction
        .select({
          id: gamePlayers.id,
          role: gamePlayers.role,
          alive: gamePlayers.isAlive,
          isReady: gamePlayers.isReady,
          displayName: gamePlayers.displayName,
          isModerator: gamePlayers.isModerator,
          isHost: gamePlayers.isHost,
          abilityState: gamePlayers.abilityState,
        })
        .from(gamePlayers)
        .where(eq(gamePlayers.gameId, game.id))

      const events = await transaction
        .select()
        .from(gameEvents)
        .where(eq(gameEvents.gameId, game.id))
        .orderBy(desc(gameEvents.sequence))
        .limit(200)

      const allHistory = events.reverse().map((row) => ({
        id: row.id,
        sequence: row.sequence,
        gameId: row.gameId,
        actor: eventActorSchema.parse(row.createdBy),
        actorPlayerId: row.actorPlayerId,
        createdAt: row.createdAt.toISOString(),
        event: deserializeGameEvent(row.type, row.payload),
      }))
      const resetIndex = allHistory
        .map((entry) => entry.event.type)
        .lastIndexOf('MATCH_RESET')
      const history = allHistory.slice(resetIndex + 1)

      const localGame: LocalGame = {
        id: game.id,
        roomCode: game.roomCode,
        version: game.version,
        moderatorName: game.moderatorName,
        mode: game.mode,
        hostPlayerId:
          players.find((p) => p.isHost && !p.isModerator)?.id ?? null,
        lobbyPlayers: players.map((p) => ({
          id: p.id,
          role: p.role,
          alive: p.alive,
          abilityState: p.abilityState,
          isModerator: p.isModerator,
          displayName: p.displayName,
          ready: p.isReady,
        })),
        state: game.state,
        history,
      }

      const gameView = projectGameView(localGame, viewer)

      if (!gameView) {
        return failure(
          STORE_ERROR_CODE.INVALID_GAME_STATE,
          'Failed to project game view',
        )
      }

      return {
        ok: true as const,
        value: gameView,
      }
    },
    {
      // Các query game, players và events phải dùng chung một snapshot.
      accessMode: 'read only',
      isolationLevel: 'repeatable read',
    },
  )
}
