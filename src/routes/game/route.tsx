import type { GameCommand } from '#/game/orchestration/commands'

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
    mutationFn: async ({
      command,
      idempotencyKey,
    }: {
      command: GameCommand
      idempotencyKey: string
    }) => {
      let result = await orpcClient.lobby.executeGameCommand({
        gameId: gameViewId(viewQuery.data),
        sessionToken: activeSessionToken,
        idempotencyKey,
        expectedVersion: gameViewVersion(viewQuery.data),
        command,
      })
      if (!result.ok && result.error.code === 'STALE_VERSION') {
        const refreshed = await viewQuery.refetch()
        if (refreshed.isSuccess && refreshed.data) {
          result = await orpcClient.lobby.executeGameCommand({
            gameId: gameViewId(refreshed.data),
            sessionToken: activeSessionToken,
            idempotencyKey,
            expectedVersion: gameViewVersion(refreshed.data),
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
  const rematchMutation = useMutation({
    mutationFn: async ({ idempotencyKey }: { idempotencyKey: string }) => {
      let result = await orpcClient.lobby.rematch({
        sessionToken: activeSessionToken,
        idempotencyKey,
        expectedVersion: gameViewVersion(viewQuery.data),
      })
      if (!result.ok && result.error.code === 'STALE_VERSION') {
        const refreshed = await viewQuery.refetch()
        if (refreshed.isSuccess && refreshed.data) {
          result = await orpcClient.lobby.rematch({
            sessionToken: activeSessionToken,
            idempotencyKey,
            expectedVersion: gameViewVersion(refreshed.data),
          })
        }
      }
      return result
    },
    async onSuccess() {
      await invalidateView()
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
    ? view.game.lobbyPlayers.map((player) => ({
        ...player,
        alive:
          view.game.state?.players.find(
            (statePlayer) => statePlayer.id === player.id,
          )?.alive ?? true,
      }))
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
    rematchMutation.data?.ok === false
      ? mutationErrorMessage(rematchMutation.data.error)
      : rematchMutation.error
        ? mutationErrorMessage(rematchMutation.error)
        : commandMutation.data?.ok === false
          ? mutationErrorMessage(commandMutation.data.error)
          : commandMutation.error
            ? mutationErrorMessage(commandMutation.error)
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
              currentPlayerId={isModerator ? undefined : view.me.id}
              showLifeStatus
            />
          </div>
          <aside className="min-w-0 border-t border-white/10 pt-8 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-10">
            <GameBoard
              view={view}
              pending={commandMutation.isPending || rematchMutation.isPending}
              error={mutationError}
              onCommand={(command) =>
                commandMutation.mutate({
                  command,
                  idempotencyKey: createIdempotencyKey(),
                })
              }
              onRematch={() =>
                rematchMutation.mutate({
                  idempotencyKey: createIdempotencyKey(),
                })
              }
            />
          </aside>
        </section>
      </div>
    </main>
  )
}

function gameViewId(view: ReturnType<typeof useGameView>['data']): string {
  return view?.viewer === 'MODERATOR' ? view.game.id : (view?.gameId ?? '')
}

function gameViewVersion(view: ReturnType<typeof useGameView>['data']): number {
  return view?.viewer === 'MODERATOR' ? view.game.version : (view?.version ?? 0)
}
