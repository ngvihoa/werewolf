import type { GameCommand } from '#/game/orchestration/commands'

import { gameViewQueryKey, useGameView } from '#/hooks/useGameView'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Navigate } from '@tanstack/react-router'
import { useLocalSession } from '#/hooks/useLocalSession'
import { SessionError } from '#/components/SessionError'
import { RoomSummary } from '#/components/RoomSummary'
import { AppLoading } from '#/components/AppLoading'
import { PlayerList } from '#/components/PlayerList'
import { RoomHeader } from '#/components/RoomHeader'
import { orpcClient } from '#/orpc/client'
import { STEP_ROLE } from '#/game/rules/transitions'

import { GameHistorySheet } from './-components/GameHistorySheet'
import { GameBoard } from './-components/GameBoard'

export const Route = createFileRoute('/game')({ component: GamePage })

function GamePage() {
  const { sessionToken, leaveSession } = useLocalSession()
  const activeSessionToken = sessionToken ?? ''
  const queryClient = useQueryClient()
  const viewQuery = useGameView(activeSessionToken)
  const invalidateView = () =>
    queryClient.invalidateQueries({
      queryKey: gameViewQueryKey(activeSessionToken),
    })
  const commandMutation = useMutation({
    mutationFn: (command: GameCommand) =>
      orpcClient.lobby.executeGameCommand({
        gameId:
          viewQuery.data?.viewer === 'MODERATOR'
            ? viewQuery.data.game.id
            : (viewQuery.data?.gameId ?? ''),
        sessionToken: activeSessionToken,
        expectedVersion:
          viewQuery.data?.viewer === 'MODERATOR'
            ? viewQuery.data.game.version
            : (viewQuery.data?.version ?? 0),
        command,
      }),
    async onSuccess(result) {
      await invalidateView()
      if (!result.ok && result.error.code === 'STALE_VERSION') {
        commandMutation.reset()
      }
    },
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
  const gameStarted = isModerator
    ? view.game.state !== null
    : view.phase !== 'LOBBY'
  const playerNames = new Map(
    players.map((player) => [player.id, player.displayName]),
  )
  const activeQueueItem = isModerator
    ? view.game.state?.queue.find(
        (item) =>
          item.status === 'ACTIVE' ||
          item.status === 'WAITING_MODERATOR_CONFIRMATION',
      )
    : null
  const activeRole = activeQueueItem ? STEP_ROLE[activeQueueItem.step] : null
  const pendingActorId = isModerator
    ? view.game.state?.pendingNightAction?.actorId
    : null
  const activePlayerIds = new Set(
    pendingActorId
      ? [pendingActorId]
      : isModerator && activeRole
        ? view.game.state?.players
            .filter((player) => player.alive && player.role === activeRole)
            .map((player) => player.id)
        : [],
  )

  if (!gameStarted) return <Navigate to="/lobby" replace />

  const mutationError =
    commandMutation.data?.ok === false
      ? commandMutation.data.error.message
      : null

  return (
    <main className="isolate min-h-dvh px-5 py-6 sm:px-8 sm:py-8 lg:px-12">
      <div className="mx-auto flex max-w-6xl flex-col gap-10">
        <RoomHeader
          actions={
            isModerator ? (
              <GameHistorySheet
                history={view.game.history}
                names={playerNames}
              />
            ) : undefined
          }
          isModerator={isModerator}
          onLeave={leaveSession}
        />
        <section className="grid gap-10 lg:grid-cols-[3fr_2fr] lg:gap-16">
          <div className="flex min-w-0 flex-col gap-8">
            <RoomSummary gameStarted roomCode={roomCode} version={version} />
            <PlayerList
              players={players}
              isModerator={isModerator}
              rolesAssigned={rolesAssigned}
              activePlayerIds={activePlayerIds}
            />
          </div>
          <aside className="min-w-0 border-t border-white/10 pt-8 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-10">
            <GameBoard
              view={view}
              pending={commandMutation.isPending}
              error={mutationError}
              onCommand={(command) => commandMutation.mutate(command)}
            />
          </aside>
        </section>
      </div>
    </main>
  )
}
