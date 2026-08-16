import { getGameViewResultSchema } from '#/game/projections/schema'
import { gameCommandSchema } from '#/game/orchestration/schema'
import {
  versionedSessionInputSchema,
  createGameResultSchema,
  expectedVersionSchema,
  idempotencyKeySchema,
  joinGameResultSchema,
  sessionTokenSchema,
} from '#/game/store/schema'
import z from 'zod'

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
    .output(getGameViewResultSchema),
  setReady: oc
    .input(
      z.object({
        sessionToken: sessionTokenSchema,
        expectedVersion: expectedVersionSchema,
        ready: z.boolean(),
        idempotencyKey: idempotencyKeySchema,
      }),
    )
    .output(operationResultSchema),
  assignRoles: oc
    .input(versionedSessionInputSchema)
    .output(operationResultSchema),
  startGame: oc
    .input(versionedSessionInputSchema)
    .output(operationResultSchema),
  executeGameCommand: oc
    .input(
      z.object({
        gameId: z.string().min(1),
        sessionToken: sessionTokenSchema,
        idempotencyKey: idempotencyKeySchema,
        expectedVersion: expectedVersionSchema,
        command: gameCommandSchema,
      }),
    )
    .output(operationResultSchema),
}
