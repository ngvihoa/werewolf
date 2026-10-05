import type { CommandHandler } from './types'
import type { GameState } from '#/game/orchestration/model'

import { useRef, useState } from 'react'
import { Button } from '#/components/ui/Button'
import { X } from 'lucide-react'

import { actionSummary } from './game-copy'

/**
 * Revamp MODERATED (M9): hoàn tác action đêm cuối cùng — lưới an toàn cho
 * mis-tap khi quản trò là người nhập duy nhất. Cửa sổ: cả đêm cho tới khi
 * bình minh được công bố (mọi dữ liệu đêm vẫn riêng tư). Dialog xác nhận
 * chống bấm nhầm, lý do bắt buộc để audit.
 */
export function UndoStepControl({
  state,
  names,
  pending,
  onCommand,
}: {
  state: GameState
  names: Map<string, string>
  pending: boolean
  onCommand: CommandHandler
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [reason, setReason] = useState('')
  const undoable =
    (state.phase === 'NIGHT' || state.phase === 'NIGHT_RESOLUTION') &&
    !state.pendingNightAction &&
    state.confirmedNightActions.length > 0
  if (!undoable) return null
  const lastAction =
    state.confirmedNightActions[state.confirmedNightActions.length - 1]

  return (
    <>
      <button
        className="self-start text-sm/6 text-danger underline decoration-danger/40 underline-offset-4 transition-colors hover:decoration-danger disabled:opacity-40"
        disabled={pending}
        type="button"
        onClick={() => {
          setReason('')
          dialogRef.current?.showModal()
        }}
      >
        Hoàn tác bước vừa rồi
      </button>
      <dialog
        aria-label="Xác nhận hoàn tác bước đêm"
        className="m-auto bg-transparent p-0 backdrop:bg-black/85"
        ref={dialogRef}
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close()
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') event.currentTarget.close()
        }}
      >
        <div className="w-80 rounded-2xl bg-surface p-5 ring-1 ring-line sm:w-96">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-lg font-medium text-ink">Hoàn tác bước?</h3>
            <button
              aria-label="Đóng hộp thoại"
              className="grid size-8 shrink-0 place-items-center rounded-full text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
              type="button"
              onClick={() => dialogRef.current?.close()}
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          </div>
          <p className="pt-2 text-pretty text-sm/6 text-ink-muted">
            Rút lại:{' '}
            <span className="text-ink">{actionSummary(lastAction, names)}</span>
            . Tài nguyên của bước này (bình, khả năng) được hoàn trả và bước trở
            lại lượt chọn.
          </p>
          <label
            className="block pt-3 text-sm/6 text-ink-muted"
            htmlFor="undo-step-reason"
          >
            Lý do hoàn tác (bắt buộc)
          </label>
          <input
            className="mt-1 w-full rounded-xl bg-surface-raised px-3 py-2.5 text-base text-ink ring-1 ring-line focus-visible:-outline-offset-1 focus-visible:outline-2 focus-visible:outline-red-500 sm:py-2 sm:text-sm"
            id="undo-step-reason"
            name="reason"
            placeholder="Ví dụ: bấm nhầm mục tiêu"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={() => dialogRef.current?.close()}>
              Giữ nguyên
            </Button>
            <Button
              variant="primary"
              disabled={!reason.trim()}
              pending={pending}
              onClick={() => {
                dialogRef.current?.close()
                onCommand({ type: 'UNDO_STEP', reason })
              }}
            >
              Hoàn tác
            </Button>
          </div>
        </div>
      </dialog>
    </>
  )
}
