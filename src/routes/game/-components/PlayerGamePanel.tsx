import type { PlayerGameView } from '#/game/projections/model'
import type { CommandHandler } from './types'
import type { ReactNode } from 'react'

import { ChevronRight } from 'lucide-react'
import { InlineError } from '#/components/InlineError'
import { useState } from 'react'
import { cn } from '#/lib/cn'

import { actionPrompt, playerName, playerWaitingTitle } from './game-copy'
import { NightActionForm } from './NightActionForm'
import { GameOverResult } from './GameOverResult'
import { HunterShotForm } from './HunterShotForm'
import { RoleCardDialog } from './RoleCardDialog'
import { SecretNotice } from './SecretNotice'

/**
 * Khối lịch sử (soi / dùng bình) — nội dung phụ nên nằm gọn dưới quyết định
 * hiện tại: mặc định thu gọn, mở khi cần tra lại.
 */
function HistoryDisclosure({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="flex flex-col gap-4">
      <button
        aria-expanded={open}
        className="flex min-h-11 items-center justify-between gap-3 text-left"
        type="button"
        onClick={() => setOpen((current) => !current)}
      >
        <span className="font-mono text-sm tracking-wide text-accent uppercase">
          {label}
        </span>
        <ChevronRight
          aria-hidden="true"
          className={cn(
            'size-4 shrink-0 text-ink-muted transition-transform',
            open && 'rotate-90',
          )}
        />
      </button>
      {open ? children : null}
    </div>
  )
}

