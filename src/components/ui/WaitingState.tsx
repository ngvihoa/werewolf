import type { ReactNode } from 'react'

import { Hourglass } from 'lucide-react'

export function WaitingState({
  title,
  description,
  icon,
}: {
  title: string
  description?: string
  icon?: ReactNode
}) {
  return (
    <div className="flex items-start gap-4 rounded-2xl bg-surface px-5 py-5 ring-1 ring-line">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white/5 text-ink-muted ring-1 ring-line">
        {icon ?? <Hourglass aria-hidden="true" className="size-5" strokeWidth={1.5} />}
      </span>
      <div className="min-w-0">
        <p className="font-medium text-ink">{title}</p>
        {description ? (
          <p className="pt-1 text-pretty text-sm/6 text-ink-muted">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  )
}
