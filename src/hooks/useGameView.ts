import { orpcClient } from '#/orpc/client'
import { useQuery } from '@tanstack/react-query'

export const gameViewQueryKey = (sessionToken: string) => [
  'local-game-view',
  sessionToken,
]

export function useGameView(sessionToken: string) {
  return useQuery({
    queryKey: gameViewQueryKey(sessionToken),
    queryFn: async () => {
      const result = await orpcClient.lobby.getGameView({ sessionToken })
      if (!result.ok) throw new Error(result.error.message)
      return result.value
    },
    enabled: Boolean(sessionToken),
    refetchInterval: 10_000,
  })
}