export function PlayerGamePanel({
  view,
  pending,
  error,
  onCommand,
}: {
  view: PlayerGameView
  pending: boolean
  error: string | null
  onCommand: CommandHandler
}) {
  // Kết thúc ván = một trang riêng: thắng/thua + mở lộ vai cả làng.
  if (view.phase === 'GAME_OVER') {
    return (
      <div className="flex flex-col gap-6">
        <GameOverResult view={view} />
        {error ? <InlineError message={error} /> : null}
      </div>
    )
  }
  const activeStep = view.turn.activeStep
  const canSubmit = view.turn.canAct
  const seerResults = [...view.privateHistory]
    .reverse()
    .filter((entry) => entry.event.type === 'SEER_RESULT_RECORDED')
  const witchActions = [...view.privateHistory]
    .reverse()
    .filter(
      (entry) =>
        entry.event.type === 'OWN_NIGHT_ACTION_CONFIRMED' &&
        entry.event.action.type === 'WITCH_ACTION',
    )

  return (
    <div className="flex flex-col gap-8">
      <h2 className="text-balance text-3xl font-medium tracking-tight text-ink">
        {canSubmit && activeStep
          ? actionPrompt(activeStep)
          : canSubmit
            ? 'Đến lượt bạn hành động'
            : !view.me.alive
              ? 'Bạn đang quan sát'
              : playerWaitingTitle(view.phase)}
      </h2>

      {/* Ban ngày chờ biểu quyết = khoảng lặng có chủ ý: mời thảo luận + 
          nhịp sống làng, không nhồi helper text. */}
      {view.phase === 'DAY' && !canSubmit && view.me.alive ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <p className="max-w-[36ch] text-pretty text-base/7 text-ink-muted">
            Hãy bàn bạc với cả làng: ai hành động khả nghi? Quản trò sẽ mở biểu
            quyết khi bàn chơi sẵn sàng.
          </p>
          <p className="font-mono text-sm tabular-nums text-ink-subtle">
            {view.players.filter((player) => player.alive).length} người còn
            sống
          </p>
        </div>
      ) : null}

      {view.me.role === 'HYBRID_WOLF' &&
      view.me.abilityState !== null &&
      'converted' in view.me.abilityState &&
      view.me.abilityState.converted ? (
        <p className="rounded-2xl bg-danger/10 px-4 py-3 text-sm/6 text-ink ring-1 ring-danger/25">
          Bạn đã bị cắn và chuyển sang phe Ma sói. Từ đêm tiếp theo, bạn hành
          động cùng đàn Sói.
        </p>
      ) : null}
      {view.isCharmed ? (
        <p className="rounded-2xl bg-violet-400/10 px-4 py-3 text-sm/6 text-violet-200 ring-1 ring-violet-300/20">
          Bạn đã bị Người thổi sáo mê hoặc.
        </p>
      ) : null}
      {view.lover ? (
        <p className="rounded-2xl bg-rose-400/10 px-4 py-3 text-sm/6 text-rose-200 ring-1 ring-rose-300/20">
          Tình nhân của bạn là {view.lover.displayName}. Nếu một trong hai chết,
          người còn lại cũng sẽ chết theo.
        </p>
      ) : null}

      {view.turn.werewolfTeammates.length > 0 ? (
        <SecretNotice
          label="Đồng đội Ma sói"
          value={view.turn.werewolfTeammates
            .map((player) => player.displayName)
            .join(', ')}
        />
      ) : null}

      {view.turn.werewolfTargetId ? (
        <SecretNotice
          label="Mục tiêu của Ma sói"
          value={playerName(view.players, view.turn.werewolfTargetId)}
        />
      ) : null}
      {view.turn.hunterShotTargetId ? (
        <SecretNotice
          label="Mục tiêu phát súng cuối"
          value={playerName(view.players, view.turn.hunterShotTargetId)}
        />
      ) : null}
      {canSubmit && activeStep ? (
        <NightActionForm
          view={view}
          step={activeStep}
          pending={pending}
          error={error}
          onCommand={onCommand}
        />
      ) : null}
      {canSubmit && view.phase === 'HUNTER_SHOT' ? (
        <HunterShotForm
          view={view}
          pending={pending}
          error={error}
          onCommand={onCommand}
        />
      ) : null}
      {/* Lịch sử riêng là thông tin phụ — thu gọn dưới quyết định hiện tại,
          mở khi cần tra lại. */}
      {seerResults.length > 0 ? (
        <HistoryDisclosure label="Lịch sử soi">
          {seerResults.map((entry, index) =>
            entry.event.type === 'SEER_RESULT_RECORDED' ? (
              <SecretNotice
                key={entry.sequence}
                concealable
                label={`Lần soi ${seerResults.length - index}: ${playerName(view.players, entry.event.targetPlayerId)}`}
                value={
                  entry.event.result === 'WEREWOLF'
                    ? 'MA SÓI'
                    : 'KHÔNG PHẢI MA SÓI'
                }
              />
            ) : null,
          )}
        </HistoryDisclosure>
      ) : null}
      {witchActions.length > 0 ? (
        <HistoryDisclosure label="Lịch sử dùng bình">
          {witchActions.map((entry, index) => {
            if (
              entry.event.type !== 'OWN_NIGHT_ACTION_CONFIRMED' ||
              entry.event.action.type !== 'WITCH_ACTION'
            ) {
              return null
            }

            const action = entry.event.action
            const uses = [
              action.heal
                ? `Đã dùng bình cứu cho ${entry.event.healedTargetId ? playerName(view.players, entry.event.healedTargetId) : 'nạn nhân của Ma sói'}`
                : null,
              action.poisonTargetId
                ? `Đã dùng bình độc với ${playerName(view.players, action.poisonTargetId)}`
                : null,
            ].filter((use): use is string => use !== null)

            return (
              <SecretNotice
                key={entry.sequence}
                concealable
                hiddenLabel="Lịch sử dùng bình được giữ kín"
                label={`Lượt Phù thủy ${witchActions.length - index}`}
                value={
                  uses.length > 0 ? uses.join(' · ') : 'Không dùng bình nào'
                }
              />
            )
          })}
        </HistoryDisclosure>
      ) : null}
      {/* Vai đã xem ở sảnh chờ — trong ván chỉ để nút mở lại; ghi chú riêng
          tư đi kèm thay cho helper text đầu trang. */}
      <div className="flex flex-col gap-2">
        {view.me.role ? <RoleCardDialog role={view.me.role} /> : null}
        <p className="text-sm/6 text-ink-subtle">
          Thông tin trên màn hình này chỉ dành cho bạn.
        </p>
      </div>
      {error ? <InlineError message={error} /> : null}
    </div>
  )
}
