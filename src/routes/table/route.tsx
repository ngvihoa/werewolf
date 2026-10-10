import type { GameCommand } from '#/game/orchestration/commands'

import { useLocalSession, useIsHydrated } from '#/hooks/useLocalSession'
import { gameViewQueryKey, useGameView } from '#/hooks/useGameView'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Navigate } from '@tanstack/react-router'
import { createIdempotencyKey } from '#/lib/create-idempotency-key'
import { mutationErrorMessage } from '#/game/presentation/mutation-error-message'
import { PhaseIndicator } from '#/components/ui/PhaseIndicator'
import { NOINDEX_ROBOTS } from '#/lib/site'
import { SessionError } from '#/components/SessionError'
import { PlayerToken } from '#/components/ui/PlayerToken'
import { AppLoading } from '#/components/AppLoading'
import { RoomHeader } from '#/components/RoomHeader'
import { PlayerGrid } from '#/components/ui/PlayerGrid'
import { orpcClient } from '#/orpc/client'
import { roleArtUrl } from '#/game/presentation/role-art'
import { GameShell } from '#/components/ui/GameShell'
import { roleLabel } from '#/game/presentation/labels'

import { TableGamePanel } from './-components/TableGamePanel'

export const Route = createFileRoute('/table')({
  component: TablePage,
  head: () => ({ meta: NOINDEX_ROBOTS }),
})

/**
 * Revamp MODERATED (M11): trang riêng cho người chơi MODERATED — bàn vật lý
 * do quản trò điều phối, thiết bị người chơi chỉ giữ vai + dữ liệu riêng +
 * biểu quyết ban ngày. Guards hai chiều với /game: ai vào nhầm được đá đúng
 * chỗ, join flow không cần biết mode.
 */
function TablePage() {
  const { sessionToken, leaveSession } = useLocalSession()
  const hydrated = useIsHydrated()
  const activeSessionToken = sessionToken ?? ''
  const queryClient = useQueryClient()
  const viewQuery = useGameView(activeSessionToken)
  const invalidateView = () =>
    queryClient.invalidateQueries({
      queryKey: gameViewQueryKey(activeSessionToken),
    })
  const commandMutation = useMutation({
    mutationFn: async ({
      command,
      idempotencyKey,
    }: {
      command: GameCommand
      idempotencyKey: string
    }) => {
      let result = await orpcClient.lobby.executeGameCommand({
        gameId: playerViewId(viewQuery.data),
        sessionToken: activeSessionToken,
        idempotencyKey,
        expectedVersion: playerViewVersion(viewQuery.data),
        command,
      })
      if (!result.ok && result.error.code === 'STALE_VERSION') {
        const refreshed = await viewQuery.refetch()
        if (refreshed.isSuccess && refreshed.data) {
          result = await orpcClient.lobby.executeGameCommand({
            gameId: playerViewId(refreshed.data),
            sessionToken: activeSessionToken,
            idempotencyKey,
            expectedVersion: playerViewVersion(refreshed.data),
            command,
          })
        }
      }
      return result
    },
    async onSuccess() {
      await invalidateView()
    },
  })

  if (!hydrated) return <AppLoading />
  if (!sessionToken) return <Navigate to="/" replace />
  if (viewQuery.isPending) return <AppLoading />
  if (viewQuery.isError || !viewQuery.data) {
    return (
      <SessionError message={viewQuery.error?.message} onLeave={leaveSession} />
    )
  }

  const view = viewQuery.data
  // M11: guard hai chiều — quản trò và người chơi SELF thuộc /game.
  if (view.viewer !== 'PLAYER' || view.gameMode !== 'MODERATED') {
    return <Navigate to="/game" replace />
  }
  if (view.phase === 'LOBBY') return <Navigate to="/lobby" replace />

  const mutationError =
    commandMutation.data?.ok === false
      ? mutationErrorMessage(commandMutation.data.error)
      : commandMutation.error
        ? mutationErrorMessage(commandMutation.error)
        : null

  return (
    <GameShell
      phase={view.phase}
      winner={view.winner}
      header={
        <RoomHeader
          isModerator={false}
          roomCode={view.roomCode}
          onLeave={leaveSession}
        />
      }
    >
      <PhaseIndicator phase={view.phase} round={view.round} />
      <TableGamePanel
        view={view}
        pending={commandMutation.isPending}
        error={mutationError}
        onCommand={(command) =>
          commandMutation.mutate({
            command,
            idempotencyKey: createIdempotencyKey(),
          })
        }
      />
      {/* Lưới public: chết hiện "Đã chết", acting chỉ sáng sau gate công bố
          (projection MODERATED không lộ tiến trình queue). */}
      <div className="mt-1 border-t border-line pt-5 opacity-70">
        <PlayerGrid
          items={view.players}
          renderItem={(player, index) => (
            <PlayerToken
              key={player.id}
              displayName={player.displayName}
              index={index}
              dead={player.alive === false}
              statusText={player.alive === false ? 'Đã chết' : null}
              roleImageSrc={
                view.phase === 'GAME_OVER' && player.role
                  ? roleArtUrl(player.role)
                  : null
              }
              roleLabelText={
                view.phase === 'GAME_OVER' && player.role
                  ? roleLabel(player.role)
                  : null
              }
            />
          )}
        />
      </div>
    </GameShell>
  )
}

// Trang này chỉ phục vụ PLAYER (guard trên đá mod/SELF về /game) nên helpers
// chỉ đọc nhánh PLAYER của union.
function playerViewId(view: ReturnType<typeof useGameView>['data']): string {
  return view?.viewer === 'PLAYER' ? view.gameId : ''
}

function playerViewVersion(
  view: ReturnType<typeof useGameView>['data'],
): number {
  return view?.viewer === 'PLAYER' ? view.version : 0
}
