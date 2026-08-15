import type { StoreResult } from '#/game/store/model'
import type { GameView } from '#/game/projections/model'

import { gameCommandSchema } from '#/game/orchestration/schema'
import { type } from '@orpc/contract'
import { z } from 'zod'
import {
    versionedSessionInputSchema,
    createGameResultSchema,
    expectedVersionSchema,
    joinGameResultSchema,
    sessionTokenSchema,
} from '#/game/store/schema'

import { operationResultSchema } from './shared'
import { oc } from './base'

// Contract chỉ ghép các schema từ application boundaries.
// Nó không định nghĩa lại StoreResult hay GameCommand.
export const lobbyContract = {
    createGame: oc
        .input(z.object({ moderatorName: z.string().trim().min(1).max(30) }))
        .output(createGameResultSchema),
    joinGame: oc
        .input(
            z.object({
                roomCode: z.string().trim().length(6),
                displayName: z.string().trim().min(1).max(30),
            }),
        )
        .output(joinGameResultSchema),

    getGameView: oc
        .input(z.object({ sessionToken: sessionTokenSchema }))
        .output(type<StoreResult<GameView>>()),
    setReady: oc
        .input(
            z.object({
                sessionToken: sessionTokenSchema,
                expectedVersion: expectedVersionSchema,
                ready: z.boolean(),
            }),
        )
        .output(operationResultSchema),
    assignRoles: oc
        .input(versionedSessionInputSchema)
        .output(operationResultSchema),
    startGame: oc
        .input(z.object({ sessionToken: sessionTokenSchema }))
        .output(operationResultSchema),
    executeGameCommand: oc
        .input(
            z.object({
                gameId: z.string().min(1),
                sessionToken: sessionTokenSchema,
                expectedVersion: expectedVersionSchema,
                command: gameCommandSchema,
            }),
        )
        .output(operationResultSchema),
}
