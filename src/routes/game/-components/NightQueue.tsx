import type { GameState } from '#/game/orchestration/model'

import { queueStatusLabel, queueStepLabel } from '#/game/presentation/labels'

export function NightQueue({ queue }: { queue: GameState['queue'] }) {
  return (
    <ol
      className="divide-y divide-white/10 border-y border-white/10"
      role="list"
    >
      {queue.map((item, index) => {
        const active =
          item.status === 'ACTIVE' ||
          item.status === 'WAITING_MODERATOR_CONFIRMATION'
        return (
          <li
            aria-current={active ? 'step' : undefined}
            className={`grid grid-cols-[auto_1fr_auto] items-center gap-3 px-3 py-3 transition-colors ${
              active ? 'bg-red-500/10 ring-1 ring-inset ring-red-400/20' : ''
            }`}
            key={item.step}
          >
            <p className="font-mono text-sm tabular-nums text-stone-600">
              {String(index + 1).padStart(2, '0')}
            </p>
            <p className="text-base text-stone-300 sm:text-sm">
              {queueStepLabel(item.step)}
            </p>
            <p
              className={`flex items-center gap-2 font-mono text-sm uppercase ${active ? 'text-red-300' : 'text-stone-600'}`}
            >
              {active ? (
                <span className="size-1.5 animate-pulse rounded-full bg-red-400" />
              ) : null}
              {queueStatusLabel(item.status)}
            </p>
          </li>
        )
      })}
    </ol>
  )
}
