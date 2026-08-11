import type { NightAction } from '#/game/rules/night-actions'
import type { StoredEvent } from '#/game/store/model'

import { phaseLabel, queueStepLabel } from '#/game/presentation/labels'
import { History, X } from 'lucide-react'
import { useRef } from 'react'

const timeFormatter = new Intl.DateTimeFormat('vi-VN', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
})

function playerName(names: ReadonlyMap<string, string>, playerId: string) {
  return names.get(playerId) ?? 'Người chơi'
}

function nightActionSummary(
  action: NightAction,
  names: ReadonlyMap<string, string>,
) {
  const actor = playerName(names, action.actorId)
  if (action.type === 'WITCH_ACTION') {
    const choices = [
      action.heal ? 'dùng bình cứu' : null,
      action.poisonTargetId
        ? `đầu độc ${playerName(names, action.poisonTargetId)}`
        : null,
    ].filter(Boolean)
    return `${actor}: ${choices.join(' và ') || 'không dùng bình nào'}`
  }
  return `${actor} chọn ${playerName(names, action.targetId)}`
}

function eventSummary(
  event: StoredEvent['event'],
  names: ReadonlyMap<string, string>,
) {
  switch (event.type) {
    case 'GAME_CREATED':
      return 'Phòng được tạo'
    case 'PLAYER_JOINED':
      return `${event.displayName} tham gia phòng`
    case 'PLAYER_READY_CHANGED':
      return `${playerName(names, event.playerId)} ${event.ready ? 'đã sẵn sàng' : 'hủy sẵn sàng'}`
    case 'ROLES_ASSIGNED':
      return 'Quản trò đã phân vai'
    case 'GAME_STARTED':
      return 'Ván chơi bắt đầu'
    case 'PHASE_CHANGED':
      return `Chuyển từ ${phaseLabel(event.from)} sang ${phaseLabel(event.to)}`
    case 'QUEUE_STEP_ACTIVATED':
      return `Đến lượt ${queueStepLabel(event.step)}`
    case 'NIGHT_ACTION_SUBMITTED':
      return `Đã gửi hành động: ${nightActionSummary(event.action, names)}`
    case 'NIGHT_ACTION_CONFIRMED':
      return `Đã xác nhận: ${nightActionSummary(event.action, names)}`
    case 'SEER_RESULT_RECORDED':
      return `${playerName(names, event.seerPlayerId)} soi ${playerName(names, event.targetPlayerId)}: ${event.result === 'WEREWOLF' ? 'Ma sói' : 'Phe Dân làng'}`
    case 'NIGHT_ACTION_REJECTED':
      return `Từ chối ${nightActionSummary(event.action, names)} — ${event.reason}`
    case 'QUEUE_STEP_SKIPPED':
      return `Bỏ qua ${queueStepLabel(event.step)} — ${event.reason}`
    case 'NIGHT_RESOLUTION_PREPARED': {
      const deaths = event.resolution.deaths.map((death) =>
        playerName(names, death.playerId),
      )
      return deaths.length
        ? `Kết quả đêm: ${deaths.join(', ')} bị loại`
        : 'Kết quả đêm: không ai bị loại'
    }
    case 'PLAYER_DIED':
      return `${playerName(names, event.playerId)} bị loại`
    case 'VOTE_SUBMITTED':
      return event.tied
        ? 'Biểu quyết có kết quả hòa'
        : `${playerName(names, event.selectedPlayerId ?? '')} nhận nhiều phiếu nhất`
    case 'VOTE_RESOLVED':
      return event.resolution.outcome === 'ELIMINATED'
        ? `${playerName(names, event.resolution.playerId)} bị loại sau biểu quyết`
        : event.resolution.outcome === 'REVOTE'
          ? 'Biểu quyết hòa, tiến hành lượt hai'
          : 'Không ai bị loại sau biểu quyết'
    case 'GAME_ENDED':
      return event.winner === 'WEREWOLF'
        ? 'Phe Ma sói chiến thắng'
        : 'Phe Dân làng chiến thắng'
  }
}

