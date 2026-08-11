import type { GameState } from '#/game/orchestration/model'

import { CommandButton } from './CommandButton'

export function ResolutionControl({
  deaths,
  names,
  pending,
  onConfirm,
}: {
  deaths: NonNullable<GameState['pendingNightResolution']>['deaths']
  names: Map<string, string>
  pending: boolean
  onConfirm: () => void
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-lg bg-white/5 p-5 ring-1 ring-white/10">
        <p className="font-mono text-sm tracking-wide text-stone-500 uppercase">
          Kết quả dự kiến
        </p>
        <p className="pt-3 text-base/7 text-stone-200 sm:text-sm/6">
          {deaths.length
            ? deaths
                .map((death) => names.get(death.playerId) ?? 'Người chơi')
                .join(', ')
            : 'Không ai bị loại trong đêm này'}
        </p>
      </div>
      <CommandButton primary pending={pending} onClick={onConfirm}>
        Công bố kết quả và mở ngày
      </CommandButton>
    </div>
  )
}
