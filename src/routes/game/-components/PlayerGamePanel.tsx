import type { PlayerGameView } from '#/game/projections/model'
import type { CommandHandler } from './types'
import type { ReactNode } from 'react'

import { ChevronRight } from 'lucide-react'
import { InlineError } from '#/components/InlineError'
import { useState } from 'react'
import { cn } from '#/lib/cn'

import { actionPrompt, playerName, playerWaitingTitle } from './game-copy'
import { WaitingCountdown } from './WaitingCountdown'
import { NightActionForm } from './NightActionForm'
import { SelfVoteConsent } from './SelfVoteConsent'
import { GameOverResult } from './GameOverResult'
import { HunterShotForm } from './HunterShotForm'
import { RoleCardDialog } from './RoleCardDialog'
import { SecretNotice } from './SecretNotice'
import { SelfVoteForm } from './SelfVoteForm'
import { SecretRow } from './SecretRow'

/**
 * Khối lịch sử (soi / dùng bình) — nội dung phụ nên nằm gọn dưới quyết định
 * hiện tại: mặc định thu gọn, mở khi cần tra lại. Kết quả bên trong là các
 * dòng SecretRow; dòng cảnh báo riêng tư hiển thị MỘT lần dưới tiêu đề.
 */
function HistoryDisclosure({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-0.5">
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
        {hint ? <p className="text-sm/6 text-ink-subtle">{hint}</p> : null}
      </div>
      {open ? (
        <div className="flex flex-col divide-y divide-line">{children}</div>
      ) : null}
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
  // R23 (SELF): đã rời ván — session cũ chỉ còn xem, mọi form hành động ẩn.
  if (view.me.left) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-balance text-2xl font-medium tracking-tight text-ink sm:text-3xl">
          Bạn đã rời ván
        </h2>
        <p className="text-pretty text-base/7 text-ink-muted">
          Bạn vẫn theo dõi diễn biến trên màn hình này cho đến khi ván kết thúc.
          Lượt và phiếu của bạn được bỏ qua tự động.
        </p>
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
      <h2 className="text-balance text-2xl font-medium tracking-tight text-ink sm:text-3xl">
        {canSubmit && activeStep
          ? actionPrompt(activeStep)
          : view.vote?.canVote
            ? 'Đến lượt bạn biểu quyết'
            : canSubmit
              ? 'Đến lượt bạn hành động'
              : !view.me.alive
                ? 'Bạn đang quan sát'
                : playerWaitingTitle(view.phase)}
      </h2>

      {view.waiting ? (
        <WaitingCountdown gameId={view.gameId} waiting={view.waiting} />
      ) : null}

      {/* Ban ngày chờ biểu quyết = khoảng lặng có chủ ý: mời thảo luận +
          nhịp sống làng, không nhồi helper text. SELF mode kèm nút consent. */}
      {view.phase === 'DAY' && !canSubmit && view.me.alive ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <p className="max-w-[36ch] text-pretty text-base/7 text-ink-muted">
            {view.gameMode === 'SELF'
              ? 'Hãy bàn bạc với cả làng: ai hành động khả nghi? Khi đủ người sẵn sàng, biểu quyết sẽ mở.'
              : 'Hãy bàn bạc với cả làng: ai hành động khả nghi? Quản trò sẽ mở biểu quyết khi bàn chơi sẵn sàng.'}
          </p>
          <p className="font-mono text-sm tabular-nums text-ink-subtle">
            {view.players.filter((player) => player.alive).length} người còn
            sống
          </p>
          {view.gameMode === 'SELF' && view.discussion ? (
            <div className="mt-3 w-full max-w-sm">
              <SelfVoteConsent
                view={view}
                pending={pending}
                onCommand={onCommand}
              />
            </div>
          ) : null}
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
      {view.vote && view.me.alive ? (
        <SelfVoteForm
          view={view}
          pending={pending}
          error={error}
          onCommand={onCommand}
        />
      ) : null}
      {/* Lịch sử riêng là thông tin phụ — thu gọn dưới quyết định hiện tại,
          mở khi cần tra lại. Kết quả dạng dòng SecretRow: nhãn luôn hiện,
          chạm dòng để mở/ẩn giá trị. */}
      {seerResults.length > 0 ? (
        <HistoryDisclosure
          label="Lịch sử soi"
          hint="Chỉ mở khi không có người khác nhìn màn hình."
        >
          {seerResults.map((entry, index) =>
            entry.event.type === 'SEER_RESULT_RECORDED' ? (
              <SecretRow
                key={entry.sequence}
                label={`Lần soi ${seerResults.length - index} · ${playerName(view.players, entry.event.targetPlayerId)}`}
                value={
                  entry.event.result === 'WEREWOLF'
                    ? 'MA SÓI'
                    : 'KHÔNG PHẢI MA SÓI'
                }
                valueTone={
                  entry.event.result === 'WEREWOLF' ? 'danger' : 'success'
                }
              />
            ) : null,
          )}
        </HistoryDisclosure>
      ) : null}
      {witchActions.length > 0 ? (
        <HistoryDisclosure
          label="Lịch sử dùng bình"
          hint="Chỉ mở khi không có người khác nhìn màn hình."
        >
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
                ? `Cứu ${entry.event.healedTargetId ? playerName(view.players, entry.event.healedTargetId) : 'nạn nhân của Ma sói'}`
                : null,
              action.poisonTargetId
                ? `Độc ${playerName(view.players, action.poisonTargetId)}`
                : null,
            ].filter((use): use is string => use !== null)

            return (
              <SecretRow
                key={entry.sequence}
                label={`Lượt ${witchActions.length - index}`}
                value={uses.length > 0 ? uses.join(' · ') : 'Không dùng bình'}
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