function eventColor(event: StoredEvent['event']) {
  if (event.type === 'NIGHT_ACTION_REJECTED' || event.type === 'PLAYER_DIED') {
    return 'bg-red-400'
  }
  if (event.type === 'NIGHT_ACTION_CONFIRMED' || event.type === 'GAME_ENDED') {
    return 'bg-emerald-400'
  }
  return 'bg-stone-500'
}

export function GameHistorySheet({
  history,
  names,
}: {
  history: StoredEvent[]
  names: ReadonlyMap<string, string>
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  return (
    <>
      <button
        aria-label="Mở lịch sử ván chơi"
        className="relative grid size-10 shrink-0 place-items-center rounded-full text-stone-400 ring-1 ring-white/10 transition-colors hover:bg-white/5 hover:text-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
        title="Lịch sử ván chơi"
        type="button"
        onClick={() => dialogRef.current?.showModal()}
      >
        <History aria-hidden="true" className="size-4" />
        {history.length ? (
          <span className="absolute -top-1 -right-1 min-w-4 rounded-full bg-red-700 px-1 font-mono text-[10px] leading-4 text-white">
            {history.length > 99 ? '99+' : history.length}
          </span>
        ) : null}
      </button>

      <dialog
        aria-labelledby="game-history-title"
        className="fixed inset-y-0 right-0 left-auto m-0 h-dvh w-full max-w-md overflow-hidden bg-stone-950 p-0 text-stone-100 shadow-2xl backdrop:bg-black/70 open:flex open:flex-col"
        ref={dialogRef}
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close()
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') event.currentTarget.close()
        }}
      >
        <header className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-5 sm:px-6">
          <div>
            <p className="font-mono text-xs tracking-[0.16em] text-red-300 uppercase">
              Moderator only
            </p>
            <h2
              className="pt-1 text-2xl font-medium tracking-tight"
              id="game-history-title"
            >
              Lịch sử ván chơi
            </h2>
            <p className="pt-1 text-sm text-stone-500">
              {history.length} sự kiện theo thứ tự mới nhất
            </p>
          </div>
          <button
            aria-label="Đóng lịch sử ván chơi"
            className="grid size-10 shrink-0 place-items-center rounded-full text-stone-400 transition-colors hover:bg-white/5 hover:text-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
            type="button"
            onClick={() => dialogRef.current?.close()}
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </header>

        <ol className="min-h-0 flex-1 overflow-y-auto px-5 py-2 sm:px-6">
          {history.length ? (
            [...history].reverse().map((entry) => (
              <li
                className="relative grid grid-cols-[auto_1fr] gap-4 border-b border-white/10 py-4 last:border-b-0"
                key={entry.id}
              >
                <span
                  className={`mt-1.5 size-2 rounded-full ${eventColor(entry.event)}`}
                />
                <div className="min-w-0">
                  <p className="text-sm/6 text-stone-200">
                    {eventSummary(entry.event, names)}
                  </p>
                  <div className="flex flex-wrap gap-x-2 pt-1 font-mono text-xs text-stone-600">
                    <span>#{String(entry.sequence).padStart(3, '0')}</span>
                    <span>
                      {timeFormatter.format(new Date(entry.createdAt))}
                    </span>
                    <span>
                      {entry.actor === 'SYSTEM'
                        ? 'Hệ thống'
                        : entry.actor === 'MODERATOR'
                          ? 'Quản trò'
                          : playerName(names, entry.actorPlayerId ?? '')}
                    </span>
                  </div>
                </div>
              </li>
            ))
          ) : (
            <li className="py-16 text-center text-sm/6 text-stone-500">
              Chưa có sự kiện nào trong ván chơi.
            </li>
          )}
        </ol>
      </dialog>
    </>
  )
}
