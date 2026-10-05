import type { PlayerGameView } from '#/game/projections/model'
import type { CommandHandler } from './types'

import { useRef, useState } from 'react'
import { InlineError } from '#/components/InlineError'
import { Button } from '#/components/ui/Button'
import { X } from 'lucide-react'

/**
 * R23 (SELF): khối cuối màn chơi — "Kết thúc ván" chỉ chủ phòng, bắt buộc ghi
 * lý do để audit. "Rời ván" KHÔNG nằm ở đây nữa: nó là hành động của mọi
 * người chơi nên đã dời lên nút trên header (RoomHeader leaveLabel +
 * SelfLeaveDialog) cho một lối ra duy nhất, khỏi nhầm với "Rời phòng".
 * Mode MODERATED không dùng khối này.
 */
export function SelfGameControls({
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
  const endDialogRef = useRef<HTMLDialogElement>(null)
  const [reason, setReason] = useState('')

  return (
    <div className="flex flex-col gap-3 border-t border-line pt-5">
      {view.isHost ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            pending={pending}
            onClick={() => endDialogRef.current?.showModal()}
          >
            Kết thúc ván
          </Button>
        </div>
      ) : null}

      <dialog
        aria-label="Kết thúc ván sớm"
        className="m-auto bg-transparent p-0 backdrop:bg-black/85"
        ref={endDialogRef}
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close()
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') event.currentTarget.close()
        }}
      >
        <div className="w-80 rounded-2xl bg-surface p-5 ring-1 ring-line sm:w-96">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-lg font-medium text-ink">Kết thúc ván sớm</h3>
            <button
              aria-label="Đóng hộp thoại"
              className="grid size-8 shrink-0 place-items-center rounded-full text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
              type="button"
              onClick={() => endDialogRef.current?.close()}
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          </div>
          <p className="pt-2 text-pretty text-sm/6 text-ink-muted">
            Cả bàn chuyển thẳng tới màn kết quả, không công bố phe thắng. Hãy
            ghi lý do để cả bàn cùng biết.
          </p>
          <form
            className="flex flex-col gap-3 pt-4"
            onSubmit={(event) => {
              event.preventDefault()
              const trimmed = reason.trim()
              if (!trimmed) return
              endDialogRef.current?.close()
              setReason('')
              onCommand({ type: 'END_GAME', reason: trimmed })
            }}
          >
            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-xs tracking-wide text-ink-muted uppercase">
                Lý do (bắt buộc)
              </span>
              <input
                className="min-h-11 rounded-xl bg-surface-raised px-3.5 text-sm text-ink ring-1 ring-line-strong outline-none focus:ring-danger/40"
                maxLength={120}
                placeholder="VD: không đủ người chơi tiếp tục"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
            </label>
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => endDialogRef.current?.close()}
              >
                Hủy
              </Button>
              <Button
                variant="primary"
                type="submit"
                disabled={!reason.trim()}
                pending={pending}
              >
                Kết thúc ván
              </Button>
            </div>
          </form>
        </div>
      </dialog>

      {error ? <InlineError message={error} /> : null}
    </div>
  )
}
