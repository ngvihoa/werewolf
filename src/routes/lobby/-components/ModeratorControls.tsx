import { InlineError } from '#/components/InlineError'

import { ControlStep } from './ControlStep'

export function ModeratorControls({
  playerCount,
  rolesAssigned,
  allReady,
  assigning,
  starting,
  error,
  onAssign,
  onStart,
}: {
  playerCount: number
  rolesAssigned: boolean
  allReady: boolean
  assigning: boolean
  starting: boolean
  error: string | null
  onAssign: () => void
  onStart: () => void
}) {
  const validCount = playerCount >= 5 && playerCount <= 12
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <p className="font-mono text-sm tracking-wide text-red-300 uppercase">
          Điều khiển sảnh
        </p>
        <h2 className="text-balance text-3xl font-medium tracking-tight text-stone-50">
          Chuẩn bị trước khi đêm xuống
        </h2>
        <p className="text-pretty text-base/7 text-stone-400 sm:text-sm/6">
          Phân vai khi đủ 5–12 người. Sau đó, mọi người xem vai riêng và xác
          nhận sẵn sàng.
        </p>
      </div>

      <ol className="flex flex-col divide-y divide-white/10" role="list">
        <ControlStep done={validCount} number="01" label="Đủ 5–12 người chơi" />
        <ControlStep
          done={rolesAssigned}
          number="02"
          label="Đã phân vai bí mật"
        />
        <ControlStep
          done={allReady}
          number="03"
          label="Mọi người đã sẵn sàng"
        />
      </ol>

      <div className="flex flex-col gap-3">
        <button
          className="rounded-md bg-white/5 px-3 py-2 text-sm font-medium text-stone-200 ring-1 ring-white/10 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
          type="button"
          disabled={!validCount || assigning || starting}
          onClick={onAssign}
        >
          {assigning
            ? 'Đang xáo vai...'
            : rolesAssigned
              ? 'Xáo và phân lại vai'
              : 'Xáo và phân vai'}
        </button>
        <button
          className="rounded-md bg-red-700 px-3 py-2 text-sm font-medium text-white ring-1 ring-red-700 transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
          type="button"
          disabled={!rolesAssigned || !allReady || starting || assigning}
          onClick={onStart}
        >
          {starting ? 'Đang bắt đầu...' : 'Bắt đầu đêm đầu tiên'}
        </button>
      </div>
      {error ? <InlineError message={error} /> : null}
    </div>
  )
}
