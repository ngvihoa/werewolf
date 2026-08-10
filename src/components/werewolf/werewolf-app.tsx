import type { GameView, PlayerGameView } from '#/game/projections/model'
import type { GameCommand } from '#/game/orchestration/commands'
import type { GameState } from '#/game/orchestration/model'
import type { FormEvent } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { orpcClient } from '#/orpc/client'
import { Navigate } from '@tanstack/react-router'
import { useState } from 'react'

import { AppLoading, InlineError, LobbyError } from './feedback'
import { ModeratorControls, PlayerControls } from './lobby-controls'
import {
  queueStatusLabel,
  queueStepLabel,
  phaseLabel,
  roleLabel,
} from './labels'

export function RoomPage({
  sessionToken,
  onLeave,
  page,
}: {
  sessionToken: string
  onLeave: () => void
  page: 'LOBBY' | 'GAME'
}) {
  const queryClient = useQueryClient()
  const viewQuery = useQuery({
    queryKey: ['local-game-view', sessionToken],
    queryFn: async () => {
      const result = await orpcClient.lobby.getGameView({ sessionToken })
      if (!result.ok) throw new Error(result.error.message)
      return result.value
    },
    refetchInterval: 10_000,
  })

  const invalidateView = () =>
    queryClient.invalidateQueries({
      queryKey: ['local-game-view', sessionToken],
    })
  const readyMutation = useMutation({
    mutationFn: (ready: boolean) =>
      orpcClient.lobby.setReady({ sessionToken, ready }),
    onSuccess: invalidateView,
  })
  const assignMutation = useMutation({
    mutationFn: () => orpcClient.lobby.assignRoles({ sessionToken }),
    onSuccess: invalidateView,
  })
  const startMutation = useMutation({
    mutationFn: () => orpcClient.lobby.startGame({ sessionToken }),
    onSuccess: invalidateView,
  })
  const commandMutation = useMutation({
    mutationFn: (command: GameCommand) =>
      orpcClient.lobby.executeGameCommand({
        gameId:
          viewQuery.data?.viewer === 'MODERATOR'
            ? viewQuery.data.game.id
            : (viewQuery.data?.gameId ?? ''),
        sessionToken,
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

  if (viewQuery.isPending) return <AppLoading />
  if (viewQuery.isError || !viewQuery.data) {
    return <LobbyError message={viewQuery.error?.message} onLeave={onLeave} />
  }

  const view = viewQuery.data
  const isModerator = view.viewer === 'MODERATOR'
  const roomCode =
    view.viewer === 'MODERATOR' ? view.game.roomCode : view.roomCode
  const version = view.viewer === 'MODERATOR' ? view.game.version : view.version
  const players =
    view.viewer === 'MODERATOR'
      ? view.game.lobbyPlayers.map((player) => ({
          ...player,
          alive:
            view.game.state?.players.find(
              (candidate) => candidate.id === player.id,
            )?.alive ?? true,
        }))
      : view.players.map((player) => ({ ...player, role: null }))
  const rolesAssigned =
    view.viewer === 'MODERATOR'
      ? players.length > 0 && players.every((player) => player.role !== null)
      : view.me.role !== null
  const allReady = players.length > 0 && players.every((player) => player.ready)
  const gameStarted =
    view.viewer === 'MODERATOR'
      ? view.game.state !== null
      : view.phase !== 'LOBBY'

  if (page === 'LOBBY' && gameStarted) return <Navigate to="/game" replace />
  if (page === 'GAME' && !gameStarted) return <Navigate to="/lobby" replace />

  let mutationError: string | null = null
  if (readyMutation.data?.ok === false) {
    mutationError = readyMutation.data.error.message
  } else if (assignMutation.data?.ok === false) {
    mutationError = assignMutation.data.error.message
  } else if (startMutation.data?.ok === false) {
    mutationError = startMutation.data.error.message
  } else if (commandMutation.data?.ok === false) {
    mutationError = commandMutation.data.error.message
  }

  return (
    <main className="isolate min-h-dvh px-5 py-6 sm:px-8 sm:py-8 lg:px-12">
      <div className="mx-auto flex max-w-6xl flex-col gap-10">
        <header className="flex items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="size-2 shrink-0 rounded-full bg-red-500 shadow-[0_0_24px_var(--color-red-500)]" />
            <p className="truncate font-mono text-sm tracking-wide text-stone-400 uppercase">
              {isModerator ? 'Moderator console' : 'Player room'}
            </p>
          </div>
          <button
            className="relative shrink-0 px-2 py-2 text-sm text-stone-400 transition-colors hover:text-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
            type="button"
            onClick={onLeave}
          >
            Rời phòng
            <span
              className="pointer-fine:hidden absolute top-1/2 left-1/2 size-[max(100%,3rem)] -translate-1/2"
              aria-hidden="true"
            />
          </button>
        </header>

        <section className="grid gap-10 lg:grid-cols-[3fr_2fr] lg:gap-16">
          <div className="flex min-w-0 flex-col gap-8">
            <div className="flex flex-col gap-3">
              <p className="font-mono text-sm tracking-wide text-red-300 uppercase">
                {gameStarted ? 'Ván chơi đã bắt đầu' : 'Đang chờ trong sảnh'}
              </p>
              <div className="flex flex-wrap items-end justify-between gap-5">
                <div className="flex flex-col gap-2">
                  <h1 className="text-balance text-4xl font-medium tracking-tight text-stone-50 sm:text-5xl">
                    Phòng{' '}
                    <span className="font-mono text-red-200">{roomCode}</span>
                  </h1>
                  <p className="text-pretty text-base/7 text-stone-400 sm:text-sm/6">
                    Chia sẻ mã này cho người chơi mở trong tab hoặc thiết bị
                    khác.
                  </p>
                </div>
                <div className="flex items-center gap-2 font-mono text-sm text-stone-500">
                  <span className="size-1.5 rounded-full bg-emerald-400" />
                  Local sync · v<span className="tabular-nums">{version}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h2 className="text-xl font-medium text-stone-100">
                  Người chơi
                </h2>
                <p className="font-mono text-sm tabular-nums text-stone-500">
                  {players.length} / 6
                </p>
              </div>
              <ul className="divide-y divide-white/10" role="list">
                {players.length ? (
                  players.map((player, index) => (
                    <li
                      className="grid grid-cols-[auto_1fr_auto] items-center gap-4 py-4"
                      key={player.id}
                    >
                      <span className="grid size-10 place-items-center rounded-full bg-white/5 font-mono text-sm text-stone-400 ring-1 ring-white/10">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-base font-medium text-stone-100 sm:text-sm">
                          {player.displayName}
                        </p>
                        <p className="truncate text-base/7 text-stone-500 sm:text-sm/6">
                          {isModerator && player.role
                            ? roleLabel(player.role)
                            : 'Vai trò được giữ kín'}
                        </p>
                      </div>
                      <StatusBadge
                        ready={player.ready}
                        assigned={rolesAssigned}
                      />
                    </li>
                  ))
                ) : (
                  <li className="py-12 text-center text-base/7 text-stone-500 sm:text-sm/6">
                    Chưa có người chơi. Room code đang chờ được nhập.
                  </li>
                )}
              </ul>
            </div>
          </div>

          <aside className="min-w-0 border-t border-white/10 pt-8 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-10">
            {gameStarted ? (
              <GameBoard
                view={view}
                pending={commandMutation.isPending}
                error={mutationError}
                onCommand={(command) => commandMutation.mutate(command)}
              />
            ) : view.viewer === 'MODERATOR' ? (
              <ModeratorControls
                playerCount={players.length}
                rolesAssigned={rolesAssigned}
                allReady={allReady}
                assigning={assignMutation.isPending}
                starting={startMutation.isPending}
                error={mutationError}
                onAssign={() => assignMutation.mutate()}
                onStart={() => startMutation.mutate()}
              />
            ) : (
              <PlayerControls
                role={view.me.role}
                ready={view.me.ready}
                pending={readyMutation.isPending}
                error={mutationError}
                onReadyChange={(ready) => readyMutation.mutate(ready)}
              />
            )}
          </aside>
        </section>
      </div>
    </main>
  )
}

function GameBoard({
  view,
  pending,
  error,
  onCommand,
}: {
  view: GameView
  pending: boolean
  error: string | null
  onCommand: (command: GameCommand) => void
}) {
  if (view.viewer === 'MODERATOR') {
    const state = view.game.state
    if (!state) return null
    return (
      <ModeratorGamePanel
        state={state}
        names={
          new Map(
            view.game.lobbyPlayers.map((player) => [
              player.id,
              player.displayName,
            ]),
          )
        }
        pending={pending}
        error={error}
        onCommand={onCommand}
      />
    )
  }

  return (
    <PlayerGamePanel
      view={view}
      pending={pending}
      error={error}
      onCommand={onCommand}
    />
  )
}

function ModeratorGamePanel({
  state,
  names,
  pending,
  error,
  onCommand,
}: {
  state: GameState
  names: Map<string, string>
  pending: boolean
  error: string | null
  onCommand: (command: GameCommand) => void
}) {
  const activeItem = state.queue.find(
    (item) =>
      item.status === 'ACTIVE' ||
      item.status === 'WAITING_MODERATOR_CONFIRMATION',
  )
  const livingPlayers = state.players.filter((player) => player.alive)

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-mono text-sm tracking-wide text-red-300 uppercase">
            {phaseLabel(state.phase)} · Đêm{' '}
            {String(state.round).padStart(2, '0')}
          </p>
          <p className="font-mono text-sm tabular-nums text-stone-500">
            {livingPlayers.length} còn sống
          </p>
        </div>
        <h2 className="text-balance text-3xl font-medium tracking-tight text-stone-50">
          {moderatorPhaseTitle(state.phase, activeItem?.step)}
        </h2>
        <p className="text-pretty text-base/7 text-stone-400 sm:text-sm/6">
          {moderatorPhaseDescription(state.phase)}
        </p>
      </div>

      {state.phase === 'NIGHT' ? <NightQueue queue={state.queue} /> : null}

      {state.phase === 'NIGHT' && state.pendingNightAction ? (
        <PendingAction
          action={state.pendingNightAction}
          names={names}
          pending={pending}
          onCommand={onCommand}
        />
      ) : null}

      {state.phase === 'NIGHT' && activeItem?.status === 'ACTIVE' ? (
        <SkipControl pending={pending} onCommand={onCommand} />
      ) : null}

      {state.phase === 'NIGHT_RESOLUTION' ? (
        <ResolutionControl
          deaths={state.pendingNightResolution?.deaths ?? []}
          names={names}
          pending={pending}
          onConfirm={() => onCommand({ type: 'CONFIRM_NIGHT_RESOLUTION' })}
        />
      ) : null}

      {state.phase === 'DAY' ? (
        <CommandButton
          primary
          pending={pending}
          onClick={() => onCommand({ type: 'START_VOTE' })}
        >
          Bắt đầu biểu quyết
        </CommandButton>
      ) : null}

      {state.phase === 'VOTE' ? (
        <VoteForm
          players={livingPlayers.map((player) => ({
            id: player.id,
            displayName: names.get(player.id) ?? 'Người chơi',
          }))}
          attempt={state.voteAttempt}
          pending={pending}
          onSubmit={(tied, selectedPlayerId) =>
            onCommand({ type: 'SUBMIT_VOTE_RESULT', tied, selectedPlayerId })
          }
        />
      ) : null}

      {state.phase === 'VOTE_RESOLUTION' ? (
        <VoteResolutionControl
          state={state}
          names={names}
          pending={pending}
          onCommand={onCommand}
        />
      ) : null}

      {state.phase === 'GAME_OVER' ? <GameOver winner={state.winner} /> : null}
      {error ? <InlineError message={error} /> : null}
    </div>
  )
}

function PlayerGamePanel({
  view,
  pending,
  error,
  onCommand,
}: {
  view: PlayerGameView
  pending: boolean
  error: string | null
  onCommand: (command: GameCommand) => void
}) {
  const activeStep = view.turn.activeStep
  const canSubmit = view.turn.canAct && view.me.alive
  const latestSeerResult = [...view.privateHistory]
    .reverse()
    .find((entry) => entry.event.type === 'SEER_RESULT_RECORDED')

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <p className="font-mono text-sm tracking-wide text-red-300 uppercase">
          {phaseLabel(view.phase)} · Vòng {String(view.round).padStart(2, '0')}
        </p>
        <h2 className="text-balance text-3xl font-medium tracking-tight text-stone-50">
          {!view.me.alive
            ? 'Bạn đang quan sát'
            : canSubmit
              ? 'Đến lượt bạn hành động'
              : playerWaitingTitle(view.phase)}
        </h2>
        <p className="text-pretty text-base/7 text-stone-400 sm:text-sm/6">
          Vai của bạn là{' '}
          {view.me.role ? roleLabel(view.me.role) : 'chưa xác định'}. Thông tin
          trên màn hình này chỉ dành cho bạn.
        </p>
      </div>

      {view.turn.werewolfTargetId ? (
        <SecretNotice
          label="Mục tiêu của Ma sói"
          value={playerName(view.players, view.turn.werewolfTargetId)}
        />
      ) : null}

      {latestSeerResult?.event.type === 'SEER_RESULT_RECORDED' ? (
        <SecretNotice
          label={`Kết quả soi ${playerName(view.players, latestSeerResult.event.targetPlayerId)}`}
          value={
            latestSeerResult.event.result === 'WEREWOLF'
              ? 'MA SÓI'
              : 'KHÔNG PHẢI MA SÓI'
          }
        />
      ) : null}

      {canSubmit && activeStep ? (
        <NightActionForm
          view={view}
          step={activeStep}
          pending={pending}
          onCommand={onCommand}
        />
      ) : null}

      {view.phase === 'GAME_OVER' ? <GameOver winner={view.winner} /> : null}
      {error ? <InlineError message={error} /> : null}
    </div>
  )
}

function NightActionForm({
  view,
  step,
  pending,
  onCommand,
}: {
  view: PlayerGameView
  step: NonNullable<PlayerGameView['turn']['activeStep']>
  pending: boolean
  onCommand: (command: GameCommand) => void
}) {
  const [targetId, setTargetId] = useState('')
  const [heal, setHeal] = useState(false)
  const [poisonTargetId, setPoisonTargetId] = useState('')
  const targets = view.players.filter(
    (player) => player.alive && player.id !== view.me.id,
  )

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (step === 'WITCH_ACTION') {
      onCommand({
        type: 'SUBMIT_NIGHT_ACTION',
        action: {
          type: step,
          actorId: view.me.id,
          heal,
          poisonTargetId: poisonTargetId || null,
        },
      })
      return
    }
    if (!targetId) return
    onCommand({
      type: 'SUBMIT_NIGHT_ACTION',
      action: { type: step, actorId: view.me.id, targetId },
    })
  }

  return (
    <form className="flex flex-col gap-5" onSubmit={submit}>
      <div className="border-t border-white/10 pt-5">
        <p className="font-mono text-sm tracking-wide text-stone-500 uppercase">
          {queueStepLabel(step)}
        </p>
      </div>
      {step === 'WITCH_ACTION' ? (
        <>
          <label className="flex items-center gap-3 text-base/7 text-stone-300 sm:text-sm/6">
            <input
              className="size-5 accent-red-600 sm:size-4"
              name="heal"
              type="checkbox"
              checked={heal}
              disabled={
                !view.me.abilityState?.healingPotionAvailable ||
                !view.turn.werewolfTargetId
              }
              onChange={(event) => setHeal(event.target.checked)}
            />
            Dùng bình cứu
          </label>
          <SelectField
            id="poison-target"
            label="Dùng bình độc"
            name="poisonTargetId"
            value={poisonTargetId}
            disabled={!view.me.abilityState?.poisonPotionAvailable}
            options={targets}
            emptyLabel="Không dùng bình độc"
            onChange={setPoisonTargetId}
          />
        </>
      ) : (
        <SelectField
          id="night-target"
          label="Chọn mục tiêu"
          name="targetId"
          value={targetId}
          options={targets}
          emptyLabel="Chọn một người chơi"
          required
          onChange={setTargetId}
        />
      )}
      <CommandButton primary pending={pending} type="submit">
        Gửi hành động cho Quản trò
      </CommandButton>
    </form>
  )
}

function NightQueue({ queue }: { queue: GameState['queue'] }) {
  return (
    <ol
      className="divide-y divide-white/10 border-y border-white/10"
      role="list"
    >
      {queue.map((item, index) => (
        <li
          className="grid grid-cols-[auto_1fr_auto] items-center gap-3 py-3"
          key={item.step}
        >
          <p className="font-mono text-sm tabular-nums text-stone-600">
            {String(index + 1).padStart(2, '0')}
          </p>
          <p className="text-base text-stone-300 sm:text-sm">
            {queueStepLabel(item.step)}
          </p>
          <p
            className={`font-mono text-sm uppercase ${item.status === 'ACTIVE' || item.status === 'WAITING_MODERATOR_CONFIRMATION' ? 'text-red-300' : 'text-stone-600'}`}
          >
            {queueStatusLabel(item.status)}
          </p>
        </li>
      ))}
    </ol>
  )
}

function PendingAction({
  action,
  names,
  pending,
  onCommand,
}: {
  action: NonNullable<GameState['pendingNightAction']>
  names: Map<string, string>
  pending: boolean
  onCommand: (command: GameCommand) => void
}) {
  const [reason, setReason] = useState('')
  return (
    <div className="flex flex-col gap-5 rounded-lg bg-white/5 p-5 ring-1 ring-white/10">
      <div className="flex flex-col gap-2">
        <p className="font-mono text-sm tracking-wide text-red-300 uppercase">
          Chờ xác nhận
        </p>
        <p className="text-base/7 text-stone-200 sm:text-sm/6">
          {actionSummary(action, names)}
        </p>
      </div>
      <CommandButton
        primary
        pending={pending}
        onClick={() => onCommand({ type: 'CONFIRM_STEP' })}
      >
        Xác nhận hành động
      </CommandButton>
      <div className="flex flex-col gap-3 border-t border-white/10 pt-4">
        <label
          className="text-base/7 text-stone-400 sm:text-sm/6"
          htmlFor="reject-reason"
        >
          Lý do từ chối
        </label>
        <input
          className="rounded-md bg-stone-950 px-3 py-2.5 text-base text-stone-100 ring-1 ring-white/10 placeholder:text-stone-600 focus-visible:-outline-offset-1 focus-visible:outline-2 focus-visible:outline-red-500 sm:py-2 sm:text-sm"
          id="reject-reason"
          name="reason"
          placeholder="Ví dụ: chọn sai người"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
        <CommandButton
          pending={pending}
          disabled={!reason.trim()}
          onClick={() => onCommand({ type: 'REJECT_STEP', reason })}
        >
          Từ chối và yêu cầu chọn lại
        </CommandButton>
      </div>
    </div>
  )
}

function SkipControl({
  pending,
  onCommand,
}: {
  pending: boolean
  onCommand: (command: GameCommand) => void
}) {
  const [reason, setReason] = useState('')
  return (
    <div className="flex flex-col gap-3 border-t border-white/10 pt-5">
      <label
        className="text-base/7 text-stone-400 sm:text-sm/6"
        htmlFor="skip-reason"
      >
        Bỏ qua bước với lý do
      </label>
      <input
        className="rounded-md bg-stone-950 px-3 py-2.5 text-base text-stone-100 ring-1 ring-white/10 focus-visible:-outline-offset-1 focus-visible:outline-2 focus-visible:outline-red-500 sm:py-2 sm:text-sm"
        id="skip-reason"
        name="skipReason"
        value={reason}
        onChange={(event) => setReason(event.target.value)}
      />
      <CommandButton
        pending={pending}
        disabled={!reason.trim()}
        onClick={() => onCommand({ type: 'SKIP_STEP', reason })}
      >
        Bỏ qua lượt này
      </CommandButton>
    </div>
  )
}

function ResolutionControl({
  deaths,
  names,
  pending,
  onConfirm,
}: {
  deaths: NonNullable<GameState['pendingNightResolution']>['deaths']
  names: Map<string, string>
  pending: boolean
  onConfirm: () => void
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-lg bg-white/5 p-5 ring-1 ring-white/10">
        <p className="font-mono text-sm tracking-wide text-stone-500 uppercase">
          Kết quả dự kiến
        </p>
        <p className="pt-3 text-base/7 text-stone-200 sm:text-sm/6">
          {deaths.length
            ? deaths
                .map((death) => names.get(death.playerId) ?? 'Người chơi')
                .join(', ')
            : 'Không ai bị loại trong đêm này'}
        </p>
      </div>
      <CommandButton primary pending={pending} onClick={onConfirm}>
        Công bố kết quả và mở ngày
      </CommandButton>
    </div>
  )
}

function VoteForm({
  players,
  attempt,
  pending,
  onSubmit,
}: {
  players: { id: string; displayName: string }[]
  attempt: 1 | 2
  pending: boolean
  onSubmit: (tied: boolean, selectedPlayerId: string | null) => void
}) {
  const [targetId, setTargetId] = useState('')
  const [tied, setTied] = useState(false)
  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit(tied, tied ? null : targetId)
      }}
    >
      <p className="font-mono text-sm tracking-wide text-stone-500 uppercase">
        Lượt biểu quyết {attempt}/2
      </p>
      <SelectField
        id="vote-target"
        label="Người bị chọn"
        name="voteTarget"
        value={targetId}
        options={players}
        emptyLabel="Chọn kết quả"
        required={!tied}
        disabled={tied}
        onChange={setTargetId}
      />
      <label className="flex items-center gap-3 text-base/7 text-stone-300 sm:text-sm/6">
        <input
          className="size-5 accent-red-600 sm:size-4"
          name="tied"
          type="checkbox"
          checked={tied}
          onChange={(event) => setTied(event.target.checked)}
        />
        Kết quả hòa
      </label>
      <CommandButton
        primary
        pending={pending}
        type="submit"
        disabled={!tied && !targetId}
      >
        Ghi nhận kết quả biểu quyết
      </CommandButton>
    </form>
  )
}

