import { gameViewQueryKey, useGameView } from '#/hooks/useGameView'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Navigate } from '@tanstack/react-router'
import { createIdempotencyKey } from '#/lib/create-idempotency-key'
import { mutationErrorMessage } from '#/game/presentation/mutation-error-message'
import { useLocalSession } from '#/hooks/useLocalSession'
import { SessionError } from '#/components/SessionError'
import { RoomSummary } from '#/components/RoomSummary'
import { AppLoading } from '#/components/AppLoading'
import { PlayerList } from '#/components/PlayerList'
import { RoomHeader } from '#/components/RoomHeader'
import { orpcClient } from '#/orpc/client'

import { ModeratorControls } from './-components/ModeratorControls'
import { PlayerControls } from './-components/PlayerControls'

export const Route = createFileRoute('/lobby')({ component: LobbyPage })

function LobbyPage() {
  const { sessionToken, leaveSession } = useLocalSession()
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
    mutationFn: async ({ idempotencyKey }: { idempotencyKey: string }) => {
      let result = await orpcClient.lobby.assignRoles({
        sessionToken: activeSessionToken,
        expectedVersion: gameViewVersion(viewQuery.data),
        idempotencyKey,
      })
      if (!result.ok && result.error.code === 'STALE_VERSION') {
        const refreshed = await viewQuery.refetch()
        if (refreshed.isSuccess && refreshed.data) {
          result = await orpcClient.lobby.assignRoles({
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
    <main className="isolate min-h-dvh px-5 py-6 sm:px-8 sm:py-8 lg:px-12">
      <div className="mx-auto flex max-w-6xl flex-col gap-10">
        <RoomHeader isModerator={isModerator} onLeave={leaveSession} />
        <section className="grid gap-10 lg:grid-cols-[3fr_2fr] lg:gap-16">
          <div className="flex min-w-0 flex-col gap-8">
            <RoomSummary
              gameStarted={false}
              roomCode={roomCode}
              version={version}
            />
            <PlayerList
              players={players}
              isModerator={isModerator}
              rolesAssigned={rolesAssigned}
              currentPlayerId={isModerator ? undefined : view.me.id}
            />
          </div>
          <aside className="min-w-0 border-t border-white/10 pt-8 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-10">
            {view.viewer === 'MODERATOR' ? (
              <ModeratorControls
                playerCount={players.length}
                rolesAssigned={rolesAssigned}
                allReady={allReady}
                assigning={assignMutation.isPending}
                starting={startMutation.isPending}
                error={mutationError}
                onAssign={() =>
                  assignMutation.mutate({
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
          </aside>
        </section>
      </div>
    </main>
  )
}

function gameViewVersion(view: ReturnType<typeof useGameView>['data']): number {
  return view?.viewer === 'MODERATOR' ? view.game.version : (view?.version ?? 0)
}
