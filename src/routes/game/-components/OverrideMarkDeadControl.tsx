import type { CommandHandler } from './types'
import type { GameState } from '#/game/orchestration/model'

import { useRef, useState } from 'react'
import { PlayerToken } from '#/components/ui/PlayerToken'
import { Button } from '#/components/ui/Button'
import { X } from 'lucide-react'

/**
 * Revamp MODERATED (M10): ngoại lệ bàn chơi — người bỏ về/bị mất giữa ván
 * được quản trò đánh dấu chết tay. Chết trong luật (queue tự skip role, win
 * check tự tính lại ở mốc kế) — không phải "rời ván" kiểu SELF. Chỉ chọn
 * người + lý do bắt buộc; danger friction như mọi lối ra không đảo ngược.
 */
export function OverrideMarkDeadControl({
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
  const [pickedId, setPickedId] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const livingPlayers = state.players.filter((player) => player.alive)
  if (livingPlayers.length === 0 || state.winner) return null

  return (
    <>
      <button
        className="self-start text-sm/6 text-ink-muted underline decoration-line underline-offset-4 transition-colors hover:text-danger hover:decoration-danger/40 disabled:opacity-40"
        disabled={pending}
        type="button"
        onClick={() => {
          setPickedId(null)
          setReason('')
          dialogRef.current?.showModal()
        }}
      >
        Đánh dấu người bỏ khỏi ván
      </button>
      <dialog
        aria-label="Đánh dấu người bỏ khỏi ván"
        className="m-auto bg-transparent p-0 backdrop:bg-black/85"
        ref={dialogRef}
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close()
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') event.currentTarget.close()
        }}
      >
        <div className="w-80 rounded-2xl bg-midnight p-5 ring-1 ring-line sm:w-96">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-lg font-medium text-ink">
              Đánh dấu người bỏ khỏi ván?
            </h3>
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
            Người này được tính là đã chết trong luật: lượt của họ bị bỏ qua và
            điều kiện thắng tự tính lại. Không hoàn lại được trong ván.
          </p>
          <div className="grid max-h-52 grid-cols-2 gap-2.5 overflow-y-auto pt-3 sm:grid-cols-3">
            {livingPlayers.map((player, index) => (
              <PlayerToken
                key={player.id}
                displayName={names.get(player.id) ?? player.id}
                index={index}
                selectable
                selected={pickedId === player.id}
                onSelect={() => setPickedId(player.id)}
              />
            ))}
          </div>
          <label
            className="block pt-3 text-sm/6 text-ink-muted"
            htmlFor="override-reason"
          >
            Lý do (bắt buộc)
          </label>
          <input
            className="mt-1 w-full rounded-xl bg-surface-raised px-3 py-2.5 text-base text-ink ring-1 ring-line focus-visible:-outline-offset-1 focus-visible:outline-2 focus-visible:outline-red-500 sm:py-2 sm:text-sm"
            id="override-reason"
            name="reason"
            placeholder="Ví dụ: bỏ về giữa ván"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={() => dialogRef.current?.close()}>
              Hủy
            </Button>
            <Button
              variant="primary"
              disabled={!pickedId || !reason.trim()}
              pending={pending}
              onClick={() => {
                if (!pickedId) return
                dialogRef.current?.close()
                onCommand({
                  type: 'MODERATOR_OVERRIDE_MARK_DEAD',
                  playerId: pickedId,
                  reason,
                })
              }}
            >
              Đánh dấu đã chết
            </Button>
          </div>
        </div>
      </dialog>
    </>
  )
}
