import type { ReactNode } from 'react'

import { Check } from 'lucide-react'

export type PlayerTokenProps = {
  displayName: string
  index: number
  selectable?: boolean
  selected?: boolean
  dead?: boolean
  disabled?: boolean
  acting?: boolean
  isYou?: boolean
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
      className={`relative flex min-h-28 w-full flex-col items-center justify-center gap-2 rounded-2xl px-3 py-4 text-center ring-1 transition-colors group-hover:bg-surface-raised ${className}`}
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
  isYou = false,
  roleImageSrc = null,
  roleLabelText = null,
  statusText = null,
  onSelect,
}: PlayerTokenProps) {
  const unavailable = dead || disabled
  const interactive = selectable && !unavailable
  const surfaceClassName = selected
    ? 'bg-danger/15 ring-2 ring-danger'
    : dead
      ? 'bg-transparent opacity-55 ring-line saturate-50'
      : acting
        ? 'bg-danger/10 ring-danger/40'
        : 'bg-surface ring-line'

  const content = (
    <>
      {selected ? (
        <span
          aria-hidden="true"
          className="absolute top-2 right-2 grid size-5 place-items-center rounded-full bg-danger text-white"
        >
          <Check className="size-3.5" />
        </span>
      ) : null}
      {dead ? (
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
      <span className="max-w-full text-sm font-medium text-ink">
        <span className={dead ? 'line-through decoration-ink-subtle' : ''}>
          {displayName}
        </span>
        {isYou ? (
          <span className="ml-1.5 rounded-full bg-amber-300/10 px-1.5 py-0.5 align-middle text-xs font-medium text-amber-200 ring-1 ring-amber-300/20">
            Bạn
          </span>
        ) : null}
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
    <li aria-current={acting ? 'step' : undefined} className="min-w-0">
      {interactive ? (
        <button
          aria-label={displayName}
          aria-pressed={selected}
          className="group w-full cursor-pointer rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-red-500"
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
