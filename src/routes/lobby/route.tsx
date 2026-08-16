import { gameViewQueryKey, useGameView } from '#/hooks/useGameView'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Navigate } from '@tanstack/react-router'
import { createIdempotencyKey } from '#/lib/create-idempotency-key'
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
    mutationFn: ({
      ready,
      idempotencyKey,
    }: {
      ready: boolean
      idempotencyKey: string
    }) =>
      orpcClient.lobby.setReady({
        sessionToken: activeSessionToken,
        expectedVersion:
          viewQuery.data?.viewer === 'MODERATOR'
            ? viewQuery.data.game.version
            : (viewQuery.data?.version ?? 0),
        ready,
        idempotencyKey,
      }),
    onSuccess: invalidateView,
  })
  const assignMutation = useMutation({
    mutationFn: ({
      expectedVersion,
      idempotencyKey,
    }: {
      expectedVersion: number
      idempotencyKey: string
    }) =>
      orpcClient.lobby.assignRoles({
        sessionToken: activeSessionToken,
        expectedVersion,
        idempotencyKey,
      }),
    onSuccess: invalidateView,
  })
  const startMutation = useMutation({
    mutationFn: ({
      expectedVersion,
      idempotencyKey,
    }: {
      expectedVersion: number
      idempotencyKey: string
    }) =>
      orpcClient.lobby.startGame({
        sessionToken: activeSessionToken,
        expectedVersion,
        idempotencyKey,
      }),
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
    mutationError = readyMutation.data.error.message
  } else if (assignMutation.data?.ok === false) {
    mutationError = assignMutation.data.error.message
  } else if (startMutation.data?.ok === false) {
    mutationError = startMutation.data.error.message
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
                // Lấy version tại thời điểm click để server phát hiện request cũ.
                onAssign={() =>
                  assignMutation.mutate({
                    expectedVersion: version,
                    idempotencyKey: createIdempotencyKey(),
                  })
                }
                // Start game cũng dùng optimistic locking như các lobby mutation khác.
                onStart={() =>
                  startMutation.mutate({
                    expectedVersion: version,
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
