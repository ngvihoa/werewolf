import type { GameState } from '#/game/orchestration/model'

import { queueStatusLabel, queueStepLabel } from '#/game/presentation/labels'
import { Check } from 'lucide-react'

export function NightQueue({ queue }: { queue: GameState['queue'] }) {
  return (
    <ol
      className="divide-y divide-line rounded-2xl border-y border-line"
      role="list"
    >
      {queue.map((item, index) => {
        const active =
          item.status === 'ACTIVE' ||
          item.status === 'WAITING_MODERATOR_CONFIRMATION'
        const waitingConfirm = item.status === 'WAITING_MODERATOR_CONFIRMATION'
        const done = item.status === 'COMPLETED'
        const skipped = item.status === 'SKIPPED'
        return (
          <li
            aria-current={active ? 'step' : undefined}
            className={`grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl px-3 py-3 transition-colors ${
              active ? 'bg-danger/10 ring-1 ring-danger/25 ring-inset' : ''
            }`}
            key={item.step}
          >
            <p className="font-mono text-sm tabular-nums text-ink-subtle">
              {String(index + 1).padStart(2, '0')}
            </p>
            <p
              className={`text-base sm:text-sm ${done || skipped ? 'text-ink-subtle' : 'text-ink'}`}
            >
              {queueStepLabel(item.step)}
            </p>
            <p
              className={`flex items-center gap-2 font-mono text-sm uppercase ${
                active
                  ? 'text-accent'
                  : done
                    ? 'text-emerald-300'
                    : 'text-ink-subtle'
              }`}
            >
              {item.status === 'ACTIVE' ? (
                <span
                  aria-hidden="true"
                  className="size-1.5 animate-pulse rounded-full bg-danger"
                />
              ) : null}
              {waitingConfirm ? (
                <span
                  aria-hidden="true"
                  className="size-1.5 animate-pulse rounded-full bg-amber-300"
                />
              ) : null}
              {done ? <Check aria-hidden="true" className="size-3.5" /> : null}
              {queueStatusLabel(item.status)}
            </p>
          </li>
        )
      })}
    </ol>
  )
}
