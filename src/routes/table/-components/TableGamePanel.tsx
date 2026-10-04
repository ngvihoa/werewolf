import type { PlayerGameView } from '#/game/projections/model'
import type { CommandHandler } from '../../game/-components/types'

import { ChevronRight } from 'lucide-react'
import { WaitingState } from '#/components/ui/WaitingState'
import { InlineError } from '#/components/InlineError'
import { useState } from 'react'
import { cn } from '#/lib/cn'

import { GameOverResult } from '../../game/-components/GameOverResult'
import { HunterShotForm } from '../../game/-components/HunterShotForm'
import { RoleCardDialog } from '../../game/-components/RoleCardDialog'
import { SecretRow } from '../../game/-components/SecretRow'

import { TableVoteForm } from './TableVoteForm'

/**
 * Revamp MODERATED (M1/M4/M13): nội dung thiết bị của người chơi ở bàn vật
 * lý. Đêm là màn TĨNH (role + trạng thái public) — không tiến trình queue,
 * không countdown, không "đang chờ ai": không tell ánh sáng, không lộ nhịp
 * đêm. Ban ngày mới thêm dữ liệu riêng của vai để tra lại.
 */
export function TableGamePanel({
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
  if (view.phase === 'GAME_OVER') {
    return (
      <div className="flex flex-col gap-6">
        <GameOverResult view={view} />
        {error ? <InlineError message={error} /> : null}
      </div>
    )
  }
  if (!view.me.alive) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-balance text-2xl font-medium tracking-tight text-ink sm:text-3xl">
          Bạn đã bị loại
        </h2>
        <p className="text-pretty text-base/7 text-ink-muted">
          Theo dõi phần còn lại của ván trên màn hình này. Đừng tiết lộ thông
          tin bạn biết thêm cho ai.
        </p>
        <PrivateHistory view={view} />
        {error ? <InlineError message={error} /> : null}
      </div>
    )
  }

  // M13: đêm = màn tĩnh. Chỉ notice riêng tư (tình nhân, mê hoặc…) hiện kèm.
  if (view.phase === 'NIGHT' || view.phase === 'NIGHT_RESOLUTION') {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <p className="text-4xl" aria-hidden="true">
            ☾
          </p>
          <p className="max-w-[36ch] text-pretty text-base/7 text-ink-muted">
            Cả bàn nhắm mắt. Quản trò đang điều phối đêm — giữ nguyên màn hình
            này cho tới lúc bình minh.
          </p>
        </div>
        <PrivateNotices view={view} />
        <PrivateHistory view={view} />
        {error ? <InlineError message={error} /> : null}
      </div>
    )
  }

  if (view.phase === 'DAY') {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <p className="max-w-[36ch] text-pretty text-base/7 text-ink-muted">
            Cả bàn cùng mở mắt và thảo luận. Quản trò sẽ mở biểu quyết khi bàn
            chơi sẵn sàng — lúc đó màn hình này hiện phiếu của bạn.
          </p>
          <p className="font-mono text-sm tabular-nums text-ink-subtle">
            {view.players.filter((player) => player.alive).length} người còn
            sống
          </p>
        </div>
        <PrivateNotices view={view} />
        <PrivateHistory view={view} />
        {error ? <InlineError message={error} /> : null}
      </div>
    )
  }

  if (view.phase === 'VOTE') {
    return (
      <div className="flex flex-col gap-6">
        {view.vote && view.me.alive ? (
          <TableVoteForm
            view={view}
            pending={pending}
            error={error}
            onCommand={onCommand}
          />
        ) : (
          <WaitingState title="Bàn đang biểu quyết" />
        )}
        <PrivateNotices view={view} />
        {error ? <InlineError message={error} /> : null}
      </div>
    )
  }

  if (view.phase === 'HUNTER_SHOT' && view.turn.canAct) {
    return (
      <div className="flex flex-col gap-6">
        <HunterShotForm
          view={view}
          pending={pending}
          error={error}
          onCommand={onCommand}
        />
        {error ? <InlineError message={error} /> : null}
      </div>
    )
  }

  // VOTE_RESOLUTION: chờ quản trò công bố — khoảng lặng có chủ ý.
  return (
    <div className="flex flex-col gap-6">
      <WaitingState
        title="Chờ Quản trò công bố"
        description="Kết quả biểu quyết sẽ hiển thị ngay khi quản trò xác nhận."
      />
      <PrivateNotices view={view} />
      {error ? <InlineError message={error} /> : null}
    </div>
  )
}

// Notice riêng tư theo vai — hiện cả đêm (tư riêng, không lý do chờ) để mọi
// thông tin mình lẽ ra biết là có trên thiết bị mình (M4).
function PrivateNotices({ view }: { view: PlayerGameView }) {
  return (
    <>
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
    </>
  )
}

// M4: lịch sử riêng của vai — dữ liệu quản trò nhập hộ vẫn về đúng chủ, mỗi
// mục gắn nhãn nguồn. Thu gọn mặc định; chạm để tra lại.
function PrivateHistory({ view }: { view: PlayerGameView }) {
  const [open, setOpen] = useState(false)
  const playerName = (id: string) =>
    view.players.find((player) => player.id === id)?.displayName ?? 'Người chơi'

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

  if (seerResults.length === 0 && witchActions.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        {view.me.role ? <RoleCardDialog role={view.me.role} /> : null}
      </div>
    )
  }
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
            Sổ tay của vai bạn
          </span>
          <ChevronRight
            aria-hidden="true"
            className={cn(
              'size-4 shrink-0 text-ink-muted transition-transform',
              open && 'rotate-90',
            )}
          />
        </button>
        <p className="text-sm/6 text-ink-subtle">
          Chỉ mở khi không có người khác nhìn màn hình.
        </p>
      </div>
      {open ? (
        <div className="flex flex-col divide-y divide-line">
          {seerResults.map((entry) =>
            entry.event.type === 'SEER_RESULT_RECORDED' ? (
              <SecretRow
                key={entry.sequence}
                label={`Soi · ${playerName(entry.event.targetPlayerId)}`}
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
          {witchActions.map((entry) => {
            if (
              entry.event.type !== 'OWN_NIGHT_ACTION_CONFIRMED' ||
              entry.event.action.type !== 'WITCH_ACTION'
            ) {
              return null
            }
            const action = entry.event.action
            const uses = [
              action.heal
                ? `Cứu ${entry.event.healedTargetId ? playerName(entry.event.healedTargetId) : 'nạn nhân của Ma sói'}`
                : null,
              action.poisonTargetId
                ? `Độc ${playerName(action.poisonTargetId)}`
                : null,
            ].filter((use): use is string => use !== null)
            const label =
              entry.enteredBy === 'MODERATOR'
                ? `Dùng bình · do quản trò nhập`
                : `Dùng bình`
            return (
              <SecretRow
                key={entry.sequence}
                label={label}
                value={uses.length > 0 ? uses.join(' · ') : 'Không dùng bình'}
              />
            )
          })}
        </div>
      ) : null}
      {view.me.role ? <RoleCardDialog role={view.me.role} /> : null}
    </div>
  )
}
