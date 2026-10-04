import type { StoreResult } from '#/game/store/model'

import { publishGameInvalidation } from '#/realtime/publisher'
import { localGameStore } from '#/game/store/local-game-store'

import { baseRouter } from './base'

function toOperationResult<T>(result: StoreResult<T>) {
  return result.ok
    ? { ok: true as const }
    : { ok: false as const, error: result.error }
}

export const lobbyRouter = baseRouter.lobby.router({
  createGame: baseRouter.lobby.createGame.handler(async ({ input }) => {
    const result = await localGameStore.createGame(input)
    if (result.ok) {
      await publishGameInvalidation({
        gameId: result.value.gameId,
        version: result.value.version,
      })
    }
    return result
  }),

  joinGame: baseRouter.lobby.joinGame.handler(async ({ input }) => {
    const result = await localGameStore.joinGame(
      input.roomCode,
      input.displayName,
    )
    if (result.ok) {
      await publishGameInvalidation({
        gameId: result.value.gameId,
        version: result.value.version,
      })
    }
    return result
  }),

  getGameView: baseRouter.lobby.getGameView.handler(async ({ input }) => {
    return localGameStore.getGameView(input.sessionToken)
  }),

  setReady: baseRouter.lobby.setReady.handler(async ({ input }) => {
    const result = await localGameStore.setReady(
      input.sessionToken,
      input.expectedVersion,
      input.ready,
      input.idempotencyKey,
    )

    if (result.ok) await publishGameInvalidation(result.value)

    return toOperationResult(result)
  }),

  assignRoles: baseRouter.lobby.assignRoles.handler(async ({ input }) => {
    const result = await localGameStore.assignRoles(
      input.sessionToken,
      input.expectedVersion,
      input.idempotencyKey,
      input.composition,
    )
    if (result.ok) await publishGameInvalidation(result.value)
    return toOperationResult(result)
  }),

  startGame: baseRouter.lobby.startGame.handler(async ({ input }) => {
    const result = await localGameStore.startGame(
      input.sessionToken,
      input.expectedVersion,
      input.idempotencyKey,
    )
    if (result.ok) await publishGameInvalidation(result.value)
    return toOperationResult(result)
  }),

  rematch: baseRouter.lobby.rematch.handler(async ({ input }) => {
    const result = await localGameStore.rematch(
      input.sessionToken,
      input.expectedVersion,
      input.idempotencyKey,
    )
    if (result.ok) await publishGameInvalidation(result.value)
    return toOperationResult(result)
  }),

  // R23 (SELF): rời game giữa ván — session cũ giữ nguyên để xem view.
  leaveGame: baseRouter.lobby.leaveGame.handler(async ({ input }) => {
    const result = await localGameStore.leaveGame(
      input.sessionToken,
      input.expectedVersion,
      input.idempotencyKey,
    )
    if (result.ok) await publishGameInvalidation(result.value)
    return toOperationResult(result)
  }),

  executeGameCommand: baseRouter.lobby.executeGameCommand.handler(
    async ({ input }) => {
      const result = await localGameStore.execute(input)
      if (result.ok) await publishGameInvalidation(result.value)
      return toOperationResult(result)
    },
  ),

  tick: baseRouter.lobby.tick.handler(async ({ input }) => {
    const result = await localGameStore.tick(input)
    if (result.ok) await publishGameInvalidation(result.value)
    return toOperationResult(result)
  }),
})