function VoteResolutionControl({
  state,
  names,
  pending,
  onCommand,
}: {
  state: GameState
  names: Map<string, string>
  pending: boolean
  onCommand: (command: GameCommand) => void
}) {
  const resolution = state.pendingVoteResolution
  const summary = !resolution
    ? 'Chưa có kết quả'
    : resolution.outcome === 'ELIMINATED'
      ? `${names.get(resolution.playerId) ?? 'Người chơi'} sẽ bị loại`
      : resolution.outcome === 'REVOTE'
        ? 'Biểu quyết hòa, thực hiện lượt thứ hai'
        : 'Lượt hòa thứ hai, không ai bị loại'
  return (
    <div className="flex flex-col gap-5">
      <SecretNotice label="Kết quả biểu quyết" value={summary} />
      <CommandButton
        primary
        pending={pending}
        onClick={() => onCommand({ type: 'CONFIRM_VOTE_RESULT' })}
      >
        Xác nhận kết quả
      </CommandButton>
    </div>
  )
}

function SelectField({
  id,
  label,
  name,
  value,
  options,
  emptyLabel,
  required = false,
  disabled = false,
  onChange,
}: {
  id: string
  label: string
  name: string
  value: string
  options: { id: string; displayName: string }[]
  emptyLabel: string
  required?: boolean
  disabled?: boolean
  onChange: (value: string) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-base/7 text-stone-400 sm:text-sm/6" htmlFor={id}>
        {label}
      </label>
      <div className="inline-grid grid-cols-[1fr_--spacing(8)]">
        <select
          className="col-span-full row-start-1 appearance-none rounded-md bg-stone-950 px-3 py-2.5 pr-8 text-base text-stone-100 ring-1 ring-white/10 focus-visible:-outline-offset-1 focus-visible:outline-2 focus-visible:outline-red-500 disabled:opacity-40 sm:py-2 sm:text-sm"
          id={id}
          name={name}
          value={value}
          required={required}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">{emptyLabel}</option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.displayName}
            </option>
          ))}
        </select>
        <svg
          aria-hidden="true"
          className="pointer-events-none col-start-2 row-start-1 place-self-center text-stone-500"
          fill="none"
          height="5"
          viewBox="0 0 8 5"
          width="8"
        >
          <path d="M.5.5 4 4 7.5.5" stroke="currentColor" />
        </svg>
      </div>
    </div>
  )
}

