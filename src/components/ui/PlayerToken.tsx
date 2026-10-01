import type { ReactNode } from 'react'

import { Check, Crown } from 'lucide-react'

export type PlayerTokenProps = {
  displayName: string
  index: number
  selectable?: boolean
  selected?: boolean
  dead?: boolean
  disabled?: boolean
  acting?: boolean
  winner?: boolean
  roleImageSrc?: string | null
  roleLabelText?: string | null
  statusText?: string | null
  onSelect?: () => void
}

function TokenSurface({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={`relative flex h-full min-h-28 w-full flex-col items-center justify-center gap-2 rounded-2xl px-3 py-4 text-center ring-1 transition-colors group-hover:bg-surface-raised ${className}`}
    >
      {children}
    </div>
  )
}

export function PlayerToken({
  displayName,
  index,
  selectable = false,
  selected = false,
  dead = false,
  disabled = false,
  acting = false,
  winner = false,
  roleImageSrc = null,
  roleLabelText = null,
  statusText = null,
  onSelect,
}: PlayerTokenProps) {
  const unavailable = dead || disabled
  const interactive = selectable && !unavailable
  const surfaceClassName = selected
    ? 'bg-danger/15 ring-2 ring-danger'
    : dead && !winner
      ? 'bg-transparent opacity-55 ring-line saturate-50'
      : acting
        ? 'bg-danger/10 ring-danger/40'
        : 'bg-surface ring-line'

  const content = (
    <>
      {winner ? (
        <>
          <span
            aria-hidden="true"
            className="absolute top-2 right-2 grid size-6 place-items-center rounded-full bg-lantern/20 text-lantern ring-1 ring-lantern/50"
          >
            <Crown className="size-3.5" />
          </span>
          <span className="sr-only">Thuộc phe thắng</span>
        </>
      ) : null}
      {selected ? (
        <span
          aria-hidden="true"
          className="absolute top-2 right-2 grid size-5 place-items-center rounded-full bg-danger text-white"
        >
          <Check className="size-3.5" />
        </span>
      ) : null}
      {dead && !winner ? (
        <span
          aria-hidden="true"
          className="absolute top-1.5 right-3 font-mono text-xl text-ink-subtle"
        >
          †
        </span>
      ) : null}
      {acting ? (
        <span
          aria-hidden="true"
          className="absolute top-2.5 left-2.5 size-2 animate-pulse rounded-full bg-danger"
        />
      ) : null}
      <span
        className={`grid size-10 place-items-center overflow-hidden rounded-full font-mono text-sm ring-1 ${
          acting
            ? 'bg-danger/15 text-accent ring-danger/40'
            : 'bg-white/8 text-ink-muted ring-line'
        }`}
      >
        {roleImageSrc ? (
          <img
            alt=""
            className="size-full object-cover"
            height={40}
            src={roleImageSrc}
            width={40}
          />
        ) : (
          String(index + 1).padStart(2, '0')
        )}
      </span>
      <span className="max-w-full truncate text-sm font-medium text-ink">
        <span
          className={
            dead && !winner ? 'line-through decoration-ink-subtle' : ''
          }
        >
          {displayName}
        </span>
      </span>
      {roleLabelText ? (
        <span className="max-w-full truncate text-xs text-ink-muted">
          {roleLabelText}
        </span>
      ) : null}
      {statusText ? (
        <span
          className={`text-xs ${dead ? 'text-ink-subtle' : 'text-ink-muted'}`}
        >
          {statusText}
        </span>
      ) : null}
    </>
  )

  return (
    <li aria-current={acting ? 'step' : undefined} className="h-full min-w-0">
      {interactive ? (
        <button
          aria-label={displayName}
          aria-pressed={selected}
          className="group h-full w-full cursor-pointer rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-red-500"
          type="button"
          disabled={disabled}
          onClick={onSelect}
        >
          <TokenSurface className={surfaceClassName}>{content}</TokenSurface>
        </button>
      ) : (
        <TokenSurface className={surfaceClassName}>{content}</TokenSurface>
      )}
    </li>
  )
}
