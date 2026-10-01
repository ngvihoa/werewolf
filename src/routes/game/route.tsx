import type { GameCommand } from '#/game/orchestration/commands'

import { gameViewQueryKey, useGameView } from '#/hooks/useGameView'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Navigate } from '@tanstack/react-router'
import { createIdempotencyKey } from '#/lib/create-idempotency-key'
import { mutationErrorMessage } from '#/game/presentation/mutation-error-message'
import { useLocalSession } from '#/hooks/useLocalSession'
import { PhaseIndicator } from '#/components/ui/PhaseIndicator'
import { SessionError } from '#/components/SessionError'
import { PlayerToken } from '#/components/ui/PlayerToken'
import { AppLoading } from '#/components/AppLoading'
import { RoomHeader } from '#/components/RoomHeader'
import { PlayerGrid } from '#/components/ui/PlayerGrid'
import { orpcClient } from '#/orpc/client'
import { GameShell } from '#/components/ui/GameShell'
import { roleLabel } from '#/game/presentation/labels'
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
  const players = isModerator
    ? view.game.lobbyPlayers.map((player) => ({
        ...player,
        alive:
          view.game.state?.players.find(
            (statePlayer) => statePlayer.id === player.id,
          )?.alive ?? true,
      }))
    : view.players.map((player) => ({ ...player, role: null }))
  const gameStarted = isModerator
    ? view.game.state !== null
    : view.phase !== 'LOBBY'
  const phase = isModerator ? (view.game.state?.phase ?? 'SETUP') : view.phase
  const round = isModerator ? (view.game.state?.round ?? 1) : view.round
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
    <GameShell
      phase={phase}
      header={
        <RoomHeader
          isModerator={isModerator}
          roomCode={roomCode}
          actions={
            isModerator ? (
              <GameHistorySheet
                history={view.game.history}
                names={
                  new Map(
                    view.game.lobbyPlayers.map((player) => [
                      player.id,
                      player.displayName,
                    ]),
                  )
                }
              />
            ) : undefined
          }
          onLeave={leaveSession}
        />
      }
      stage={
        <>
          <PhaseIndicator phase={phase} round={round} />
          <PlayerGrid
            items={players}
            renderItem={(player, index) => (
              <PlayerToken
                key={player.id}
                displayName={player.displayName}
                index={index}
                dead={player.alive === false}
                acting={activePlayerIds.has(player.id)}
                isYou={!isModerator && player.id === view.me.id}
                roleImageSrc={
                  isModerator && player.role
                    ? `/role/${player.role.toLowerCase()}.png`
                    : null
                }
                roleLabelText={
                  isModerator && player.role ? roleLabel(player.role) : null
                }
                statusText={player.alive === false ? 'Đã chết' : null}
              />
            )}
          />
        </>
      }
      sidebar={
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
      }
    />
  )
}

function gameViewId(view: ReturnType<typeof useGameView>['data']): string {
  return view?.viewer === 'MODERATOR' ? view.game.id : (view?.gameId ?? '')
}

function gameViewVersion(view: ReturnType<typeof useGameView>['data']): number {
  return view?.viewer === 'MODERATOR' ? view.game.version : (view?.version ?? 0)
}
