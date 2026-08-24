import { REALTIME_SUBSCRIBE_STATES } from '@supabase/supabase-js'
import { getSupabaseBrowserClient } from '#/integrations/supabase/client'
import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  GAME_INVALIDATED_EVENT,
  handleGameInvalidation,
  gameInvalidationTopic,
} from '#/realtime/game-invalidation'

import { gameViewQueryKey } from './useGameView.query'

type GameInvalidationSubscription = {
  gameId: string
  renderedVersion: number
  sessionToken: string
}

export function useGameInvalidation({
  gameId,
  renderedVersion,
  sessionToken,
}: GameInvalidationSubscription) {
  const queryClient = useQueryClient()
  const renderedVersionRef = useRef(renderedVersion)
  renderedVersionRef.current = renderedVersion

  useEffect(() => {
    if (!gameId || !sessionToken) return

    const client = getSupabaseBrowserClient()
    const boundary = {
      gameId,
      renderedVersion: renderedVersionRef.current,
      latestAcceptedVersion: renderedVersionRef.current,
    }
    let subscribedOnce = false
    const invalidate = () => {
      void queryClient.invalidateQueries({
        queryKey: gameViewQueryKey(sessionToken),
      })
    }
    const channel = client
      .channel(gameInvalidationTopic(gameId), {
        config: { private: false },
      })
      .on('broadcast', { event: GAME_INVALIDATED_EVENT }, ({ payload }) => {
        boundary.renderedVersion = renderedVersionRef.current
        handleGameInvalidation(payload, boundary, invalidate)
      })
      .subscribe((status, error) => {
        if (status === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED) {
          // A rejoin may have missed broadcasts, so converge from the server.
          if (subscribedOnce) invalidate()
          subscribedOnce = true
          return
        }
        if (
          status === REALTIME_SUBSCRIBE_STATES.CHANNEL_ERROR ||
          status === REALTIME_SUBSCRIBE_STATES.TIMED_OUT
        ) {
          console.warn('Game invalidation channel unavailable', {
            gameId,
            status,
            error,
          })
        }
      })

    return () => {
      void client.removeChannel(channel)
    }
  }, [gameId, queryClient, sessionToken])
}