function CommandButton({
  children,
  pending,
  primary = false,
  disabled = false,
  type = 'button',
  onClick,
}: {
  children: React.ReactNode
  pending: boolean
  primary?: boolean
  disabled?: boolean
  type?: 'button' | 'submit'
  onClick?: () => void
}) {
  return (
    <button
      className={
        primary
          ? 'rounded-md bg-red-700 px-3 py-2 text-sm font-medium text-white ring-1 ring-red-700 hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500'
          : 'rounded-md bg-white/5 px-3 py-2 text-sm font-medium text-stone-200 ring-1 ring-white/10 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500'
      }
      type={type}
      disabled={pending || disabled}
      onClick={onClick}
    >
      {pending ? 'Đang cập nhật...' : children}
    </button>
  )
}

function SecretNotice({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-red-950/30 p-5 ring-1 ring-red-400/20">
      <p className="font-mono text-sm tracking-wide text-red-300 uppercase">
        {label}
      </p>
      <p className="pt-3 text-xl font-medium text-stone-50">{value}</p>
    </div>
  )
}

function GameOver({ winner }: { winner: GameState['winner'] }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="font-mono text-sm tracking-wide text-red-300 uppercase">
        Ván chơi kết thúc
      </p>
      <h2 className="text-balance text-3xl font-medium tracking-tight text-stone-50">
        {winner === 'WEREWOLF'
          ? 'Phe Ma sói chiến thắng'
          : 'Phe Dân làng chiến thắng'}
      </h2>
      <p className="text-pretty text-base/7 text-stone-400 sm:text-sm/6">
        Toàn bộ diễn biến vẫn được giữ trong lịch sử append-only của phòng.
      </p>
    </div>
  )
}

