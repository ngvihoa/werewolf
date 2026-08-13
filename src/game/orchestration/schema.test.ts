import { describe, expect, it } from 'vitest'

import { gameCommandSchema } from './schema'

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
