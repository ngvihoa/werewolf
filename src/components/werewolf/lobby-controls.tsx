import { roleDescription, roleLabel } from './labels'
import { InlineError } from './feedback'

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
  const validCount = playerCount === 5 || playerCount === 6
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
          Phân vai khi đủ 5–6 người. Sau đó, mọi người xem vai riêng và xác nhận
          sẵn sàng.
        </p>
      </div>

      <ol className="flex flex-col divide-y divide-white/10" role="list">
        <ControlStep done={validCount} number="01" label="Đủ 5–6 người chơi" />
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

export function PlayerControls({
  role,
  ready,
  pending,
  error,
  onReadyChange,
}: {
  role: 'VILLAGER' | 'WEREWOLF' | 'SEER' | 'WITCH' | null
  ready: boolean
  pending: boolean
  error: string | null
  onReadyChange: (ready: boolean) => void
}) {
  if (!role) {
    return (
      <div className="flex flex-col gap-4">
        <p className="font-mono text-sm tracking-wide text-red-300 uppercase">
          Đang chờ Quản trò
        </p>
        <h2 className="text-balance text-3xl font-medium tracking-tight text-stone-50">
          Vai trò chưa được phân
        </h2>
        <p className="text-pretty text-base/7 text-stone-400 sm:text-sm/6">
          Giữ tab này mở. Vai của bạn sẽ xuất hiện riêng tại đây sau khi Quản
          trò xáo vai.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <p className="font-mono text-sm tracking-wide text-red-300 uppercase">
          Vai của bạn
        </p>
        <h2 className="text-4xl font-medium tracking-tight text-stone-50">
          {roleLabel(role)}
        </h2>
        <p className="text-pretty text-base/7 text-stone-400 sm:text-sm/6">
          {roleDescription(role)}
        </p>
      </div>
      <div className="rounded-lg bg-white/5 p-5 ring-1 ring-white/10">
        <p className="font-mono text-sm tracking-wide text-stone-500 uppercase">
          Bảo mật vai
        </p>
        <p className="pt-3 text-pretty text-base/7 text-stone-300 sm:text-sm/6">
          Chỉ màn hình của bạn và Quản trò nhận được thông tin này. Đừng chuyền
          thiết bị khi vai đang hiển thị.
        </p>
      </div>
      <button
        className={
          ready
            ? 'rounded-md bg-white/5 px-3 py-2 text-sm font-medium text-stone-200 ring-1 ring-white/10 transition-colors hover:bg-white/10 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500'
            : 'rounded-md bg-red-700 px-3 py-2 text-sm font-medium text-white ring-1 ring-red-700 transition-colors hover:bg-red-600 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500'
        }
        type="button"
        disabled={pending}
        onClick={() => onReadyChange(!ready)}
      >
        {pending
          ? 'Đang cập nhật...'
          : ready
            ? 'Hủy sẵn sàng'
            : 'Tôi đã xem vai và sẵn sàng'}
      </button>
      {error ? <InlineError message={error} /> : null}
    </div>
  )
}

function ControlStep({
  done,
  number,
  label,
}: {
  done: boolean
  number: string
  label: string
}) {
  return (
    <li className="grid grid-cols-[auto_1fr_auto] items-center gap-3 py-4 first:pt-0 last:pb-0">
      <span className="font-mono text-sm text-stone-600">{number}</span>
      <p className="text-base text-stone-300 sm:text-sm">{label}</p>
      <span
        className={`size-2 rounded-full ${done ? 'bg-emerald-400' : 'bg-stone-700'}`}
      />
    </li>
  )
}
