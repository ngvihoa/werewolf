import type { GameMutationResult, StoreResult } from '../model'
import type { PostgresStoreDeps } from './shared'
import type { TickInput } from '../game-store'

import { games } from '#/db/schema'
import { eq } from 'drizzle-orm'

import { storeErrorCodeSchema } from '../schema'
import {
  stampDiscussionDeadline,
  stampWaitingDeadline,
  runBotLoop,
} from '../../bot/bot-moderator'

import { persistGameAction, syncGamePlayers, syncGameQueue } from './state-sync'
import { appendGameEvent, getEventTargetPlayerId } from './game-events'
import { findActiveSession, lockGame } from './sessions'
import { failure } from './shared'

// Runtime schema là source of truth cho mọi error code được trả qua StoreResult.
const STORE_ERROR_CODE = storeErrorCodeSchema.enum

/**
 * R22 — lazy tick: client gọi khi countdown về 0. Đồng hồ là `deps.now()` của
 * server, KHÔNG tin input client (chống giả mạo thời gian để ép skip người
 * khác). Idempotent: không có gì thay đổi thì chỉ trả version hiện tại.
 */
export async function tickGame(
  deps: PostgresStoreDeps,
  input: TickInput,
): Promise<StoreResult<GameMutationResult>> {
  const sessionHash = deps.hashSessionToken(input.sessionToken)
  const now = deps.now()

  return deps.database.transaction(async (transaction) => {
    const session = await findActiveSession(transaction, sessionHash, now)
    // Token thuộc game khác cũng trả SESSION_NOT_FOUND để không làm lộ game.
    if (!session || session.gameId !== input.gameId) {
      return failure(
        STORE_ERROR_CODE.SESSION_NOT_FOUND,
        'Session does not exist for this game',
      )
    }

    const game = await lockGame(transaction, input.gameId)
    if (!game) {
      return failure(STORE_ERROR_CODE.GAME_NOT_FOUND, 'Game not found')
    }

    // Bot chỉ chạy ở SELF và chỉ khi ván đang trong progress.
    if (game.mode !== 'SELF' || !game.state || game.status !== 'IN_PROGRESS') {
      return {
        ok: true as const,
        value: { gameId: game.id, version: game.version },
      }
    }

    const before = JSON.stringify(game.state)
    const state = structuredClone(game.state)
    stampDiscussionDeadline(state, now)
    stampWaitingDeadline(state, now)
    const bot = runBotLoop(state, { now })
    if (!bot.ok) {
      return failure(STORE_ERROR_CODE.INVALID_GAME_STATE, bot.error.message)
    }
    const finalState = bot.state
    stampDiscussionDeadline(finalState, now)
    stampWaitingDeadline(finalState, now)

    // Không có gì đổi (deadline chưa tới, bot không có việc) → no-op.
    if (JSON.stringify(finalState) === before) {
      return {
        ok: true as const,
        value: { gameId: game.id, version: game.version },
      }
    }

    // Bot CONFIRM_STEP (nếu có) đóng action row SUBMITTED với session NULL.
    for (const step of bot.steps) {
      if (step.command.type !== 'CONFIRM_STEP') continue
      await persistGameAction(transaction, {
        gameId: game.id,
        previousState: step.previousState,
        command: step.command,
        sessionId: null,
        now,
      })
    }

    await syncGamePlayers(transaction, game.id, finalState)
    await syncGameQueue(transaction, game.id, finalState, now)

    const nextVersion = game.version + 1
    await transaction
      .update(games)
      .set({
        state: finalState,
        status: finalState.phase === 'GAME_OVER' ? 'GAME_OVER' : 'IN_PROGRESS',
        phase: finalState.phase,
        round: finalState.round,
        version: nextVersion,
        updatedAt: now,
      })
      .where(eq(games.id, game.id))

    const eventGame = {
      id: game.id,
      phase: finalState.phase,
      round: finalState.round,
    }
    for (const event of bot.events) {
      await appendGameEvent(transaction, {
        game: eventGame,
        createdBy: 'SYSTEM',
        actorPlayerId: null,
        targetPlayerId: getEventTargetPlayerId(event),
        createdAt: now,
        event,
      })
    }

    return {
      ok: true as const,
      value: { gameId: game.id, version: nextVersion },
    }
  })
}
