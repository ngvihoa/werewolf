import type { CommandHandler } from './types'
import type { GameState } from '#/game/orchestration/model'

import { WaitingState } from '#/components/ui/WaitingState'
import { InlineError } from '#/components/InlineError'
import { useState } from 'react'

import { moderatorPhaseDescription, moderatorPhaseTitle } from './game-copy'
import { OverrideMarkDeadControl } from './OverrideMarkDeadControl'
import { VoteResolutionControl } from './VoteResolutionControl'
import { NightActionProxyForm } from './NightActionProxyForm'
import { ResolutionControl } from './ResolutionControl'
import { UndoStepControl } from './UndoStepControl'
import { CommandButton } from './CommandButton'
import { PendingAction } from './PendingAction'
import { VoteMonitor } from './VoteMonitor'
import { SkipControl } from './SkipControl'
import { NightRelay } from './NightRelay'
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
          <h2 className="text-balance text-2xl font-medium tracking-tight text-ink">
            {moderatorPhaseTitle(state.phase, activeItem?.step)}
          </h2>
          <p className="font-mono text-sm tabular-nums text-ink-muted">
            {livingPlayers.length} còn sống
          </p>
        </div>
        <p className="text-pretty text-base/7 text-ink-muted sm:text-sm/6">
          {moderatorPhaseDescription(state.phase)}
        </p>
      </div>

      {state.phase === 'NIGHT' ? <NightQueue queue={state.queue} /> : null}
      {state.phase === 'NIGHT' ? (
        <NightRelay state={state} names={names} />
      ) : null}
      {/* Revamp MODERATED (M2): đêm thuộc quản trò — khi step ACTIVE mà chưa
          có action chờ, quản trò nhập thay bằng picker; bot tự confirm ngay
          trong cùng lệnh (M3), nên PendingAction hiếm khi thấy. */}
      {state.phase === 'NIGHT' &&
      activeItem?.status === 'ACTIVE' &&
      !state.pendingNightAction ? (
        <NightActionProxyForm
          // key theo vòng+step: picker là state nội bộ — đổi bước đêm phải
          // reset (nếu không, mục tiêu của bước trước trôi sang picker kế).
          key={`${state.round}-${activeItem.step}`}
          state={state}
          names={names}
          pending={pending}
          onCommand={onCommand}
        />
      ) : null}
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
      {state.phase === 'NIGHT' || state.phase === 'NIGHT_RESOLUTION' ? (
        <UndoStepControl
          state={state}
          names={names}
          pending={pending}
          onCommand={onCommand}
        />
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
        <>
          <VoteMonitor state={state} names={names} />
          {/* M6: biểu quyết qua thiết bị là mặc định; form đếm tay là lối
              thoát (bàn không dùng máy / máy lỗi / dồn phiếu cuối). */}
          <details className="flex flex-col gap-3 border-t border-line pt-5">
            <summary className="cursor-pointer text-sm/6 text-ink-muted">
              Nhập kết quả đếm tay (dự phòng)
            </summary>
            <div className="pt-3">
              <VoteForm
                players={livingPlayers.map((player) => ({
                  id: player.id,
                  displayName: names.get(player.id) ?? 'Người chơi',
                }))}
                attempt={state.voteAttempt}
                pending={pending}
                onSubmit={(tied, selectedPlayerId) =>
                  onCommand({
                    type: 'SUBMIT_VOTE_RESULT',
                    tied,
                    selectedPlayerId,
                  })
                }
              />
            </div>
          </details>
        </>
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
          <div className="flex flex-col gap-4 rounded-2xl bg-danger/10 p-5 ring-1 ring-danger/25">
            <p className="text-base/7 text-ink sm:text-sm/6">
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
          <WaitingState title="Đang chờ Thợ săn chọn người kéo theo." />
        )
      ) : null}
      {state.winner === null && state.phase !== 'GAME_OVER' ? (
        <OverrideMarkDeadControl
          state={state}
          names={names}
          pending={pending}
          onCommand={onCommand}
        />
      ) : null}
      {state.phase === 'GAME_OVER' ? (
        <div className="flex flex-col gap-5">
          <GameOver winner={state.winner} />
          {confirmingRematch ? (
            <div className="flex flex-col gap-3 rounded-2xl bg-danger/10 p-4 ring-1 ring-danger/30">
              <p className="text-sm/6 text-ink">
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
