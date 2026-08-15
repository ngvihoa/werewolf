import { describe, expect, it } from 'vitest'

import { versionedSessionInputSchema } from './schema'

describe('versioned session input schema', () => {
  it('accepts a session token with a positive version', () => {
    const result = versionedSessionInputSchema.safeParse({
      sessionToken: 'session-token',
      expectedVersion: 2,
    })

    expect(result.success).toBe(true)
  })

  it('rejects a mutation without expectedVersion', () => {
    // Mutation thiếu version không thể tham gia optimistic locking.
    const result = versionedSessionInputSchema.safeParse({
      sessionToken: 'session-token',
    })

    expect(result.success).toBe(false)
  })
})
