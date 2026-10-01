import type { GameState } from '#/game/orchestration/model'

import { CommandButton } from './CommandButton'

export function ResolutionControl({
  deaths,
  convertedHybridPlayerIds,
  names,
  pending,
  onConfirm,
}: {
  deaths: NonNullable<GameState['pendingNightResolution']>['deaths']
  convertedHybridPlayerIds: NonNullable<
    GameState['pendingNightResolution']
  >['convertedHybridPlayerIds']
  names: Map<string, string>
  pending: boolean
  onConfirm: () => void
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl bg-surface-raised p-5 ring-1 ring-line">
        <p className="font-mono text-sm tracking-wide text-ink-muted uppercase">
          Kết quả dự kiến
        </p>
        <p className="pt-3 text-base/7 text-ink sm:text-sm/6">
          {deaths.length
            ? deaths
                .map((death) => names.get(death.playerId) ?? 'Người chơi')
                .join(', ')
            : 'Không ai bị loại trong đêm này'}
        </p>
      </div>
      {convertedHybridPlayerIds.length ? (
        <div className="rounded-2xl bg-danger/10 p-5 ring-1 ring-danger/25">
          <p className="font-mono text-sm tracking-wide text-accent uppercase">
            Chuyển hóa bí mật
          </p>
          <p className="pt-3 text-base/7 text-ink sm:text-sm/6">
            {convertedHybridPlayerIds
              .map((playerId) => names.get(playerId) ?? 'Người chơi')
              .join(', ')}{' '}
            sẽ sống sót và chuyển sang phe Ma sói. Không công bố thông tin này.
          </p>
        </div>
      ) : null}
      <CommandButton primary pending={pending} onClick={onConfirm}>
        Công bố kết quả và mở ngày
      </CommandButton>
    </div>
  )
}
