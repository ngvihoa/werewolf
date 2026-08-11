import { roleDescription, roleLabel } from '#/game/presentation/labels'
import { InlineError } from '#/components/InlineError'
import { RoleCard } from '#/components/RoleCard'

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
      <RoleCard role={role} />
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
