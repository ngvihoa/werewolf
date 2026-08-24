import type { GameView } from '#/game/projections/model'

import { orpcClient } from '#/orpc/client'
import { useQuery } from '@tanstack/react-query'

import { useGameInvalidation } from './useGameInvalidation'
import { gameViewQueryKey } from './useGameView.query'

export { gameViewQueryKey } from './useGameView.query'

export function useGameView(sessionToken: string) {
  const query = useQuery({
    queryKey: gameViewQueryKey(sessionToken),
    queryFn: async () => {
      const result = await orpcClient.lobby.getGameView({ sessionToken })
      if (!result.ok) throw new Error(result.error.message)
      return result.value
    },
    enabled: Boolean(sessionToken),
    refetchInterval: ({ state }) =>
      needsFastPolling(state.data) ? 4_000 : 12_000,
    refetchIntervalInBackground: false,
    refetchOnReconnect: 'always',
    refetchOnWindowFocus: 'always',
  })

  useGameInvalidation({
    gameId: gameViewId(query.data),
    renderedVersion: gameViewVersion(query.data),
    sessionToken,
  })

  return query
}

function gameViewId(view: GameView | undefined): string {
  if (!view) return ''
  return view.viewer === 'MODERATOR' ? view.game.id : view.gameId
}

function gameViewVersion(view: GameView | undefined): number {
  if (!view) return 0
  return view.viewer === 'MODERATOR' ? view.game.version : view.version
}

function needsFastPolling(view: GameView | undefined): boolean {
  if (!view) return false
  const queue =
    view.viewer === 'MODERATOR' ? view.game.state?.queue : view.queue
  return Boolean(
    queue?.some(
      (item) =>
        item.status === 'ACTIVE' ||
        item.status === 'WAITING_MODERATOR_CONFIRMATION',
    ),
  )
}
