import z from 'zod'

export const GAME_INVALIDATED_EVENT = 'game-invalidated'

export const gameInvalidationSchema = z
  .object({
    gameId: z.uuid(),
    version: z.number().int().positive(),
  })
  .strict()

export type GameInvalidation = z.infer<typeof gameInvalidationSchema>

export type GameInvalidationBoundary = {
  gameId: string
  renderedVersion: number
  latestAcceptedVersion: number
}

export function gameInvalidationTopic(gameId: string): string {
  return `game:${z.uuid().parse(gameId)}`
}

/**
 * Realtime is only an invalidation signal. It never writes the payload into
 * TanStack Query's cache, and advances the boundary before invalidating so
 * duplicate events cannot trigger duplicate immediate refetches.
 */
export function handleGameInvalidation(
  input: unknown,
  boundary: GameInvalidationBoundary,
  invalidate: () => void,
): boolean {
  const parsed = gameInvalidationSchema.safeParse(input)
  if (!parsed.success) return false

  const invalidation = parsed.data
  const newestKnownVersion = Math.max(
    boundary.renderedVersion,
    boundary.latestAcceptedVersion,
  )
  if (
    invalidation.gameId !== boundary.gameId ||
    invalidation.version <= newestKnownVersion
  ) {
    return false
  }

  boundary.latestAcceptedVersion = invalidation.version
  invalidate()
  return true
}
