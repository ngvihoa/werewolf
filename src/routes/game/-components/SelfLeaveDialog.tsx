import type { RefObject } from 'react'

import { Button } from '#/components/ui/Button'
import { X } from 'lucide-react'

/**
 * R23 (SELF): hộp thoại xác nhận rời ván — mở từ nút "Rời ván" trên header
 * trong ván. Rời là không quay lại được trong ván (bot bỏ lượt/phiếu của
 * người rời tự động), nên confirm trước; sau khi rời màn chỉ còn xem.
 */
export function SelfLeaveDialog({
  dialogRef,
  pending,
  onConfirm,
}: {
  dialogRef: RefObject<HTMLDialogElement | null>
  pending: boolean
  onConfirm: () => void
}) {
  return (
    <dialog
      aria-label="Xác nhận rời ván"
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
          <h3 className="text-lg font-medium text-ink">Rời ván chơi?</h3>
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
          Bạn vẫn theo dõi được ván đến khi kết thúc, nhưng sẽ không hành động
          hay bỏ phiếu nữa. Phiếu và lượt của bạn được bỏ qua tự động.
        </p>
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="ghost" onClick={() => dialogRef.current?.close()}>
            Ở lại
          </Button>
          <Button
            variant="primary"
            pending={pending}
            onClick={() => {
              dialogRef.current?.close()
              onConfirm()
            }}
          >
            Rời ván
          </Button>
        </div>
      </div>
    </dialog>
  )
}
