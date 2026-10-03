import type { GameMutationResult, StoreResult } from '../model'
import type { ExecuteGameCommandInput } from '../game-store'
import type { PostgresStoreDeps } from './shared'
import type { GameEvent } from '../../orchestration/events'
import type { BotStep } from '../../bot/bot-moderator'

import { commandReceipts } from '#/db/schema'
import { and, eq } from 'drizzle-orm'

import { gameMutationResultSchema, storeErrorCodeSchema } from '../schema'
import { authorizeCommand } from '../command-authorization'
import { executeCommand } from '../../orchestration/game-orchestrator'
import {
  stampDiscussionDeadline,
  stampWaitingDeadline,
  runBotLoop,
} from '../../bot/bot-moderator'

import { persistGameAction, syncGamePlayers, syncGameQueue } from './state-sync'
import { appendGameEvent, getEventTargetPlayerId } from './game-events'
import { hashCommandRequest } from './command-receipts'
import { failure } from './shared'
import {
  updateGameAndIncrementVersion,
  findActiveSession,
  lockGame,
} from './sessions'

// Runtime schema là source of truth cho mọi error code được trả qua StoreResult.
const STORE_ERROR_CODE = storeErrorCodeSchema.enum

export async function executeGameCommand(
  deps: PostgresStoreDeps,
  input: ExecuteGameCommandInput,
): Promise<StoreResult<GameMutationResult>> {
  const { database } = deps
  const sessionHash = deps.hashSessionToken(input.sessionToken)
  const now = deps.now()

  return database.transaction(async (transaction) => {
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

    const requestHash = hashCommandRequest(input)
    const [receipt] = await transaction
      .select({
        requestHash: commandReceipts.requestHash,
        response: commandReceipts.response,
      })
      .from(commandReceipts)
      .where(
        and(
          eq(commandReceipts.sessionId, session.id),
          eq(commandReceipts.idempotencyKey, input.idempotencyKey),
        ),
      )
      .limit(1)

    if (receipt) {
      if (receipt.requestHash !== requestHash) {
        return failure(
          STORE_ERROR_CODE.IDEMPOTENCY_KEY_REUSED,
          'Idempotency key was already used for another command',
        )
      }
      return {
        ok: true as const,
        value: gameMutationResultSchema.parse(receipt.response),
      }
    }

    if (game.version !== input.expectedVersion) {
      return failure(STORE_ERROR_CODE.STALE_VERSION, 'Game version is stale')
    }

    if (!game.state || game.status !== 'IN_PROGRESS') {
      return failure(
        STORE_ERROR_CODE.INVALID_GAME_STATE,
        'Game has not started or has already ended',
      )
    }

    const authorization = authorizeCommand(session, input.command)
    if (!authorization.ok) return authorization

    // Rule engine không biết database; nó chỉ nhận state cũ và trả
    // state + events mới hoặc domain error.
    const outcome = executeCommand(game.state, input.command)
    if (!outcome.ok) {
      return failure(STORE_ERROR_CODE.INVALID_GAME_STATE, outcome.error.message)
    }

    let finalState = outcome.value.state
    const humanEvents = outcome.value.events
    let botEvents: GameEvent[] = []
    let botSteps: BotStep[] = []

    // SELF: quản trò bot chạy tới fixpoint trong cùng transaction — người chơi
    // gửi một lệnh, cả chuỗi confirm hệ thống ghi cùng một version.
    if (game.mode === 'SELF') {
      // Mốc thời gian gắn cả TRƯỚC lẫn SAU loop: DAY và step mới thường được
      // tạo bên trong loop bởi chính bot.
      stampDiscussionDeadline(finalState, now)
      stampWaitingDeadline(finalState, now)
      const bot = runBotLoop(finalState, { now })
      if (!bot.ok) {
        return failure(STORE_ERROR_CODE.INVALID_GAME_STATE, bot.error.message)
      }
      finalState = bot.state
      stampDiscussionDeadline(finalState, now)
      stampWaitingDeadline(finalState, now)
      botEvents = bot.events
      botSteps = bot.steps
    }

    await persistGameAction(transaction, {
      gameId: game.id,
      previousState: game.state,
      command: input.command,
      sessionId: session.id,
      now,
    })

    // Bot CONFIRM_STEP cũng phải đóng action row đang SUBMITTED; quyết định
    // của bot không thuộc session nào nên decided_by_session_id để NULL.
    for (const step of botSteps) {
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

    const nextVersion = await updateGameAndIncrementVersion(
      transaction,
      game,
      now,
      {
        state: finalState,
        status: finalState.phase === 'GAME_OVER' ? 'GAME_OVER' : 'IN_PROGRESS',
        phase: finalState.phase,
        round: finalState.round,
      },
    )

    // Event append cùng transaction nên state, version và audit history
    // luôn cùng thành công hoặc cùng rollback. Event của bot ghi actor SYSTEM.
    const eventGame = {
      id: game.id,
      phase: finalState.phase,
      round: finalState.round,
    }
    for (const event of humanEvents) {
      await appendGameEvent(transaction, {
        game: eventGame,
        createdBy: session.kind,
        actorPlayerId: session.playerId,
        targetPlayerId: getEventTargetPlayerId(event),
        createdAt: now,
        event,
      })
    }
    for (const event of botEvents) {
      await appendGameEvent(transaction, {
        game: eventGame,
        createdBy: 'SYSTEM',
        actorPlayerId: null,
        targetPlayerId: getEventTargetPlayerId(event),
        createdAt: now,
        event,
      })
    }

    const result = {
      gameId: game.id,
      version: nextVersion,
    }

    await transaction.insert(commandReceipts).values({
      gameId: game.id,
      sessionId: session.id,
      idempotencyKey: input.idempotencyKey,
      requestHash,
      commandType: input.command.type,
      expectedVersion: input.expectedVersion,
      resultingVersion: nextVersion,
      status: 'ACCEPTED',
      response: result,
    })

    return {
      ok: true as const,
      value: result,
    }
  })
}
