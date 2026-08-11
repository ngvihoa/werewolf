import type { GameState } from '#/game/orchestration/model'

import { queueStatusLabel, queueStepLabel } from '#/game/presentation/labels'

export function NightQueue({ queue }: { queue: GameState['queue'] }) {
  return (
    <ol
      className="divide-y divide-white/10 border-y border-white/10"
      role="list"
    >
      {queue.map((item, index) => (
        <li
          className="grid grid-cols-[auto_1fr_auto] items-center gap-3 py-3"
          key={item.step}
        >
          <p className="font-mono text-sm tabular-nums text-stone-600">
            {String(index + 1).padStart(2, '0')}
          </p>
          <p className="text-base text-stone-300 sm:text-sm">
            {queueStepLabel(item.step)}
          </p>
          <p
            className={`font-mono text-sm uppercase ${item.status === 'ACTIVE' || item.status === 'WAITING_MODERATOR_CONFIRMATION' ? 'text-red-300' : 'text-stone-600'}`}
          >
            {queueStatusLabel(item.status)}
          </p>
        </li>
      ))}
    </ol>
  )
}
