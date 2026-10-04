import type { GameMutationResult, StoreResult } from '../model'
import type { ExecuteGameCommandInput } from '../game-store'
import type { PostgresStoreDeps } from './shared'
import type { GameEvent } from '../../orchestration/events'
import type { BotStep } from '../../bot/bot-moderator'

import { commandReceipts } from '#/db/schema'
import { and, eq } from 'drizzle-orm'

import { gameMutationResultSchema, storeErrorCodeSchema } from '../schema'
import { authorizeCommand, stampEnteredBy } from '../command-authorization'
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
  findLeftPlayerIds,
  isGameController,
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

    const authorization = authorizeCommand(session, input.command, game.mode)
    if (!authorization.ok) return authorization
    // R23: player chỉ được END_GAME khi là chủ phòng ở SELF (game đã lock ở trên).
    if (input.command.type === 'END_GAME' && session.kind === 'PLAYER') {
      if (!(await isGameController(transaction, session, game))) {
        return failure(
          STORE_ERROR_CODE.NOT_AUTHORIZED,
          'Only the host can end the game early',
        )
      }
    }
    // R23: người đã rời không hành động/bỏ phiếu nữa (session cũ chỉ còn xem)
    // — trừ END_GAME: chủ phòng rời vẫn giữ quyền kết thúc ván. Danh sách
    // người rời cũng là input của bot clock bên dưới.
    let leftPlayerIds: string[] = []
    if (
      game.mode === 'SELF' &&
      session.kind === 'PLAYER' &&
      input.command.type !== 'END_GAME'
    ) {
      leftPlayerIds = await findLeftPlayerIds(transaction, game.id)
      if (session.playerId && leftPlayerIds.includes(session.playerId)) {
        return failure(
          STORE_ERROR_CODE.NOT_AUTHORIZED,
          'Player has left the game',
        )
      }
    }

    // Rule engine không biết database; nó chỉ nhận state cũ và trả
    // state + events mới hoặc domain error.
    const outcome = executeCommand(game.state, input.command)
    if (!outcome.ok) {
      return failure(STORE_ERROR_CODE.INVALID_GAME_STATE, outcome.error.message)
    }

    let finalState = outcome.value.state
    // M4: nguồn nhập của event audit — session nào khởi phát lệnh thì action
    // mang nguồn đó (bot confirm cùng transaction kế thừa).
    const enteredBy: 'PLAYER' | 'MODERATOR' =
      session.kind === 'MODERATOR' ? 'MODERATOR' : 'PLAYER'
    const humanEvents = stampEnteredBy(outcome.value.events, enteredBy)
    let botEvents: GameEvent[] = []
    let botSteps: BotStep[] = []

    // M12: quản trò bot chạy tới fixpoint ở CẢ HAI mode — người chơi/quản trò
    // gửi một lệnh, cả chuỗi confirm hệ thống ghi cùng một version. Allowlist
    // theo mode quyết định bot được phát lệnh gì (MODERATED chỉ confirm step
    // + tally; SELF giữ nguyên R20–R23).
    {
      // Mốc thời gian gắn cả TRƯỚC lẫn SAU loop: DAY và step mới thường được
      // tạo bên trong loop bởi chính bot. Cả hai hàm stamp tự no-op phần
      // SELF-only khi mode là MODERATED (chỉ còn mốc VOTE cho alert M8).
      stampDiscussionDeadline(finalState, now, game.mode)
      stampWaitingDeadline(finalState, now, game.mode)
      const bot = runBotLoop(finalState, {
        now,
        leftPlayerIds,
        mode: game.mode,
      })
      if (!bot.ok) {
        return failure(STORE_ERROR_CODE.INVALID_GAME_STATE, bot.error.message)
      }
      finalState = bot.state
      stampDiscussionDeadline(finalState, now, game.mode)
      stampWaitingDeadline(finalState, now, game.mode)
      botEvents = stampEnteredBy(bot.events, enteredBy)
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
