import { describe, expect, it, vi } from 'vitest'

import {
  gameInvalidationSchema,
  handleGameInvalidation,
} from './game-invalidation'

const GAME_ID = '8fdb2541-698d-4b28-897a-a282b9e68531'

describe('game invalidation boundary', () => {
  it('accepts only the closed public payload', () => {
    expect(
      gameInvalidationSchema.safeParse({ gameId: GAME_ID, version: 4 }).success,
    ).toBe(true)
    expect(
      gameInvalidationSchema.safeParse({
        gameId: GAME_ID,
        version: 4,
        role: 'SEER',
      }).success,
    ).toBe(false)
    expect(
      gameInvalidationSchema.safeParse({ gameId: 'room-code', version: 4 })
        .success,
    ).toBe(false)
  })

  it('invalidates once for a newer version and suppresses duplicates or old versions', () => {
    const invalidate = vi.fn()
    const boundary = {
      gameId: GAME_ID,
      renderedVersion: 3,
      latestAcceptedVersion: 3,
    }

    expect(
      handleGameInvalidation(
        { gameId: GAME_ID, version: 4 },
        boundary,
        invalidate,
      ),
    ).toBe(true)
    expect(
      handleGameInvalidation(
        { gameId: GAME_ID, version: 4 },
        boundary,
        invalidate,
      ),
    ).toBe(false)
    expect(
      handleGameInvalidation(
        { gameId: GAME_ID, version: 2 },
        boundary,
        invalidate,
      ),
    ).toBe(false)
    expect(invalidate).toHaveBeenCalledTimes(1)
  })

  it('ignores an invalidation for another game', () => {
    const invalidate = vi.fn()
    const boundary = {
      gameId: GAME_ID,
      renderedVersion: 3,
      latestAcceptedVersion: 3,
    }

    expect(
      handleGameInvalidation(
        {
          gameId: '4a4fd0bb-16f9-4d5e-bf5f-a44b709b5203',
          version: 4,
        },
        boundary,
        invalidate,
      ),
    ).toBe(false)
    expect(invalidate).not.toHaveBeenCalled()
  })
})
