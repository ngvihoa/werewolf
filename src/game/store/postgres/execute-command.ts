import type { GameMutationResult, StoreResult } from '../model'
import type { ExecuteGameCommandInput } from '../game-store'
import type { PostgresStoreDeps } from './shared'

import { commandReceipts } from '#/db/schema'
import { and, eq } from 'drizzle-orm'

import { gameMutationResultSchema, storeErrorCodeSchema } from '../schema'
import { authorizeCommand } from '../command-authorization'
import { executeCommand } from '../../orchestration/game-orchestrator'

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

    await persistGameAction(transaction, {
      gameId: game.id,
      previousState: game.state,
      command: input.command,
      sessionId: session.id,
      now,
    })

    await syncGamePlayers(transaction, game.id, outcome.value.state)
    await syncGameQueue(transaction, game.id, outcome.value.state, now)

    const nextVersion = await updateGameAndIncrementVersion(
      transaction,
      game,
      now,
      {
        state: outcome.value.state,
        status:
          outcome.value.state.phase === 'GAME_OVER'
            ? 'GAME_OVER'
            : 'IN_PROGRESS',
        phase: outcome.value.state.phase,
        round: outcome.value.state.round,
      },
    )

    // Event append cùng transaction nên state, version và audit history
    // luôn cùng thành công hoặc cùng rollback.
    for (const event of outcome.value.events) {
      await appendGameEvent(transaction, {
        game: {
          id: game.id,
          phase: outcome.value.state.phase,
          round: outcome.value.state.round,
        },
        createdBy: session.kind,
        actorPlayerId: session.playerId,
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
