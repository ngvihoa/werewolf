import { describe, expect, it } from 'vitest'

import { gameCommandSchema, gameEventSchema } from './schema'

describe('game command schema', () => {
  it('accepts a valid night action command', () => {
    const result = gameCommandSchema.safeParse({
      type: 'SUBMIT_NIGHT_ACTION',
      action: {
        type: 'SEER_INSPECT',
        actorId: 'seer-1',
        targetId: 'player-2',
      },
    })

    expect(result.success).toBe(true)
  })

  it('rejects moderator decisions without a reason', () => {
    const result = gameCommandSchema.safeParse({ type: 'REJECT_STEP' })

    expect(result.success).toBe(false)
  })
})

describe('game event schema', () => {
  it('accepts an event with its matching nested resolution', () => {
    const result = gameEventSchema.safeParse({
      type: 'VOTE_RESOLVED',
      resolution: {
        outcome: 'ELIMINATED',
        playerId: 'player-1',
      },
    })

    expect(result.success).toBe(true)
  })

  it('rejects an event whose payload belongs to another event type', () => {
    const result = gameEventSchema.safeParse({
      type: 'GAME_ENDED',
      resolution: { outcome: 'NO_ELIMINATION' },
    })

    // GAME_ENDED cần winner; resolution chỉ hợp lệ với VOTE_RESOLVED.
    expect(result.success).toBe(false)
  })
})
