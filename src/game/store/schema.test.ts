import { describe, expect, it } from 'vitest'

import {
  createGameResultSchema,
  expectedVersionSchema,
  storeErrorCodeSchema,
} from './schema'

describe('store boundary schemas', () => {
  it('accepts documented store errors and rejects unknown codes', () => {
    expect(storeErrorCodeSchema.safeParse('STALE_VERSION').success).toBe(true)
    expect(storeErrorCodeSchema.safeParse('UNKNOWN_ERROR').success).toBe(false)
  })

  it('requires a positive expected version', () => {
    expect(expectedVersionSchema.safeParse(1).success).toBe(true)
    expect(expectedVersionSchema.safeParse(0).success).toBe(false)
  })

  it('validates the create-game result at runtime', () => {
    const result = createGameResultSchema.safeParse({
      ok: true,
      value: {
        gameId: 'game-1',
        roomCode: 'ABC123',
        moderatorSessionToken: 'secret-token',
      },
    })

    expect(result.success).toBe(true)
  })
})
