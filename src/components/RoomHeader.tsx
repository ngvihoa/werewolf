import type { ReactNode } from 'react'

export function RoomHeader({
  isModerator,
  actions,
  onLeave,
}: {
  isModerator: boolean
  actions?: ReactNode
  onLeave: () => void
}) {
  return (
    <header className="flex items-center justify-between gap-4 border-b border-white/10 pb-5">
      <div className="flex min-w-0 items-center gap-3">
        <span className="size-2 shrink-0 rounded-full bg-red-500 shadow-[0_0_24px_var(--color-red-500)]" />
        <p className="truncate font-mono text-sm tracking-wide text-stone-400 uppercase">
          {isModerator ? 'Moderator console' : 'Player room'}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {actions}
        <button
          className="relative shrink-0 px-2 py-2 text-sm text-stone-400 transition-colors hover:text-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
          type="button"
          onClick={onLeave}
        >
          Rời phòng
          <span
            className="pointer-fine:hidden absolute top-1/2 left-1/2 size-[max(100%,3rem)] -translate-1/2"
            aria-hidden="true"
          />
        </button>
      </div>
    </header>
  )
}
