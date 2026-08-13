import type { StoreResult } from '#/game/store/model'

import { localGameStore } from '#/game/store/local-game-store'

import { baseRouter } from './base'

function toOperationResult<T>(result: StoreResult<T>) {
    return result.ok
        ? { ok: true as const }
        : { ok: false as const, error: result.error }
}

export const lobbyRouter = baseRouter.lobby.router({
    createGame: baseRouter.lobby.createGame.handler(async ({ input }) => {
        return localGameStore.createGame(input.moderatorName)
    }),

    joinGame: baseRouter.lobby.joinGame.handler(async ({ input }) => {
        return localGameStore.joinGame(input.roomCode, input.displayName)
    }),

    getGameView: baseRouter.lobby.getGameView.handler(async ({ input }) => {
        return localGameStore.getGameView(input.sessionToken)
    }),

    setReady: baseRouter.lobby.setReady.handler(async ({ input }) => {
        const result = await localGameStore.setReady(
            input.sessionToken,
            input.expectedVersion,
            input.ready,
        )

        return toOperationResult(result)
    }),

    assignRoles: baseRouter.lobby.assignRoles.handler(async ({ input }) => {
        const result = await localGameStore.assignRoles(input.sessionToken)
        return toOperationResult(result)
    }),

    startGame: baseRouter.lobby.startGame.handler(async ({ input }) => {
        const result = await localGameStore.startGame(input.sessionToken)
        return toOperationResult(result)
    }),

    executeGameCommand: baseRouter.lobby.executeGameCommand.handler(
        async ({ input }) => {
            const result = await localGameStore.execute(input)
            return toOperationResult(result)
        },
    ),
})
