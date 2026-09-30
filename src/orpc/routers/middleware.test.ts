import { createProcedureClient, os } from '@orpc/server'
import { describe, expect, it } from 'vitest'
import z from 'zod'

import { sessionTokenGuard } from './middleware'

// Schema cố tình rộng hơn sessionTokenSchema trong contract (không min/max)
// để mỗi case chứng minh chính middleware chặn, không phải input validation.
const guardedProcedure = os
  .use(sessionTokenGuard)
  .input(z.object({ sessionToken: z.string() }))
  .handler(({ input }) => ({ echo: input.sessionToken }))

const openProcedure = os
  .use(sessionTokenGuard)
  .input(z.object({ name: z.string() }))
  .handler(({ input }) => ({ echo: input.name }))

describe('sessionTokenGuard middleware', () => {
  it('lets a well-formed session token reach the handler', async () => {
    const client = createProcedureClient(guardedProcedure)

    await expect(client({ sessionToken: 'ww_abc123_-XYZ' })).resolves.toEqual({
      echo: 'ww_abc123_-XYZ',
    })
  })

  it.each([
    ['empty token', ''],
    ['oversized token', 'a'.repeat(129)],
    ['token with spaces', 'ww_abc def'],
    ['token with special characters', 'ww_abc$def'],
  ])('rejects %s with BAD_REQUEST', async (_label, token) => {
    const client = createProcedureClient(guardedProcedure)

    await expect(client({ sessionToken: token })).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    })
  })

  it('does not affect procedures whose input carries no session token', async () => {
    const client = createProcedureClient(openProcedure)

    await expect(client({ name: 'moderator' })).resolves.toEqual({
      echo: 'moderator',
    })
  })
})
