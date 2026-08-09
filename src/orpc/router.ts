import type { ORPCContext } from './context'

import { localGameStore } from '#/game/store/local-game-store'
import { os } from '@orpc/server'
import { z } from 'zod'

const procedure = os.$context<ORPCContext>()

const health = procedure
  .input(z.object({}))
  .output(
    z.object({
      status: z.literal('ok'),
      timestamp: z.string(),
    }),
  )
  .handler(() => ({
    status: 'ok' as const,
    timestamp: new Date().toISOString(),
  }))

const createGame = procedure
  .input(z.object({ moderatorName: z.string().trim().min(1).max(30) }))
  .handler(({ input }) => localGameStore.createGame(input.moderatorName))

const joinGame = procedure
  .input(
    z.object({
      roomCode: z.string().trim().length(6),
      displayName: z.string().trim().min(1).max(30),
    }),
  )
  .handler(({ input }) =>
    localGameStore.joinGame(input.roomCode, input.displayName),
  )

const getGameView = procedure
  .input(z.object({ sessionToken: z.string().min(1) }))
  .handler(({ input }) => localGameStore.getGameView(input.sessionToken))

const setReady = procedure
  .input(z.object({ sessionToken: z.string().min(1), ready: z.boolean() }))
  .handler(({ input }) =>
    toOperationResult(localGameStore.setReady(input.sessionToken, input.ready)),
  )

const assignRoles = procedure
  .input(z.object({ sessionToken: z.string().min(1) }))
  .handler(({ input }) =>
    toOperationResult(localGameStore.assignRoles(input.sessionToken)),
  )

const startGame = procedure
  .input(z.object({ sessionToken: z.string().min(1) }))
  .handler(({ input }) =>
    toOperationResult(localGameStore.startGame(input.sessionToken)),
  )

export const appRouter = {
  health,
  lobby: {
    createGame,
    joinGame,
    getGameView,
    setReady,
    assignRoles,
    startGame,
  },
}

export type AppRouter = typeof appRouter

function toOperationResult<T>(result: {
  ok: boolean
  value?: T
  error?: { code: string; message: string }
}) {
  return result.ok
    ? { ok: true as const }
    : {
      ok: false as const,
      error: result.error ?? {
        code: 'UNKNOWN',
        message: 'Unknown local store error',
      },
    }
}