function playerName(players: PlayerGameView['players'], id: string) {
  return players.find((player) => player.id === id)?.displayName ?? 'Người chơi'
}

function moderatorPhaseTitle(
  phase: GameState['phase'],
  step?: GameState['queue'][number]['step'],
) {
  if (phase === 'NIGHT' && step) return `Gọi ${queueStepLabel(step)}`
  return (
    {
      NIGHT: 'Điều phối hàng đợi đêm',
      NIGHT_RESOLUTION: 'Kiểm tra kết quả đêm',
      DAY: 'Mở thảo luận ban ngày',
      VOTE: 'Ghi nhận biểu quyết',
      VOTE_RESOLUTION: 'Xác nhận biểu quyết',
      GAME_OVER: 'Ván chơi đã kết thúc',
      SETUP: 'Chuẩn bị',
      ROLE_REVEAL: 'Xem vai',
      READY_CHECK: 'Sẵn sàng',
    } as const
  )[phase]
}

function moderatorPhaseDescription(phase: GameState['phase']) {
  return (
    {
      NIGHT: 'Chỉ người có vai đang được gọi mới có thể gửi hành động.',
      NIGHT_RESOLUTION: 'Kết quả chưa công khai cho tới khi Quản trò xác nhận.',
      DAY: 'Cho người chơi thảo luận, sau đó mở biểu quyết khi sẵn sàng.',
      VOTE: 'Nhập kết quả cuối cùng của bàn chơi.',
      VOTE_RESOLUTION: 'Kiểm tra người bị loại hoặc yêu cầu biểu quyết lại.',
      GAME_OVER: 'Điều kiện thắng đã được kiểm tra tự động.',
      SETUP: '',
      ROLE_REVEAL: '',
      READY_CHECK: '',
    } as const
  )[phase]
}

