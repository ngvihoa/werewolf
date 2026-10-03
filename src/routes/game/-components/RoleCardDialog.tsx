import type { Role } from '#/game/domain'

import { roleAccentColor } from '#/game/presentation/role-art'
import { roleLabel } from '#/game/presentation/labels'
import { RoleCard } from '#/components/RoleCard'
import { useRef } from 'react'
import { Eye, X } from 'lucide-react'

// Nút phụ thay cho thẻ vai cồng kềnh: trong lúc chơi vai đã xem ở sảnh chờ,
// cần nhìn lại thì mở dialog — nhả không gian cho form hành động và bảng người chơi.
export function RoleCardDialog({ role }: { role: Role }) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  return (
    <>
      <button
        className="flex min-h-11 items-center gap-2 self-start rounded-xl bg-surface px-3.5 py-2 text-sm font-medium text-ink ring-1 ring-line transition-colors hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
        type="button"
        onClick={() => dialogRef.current?.showModal()}
      >
        <Eye aria-hidden="true" className="size-4 text-accent" />
        Xem vai trò
        <span className="sr-only">: {roleLabel(role)}</span>
      </button>

      <dialog
        aria-label={`Thẻ vai ${roleLabel(role)}`}
        className="m-auto bg-transparent p-0 backdrop:bg-black/70"
        ref={dialogRef}
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close()
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') event.currentTarget.close()
        }}
      >
        <div className="relative px-6 py-8">
          <button
            aria-label="Đóng thẻ vai"
            className="absolute top-2 right-2 grid size-10 place-items-center rounded-full text-stone-400 transition-colors hover:bg-white/5 hover:text-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
            type="button"
            onClick={() => dialogRef.current?.close()}
          >
            <X aria-hidden="true" className="size-5" />
          </button>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-1/2 size-72 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ background: `${roleAccentColor(role)}26` }}
          />
          <RoleCard
            className="max-w-80 sm:max-w-96"
            defaultRevealed
            role={role}
          />
        </div>
      </dialog>
    </>
  )
}
