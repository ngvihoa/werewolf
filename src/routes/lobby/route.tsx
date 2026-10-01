import type { RoleCompositionSelection } from '#/game/domain'

import { useLocalSession, useIsHydrated } from '#/hooks/useLocalSession'
import { gameViewQueryKey, useGameView } from '#/hooks/useGameView'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Navigate } from '@tanstack/react-router'
import { createIdempotencyKey } from '#/lib/create-idempotency-key'
import { mutationErrorMessage } from '#/game/presentation/mutation-error-message'
import { PhaseIndicator } from '#/components/ui/PhaseIndicator'
import { SessionError } from '#/components/SessionError'
import { RoomSummary } from '#/components/RoomSummary'
import { PlayerToken } from '#/components/ui/PlayerToken'
import { AppLoading } from '#/components/AppLoading'
import { RoomHeader } from '#/components/RoomHeader'
import { PlayerGrid } from '#/components/ui/PlayerGrid'
import { orpcClient } from '#/orpc/client'
import { GameShell } from '#/components/ui/GameShell'
import { roleLabel } from '#/game/presentation/labels'

import { ModeratorControls } from './-components/ModeratorControls'
import { PlayerControls } from './-components/PlayerControls'

export const Route = createFileRoute('/lobby')({ component: LobbyPage })

function LobbyPage() {
  const { sessionToken, leaveSession } = useLocalSession()
  const hydrated = useIsHydrated()
  const queryClient = useQueryClient()
  const activeSessionToken = sessionToken ?? ''
  const viewQuery = useGameView(activeSessionToken)
  const invalidateView = () =>
    queryClient.invalidateQueries({
      queryKey: gameViewQueryKey(activeSessionToken),
    })
  const readyMutation = useMutation({
    mutationFn: async ({
      ready,
      idempotencyKey,
    }: {
      ready: boolean
      idempotencyKey: string
    }) => {
      let result = await orpcClient.lobby.setReady({
        sessionToken: activeSessionToken,
        expectedVersion: gameViewVersion(viewQuery.data),
        ready,
        idempotencyKey,
      })
      if (!result.ok && result.error.code === 'STALE_VERSION') {
        const refreshed = await viewQuery.refetch()
        if (refreshed.isSuccess && refreshed.data) {
          result = await orpcClient.lobby.setReady({
            sessionToken: activeSessionToken,
            expectedVersion: gameViewVersion(refreshed.data),
            ready,
            idempotencyKey,
          })
        }
      }
      return result
    },
    onSuccess: invalidateView,
  })
  const assignMutation = useMutation({
    mutationFn: async ({
      composition,
      idempotencyKey,
    }: {
      composition: RoleCompositionSelection
      idempotencyKey: string
    }) => {
      let result = await orpcClient.lobby.assignRoles({
        sessionToken: activeSessionToken,
        expectedVersion: gameViewVersion(viewQuery.data),
        idempotencyKey,
        composition,
      })
      if (!result.ok && result.error.code === 'STALE_VERSION') {
        const refreshed = await viewQuery.refetch()
        if (refreshed.isSuccess && refreshed.data) {
          result = await orpcClient.lobby.assignRoles({
            sessionToken: activeSessionToken,
            expectedVersion: gameViewVersion(refreshed.data),
            idempotencyKey,
            composition,
          })
        }
      }
      return result
    },
    onSuccess: invalidateView,
  })
  const startMutation = useMutation({
    mutationFn: async ({ idempotencyKey }: { idempotencyKey: string }) => {
      let result = await orpcClient.lobby.startGame({
        sessionToken: activeSessionToken,
        expectedVersion: gameViewVersion(viewQuery.data),
        idempotencyKey,
      })
      if (!result.ok && result.error.code === 'STALE_VERSION') {
        const refreshed = await viewQuery.refetch()
        if (refreshed.isSuccess && refreshed.data) {
          result = await orpcClient.lobby.startGame({
            sessionToken: activeSessionToken,
            expectedVersion: gameViewVersion(refreshed.data),
            idempotencyKey,
          })
        }
      }
      return result
    },
    onSuccess: invalidateView,
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
  const isModerator = view.viewer === 'MODERATOR'
  const roomCode = isModerator ? view.game.roomCode : view.roomCode
  const version = isModerator ? view.game.version : view.version
  const players = isModerator
    ? view.game.lobbyPlayers
    : view.players.map((player) => ({ ...player, role: null }))
  const rolesAssigned = isModerator
    ? players.length > 0 && players.every((player) => player.role !== null)
    : view.me.role !== null
  const allReady = players.length > 0 && players.every((player) => player.ready)
  const gameStarted = isModerator
    ? view.game.state !== null
    : view.phase !== 'LOBBY'

  if (gameStarted) return <Navigate to="/game" replace />

  let mutationError: string | null = null
  if (readyMutation.data?.ok === false) {
    mutationError = mutationErrorMessage(readyMutation.data.error)
  } else if (readyMutation.error) {
    mutationError = mutationErrorMessage(readyMutation.error)
  } else if (assignMutation.data?.ok === false) {
    mutationError = mutationErrorMessage(assignMutation.data.error)
  } else if (assignMutation.error) {
    mutationError = mutationErrorMessage(assignMutation.error)
  } else if (startMutation.data?.ok === false) {
    mutationError = mutationErrorMessage(startMutation.data.error)
  } else if (startMutation.error) {
    mutationError = mutationErrorMessage(startMutation.error)
  }

  return (
    <GameShell
      phase="LOBBY"
      header={
        <RoomHeader
          isModerator={isModerator}
          roomCode={roomCode}
          onLeave={leaveSession}
        />
      }
    >
      <PhaseIndicator phase="LOBBY" round={1} />
      <RoomSummary gameStarted={false} roomCode={roomCode} version={version} />
      {view.viewer === 'MODERATOR' ? (
        <ModeratorControls
          playerCount={players.length}
          rolesAssigned={rolesAssigned}
          allReady={allReady}
          assigning={assignMutation.isPending}
          starting={startMutation.isPending}
          error={mutationError}
          onAssign={(composition) =>
            assignMutation.mutate({
              composition,
              idempotencyKey: createIdempotencyKey(),
            })
          }
          // Start game cũng dùng optimistic locking như các lobby mutation khác.
          onStart={() =>
            startMutation.mutate({
              idempotencyKey: createIdempotencyKey(),
            })
          }
        />
      ) : (
        <PlayerControls
          role={view.me.role}
          ready={view.me.ready}
          pending={readyMutation.isPending}
          error={mutationError}
          onReadyChange={(ready) =>
            readyMutation.mutate({
              ready,
              idempotencyKey: createIdempotencyKey(),
            })
          }
        />
      )}
      <div className="mt-1 border-t border-line pt-5 opacity-70">
        <PlayerGrid
          items={players}
          renderItem={(player, index) => (
            <PlayerToken
              key={player.id}
              displayName={player.displayName}
              index={index}
              roleImageSrc={
                isModerator && player.role
                  ? `/role/${player.role.toLowerCase()}.png`
                  : null
              }
              roleLabelText={
                isModerator && player.role ? roleLabel(player.role) : null
              }
              statusText={
                !rolesAssigned
                  ? 'Đang chờ'
                  : player.ready
                    ? 'Sẵn sàng'
                    : 'Xem vai'
              }
            />
          )}
        />
      </div>
    </GameShell>
  )
}

function gameViewVersion(view: ReturnType<typeof useGameView>['data']): number {
  return view?.viewer === 'MODERATOR' ? view.game.version : (view?.version ?? 0)
}