function playerWaitingTitle(phase: PlayerGameView['phase']) {
  if (phase === 'DAY') return 'Cùng bàn thảo luận'
  if (phase === 'VOTE') return 'Bàn đang biểu quyết'
  if (phase === 'NIGHT_RESOLUTION' || phase === 'VOTE_RESOLUTION') {
    return 'Chờ Quản trò xác nhận'
  }
  return 'Giữ im lặng và chờ lượt'
}

function actionSummary(
  action: NonNullable<GameState['pendingNightAction']>,
  names: Map<string, string>,
) {
  if (action.type === 'WITCH_ACTION') {
    const choices = [
      action.heal ? 'dùng bình cứu' : null,
      action.poisonTargetId
        ? `đầu độc ${names.get(action.poisonTargetId) ?? 'người chơi'}`
        : null,
    ].filter(Boolean)
    return `${names.get(action.actorId) ?? 'Phù thủy'}: ${choices.join(' và ') || 'không dùng bình nào'}`
  }
  return `${names.get(action.actorId) ?? 'Người chơi'} chọn ${names.get(action.targetId) ?? 'người chơi'}`
}

function StatusBadge({
  ready,
  assigned,
}: {
  ready: boolean
  assigned: boolean
}) {
  const label = !assigned ? 'Đang chờ' : ready ? 'Sẵn sàng' : 'Xem vai'
  return (
    <span
      className={`rounded-full px-2.5 py-1 font-mono text-sm ring-1 ${
        ready && assigned
          ? 'bg-emerald-400/10 text-emerald-300 ring-emerald-400/20'
          : 'bg-white/5 text-stone-400 ring-white/10'
      }`}
    >
      {label}
    </span>
  )
}
