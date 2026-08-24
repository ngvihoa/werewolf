import { createClient } from '@supabase/supabase-js'
import { getPublicEnv } from '#/config/env'

import {
  GAME_INVALIDATED_EVENT,
  gameInvalidationSchema,
  gameInvalidationTopic,
} from './game-invalidation'

let publisherClient: ReturnType<typeof createClient> | undefined

function getPublisherClient() {
  const env = getPublicEnv()
  publisherClient ??= createClient(
    env.VITE_SUPABASE_URL,
    env.VITE_SUPABASE_ANON_KEY,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  )
  return publisherClient
}

/** Publish only after the caller's database transaction has completed. */
export async function publishGameInvalidation(input: unknown): Promise<void> {
  const parsed = gameInvalidationSchema.safeParse(input)
  if (!parsed.success) {
    console.error('Refused to publish an invalid game invalidation payload')
    return
  }
  const payload = parsed.data

  try {
    const client = getPublisherClient()
    const channel = client.channel(gameInvalidationTopic(payload.gameId), {
      config: { private: false },
    })
    try {
      await channel.httpSend(GAME_INVALIDATED_EVENT, payload, {
        timeout: 3_000,
      })
    } finally {
      try {
        await client.removeChannel(channel)
      } catch {
        // Cleanup failure is handled as the same best-effort publication.
      }
    }
  } catch (error) {
    // Publication is best-effort. Never turn an already committed command into
    // an API failure, and never include session tokens or private state here.
    console.error('Failed to publish game invalidation', {
      gameId: payload.gameId,
      version: payload.version,
      error,
    })
  }
}
