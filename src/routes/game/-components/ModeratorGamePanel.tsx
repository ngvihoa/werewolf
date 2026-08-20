import type { CommandHandler } from './types'
import type { GameState } from '#/game/orchestration/model'

import { InlineError } from '#/components/InlineError'
import { phaseLabel } from '#/game/presentation/labels'
import { useState } from 'react'

import { moderatorPhaseDescription, moderatorPhaseTitle } from './game-copy'
import { VoteResolutionControl } from './VoteResolutionControl'
import { ResolutionControl } from './ResolutionControl'
import { CommandButton } from './CommandButton'
import { PendingAction } from './PendingAction'
import { SkipControl } from './SkipControl'
import { NightQueue } from './NightQueue'
import { GameOver } from './GameOver'
import { VoteForm } from './VoteForm'

export function ModeratorGamePanel({
  state,
  names,
  pending,
  error,
  onCommand,
  onRematch,
}: {
  state: GameState
  names: Map<string, string>
  pending: boolean
  error: string | null
  onCommand: CommandHandler
  onRematch: () => void
}) {
  const [confirmingRematch, setConfirmingRematch] = useState(false)
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
          convertedHybridPlayerIds={
            state.pendingNightResolution?.convertedHybridPlayerIds ?? []
          }
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
      {state.phase === 'HUNTER_SHOT' ? (
        state.pendingHunterShot?.targetId ? (
          <div className="flex flex-col gap-4 rounded-xl border border-red-400/20 bg-red-500/5 p-4">
            <p className="text-base/7 text-stone-300 sm:text-sm/6">
              {names.get(state.pendingHunterShot.hunterId) ?? 'Thợ săn'} chọn{' '}
              {names.get(state.pendingHunterShot.targetId) ?? 'người chơi'}.
            </p>
            <CommandButton
              primary
              pending={pending}
              onClick={() => onCommand({ type: 'CONFIRM_HUNTER_SHOT' })}
            >
              Xác nhận phát bắn
            </CommandButton>
          </div>
        ) : (
          <p className="text-base/7 text-stone-400 sm:text-sm/6">
            Đang chờ Thợ săn chọn người kéo theo.
          </p>
        )
      ) : null}
      {state.phase === 'GAME_OVER' ? (
        <div className="flex flex-col gap-5">
          <GameOver winner={state.winner} />
          {confirmingRematch ? (
            <div className="flex flex-col gap-3 rounded-md border border-red-500/30 bg-red-950/20 p-4">
              <p className="text-sm/6 text-stone-300">
                Giữ nguyên phòng và người chơi, đồng thời xóa vai trò và trạng
                thái của ván vừa kết thúc?
              </p>
              <div className="flex flex-wrap gap-3">
                <CommandButton primary pending={pending} onClick={onRematch}>
                  Xác nhận chơi ván mới
                </CommandButton>
                <CommandButton
                  pending={pending}
                  onClick={() => setConfirmingRematch(false)}
                >
                  Hủy
                </CommandButton>
              </div>
            </div>
          ) : (
            <CommandButton
              primary
              pending={pending}
              onClick={() => setConfirmingRematch(true)}
            >
              Chơi ván mới cùng phòng
            </CommandButton>
          )}
        </div>
      ) : null}
      {error ? <InlineError message={error} /> : null}
    </div>
  )
}
