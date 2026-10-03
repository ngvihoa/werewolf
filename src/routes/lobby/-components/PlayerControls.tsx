import type { Role } from '#/game/domain'

import { InlineError } from '#/components/InlineError'
import { RoleCard } from '#/components/RoleCard'
import { Button } from '#/components/ui/Button'

export function PlayerControls({
  mode = 'MODERATED',
  role,
  ready,
  pending,
  error,
  onReadyChange,
}: {
  // SELF mode: không có Quản trò — người phân vai là chủ phòng.
  mode?: 'MODERATED' | 'SELF'
  role: Role | null
  ready: boolean
  pending: boolean
  error: string | null
  onReadyChange: (ready: boolean) => void
}) {
  const isSelf = mode === 'SELF'
  if (!role) {
    return (
      <div className="flex flex-col gap-4">
        <p className="font-mono text-sm tracking-wide text-accent uppercase">
          {isSelf ? 'Đang chờ chủ phòng' : 'Đang chờ Quản trò'}
        </p>
        <h2 className="text-balance text-2xl font-medium tracking-tight text-ink sm:text-3xl">
          Vai trò chưa được phân
        </h2>
        <p className="text-pretty text-base/7 text-ink-muted sm:text-sm/6">
          {isSelf
            ? 'Giữ tab này mở. Vai của bạn sẽ xuất hiện riêng tại đây sau khi chủ phòng xáo vai.'
            : 'Giữ tab này mở. Vai của bạn sẽ xuất hiện riêng tại đây sau khi Quản trò xáo vai.'}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <p className="font-mono text-sm tracking-wide text-accent uppercase">
          Vai của bạn
        </p>
        <h2 className="text-3xl font-medium tracking-tight text-ink sm:text-4xl">
          Vai trò đã được phân
        </h2>
        <p className="text-pretty text-base/7 text-ink-muted sm:text-sm/6">
          Mở thẻ bên dưới để xem riêng vai trò của bạn.
        </p>
      </div>
      <RoleCard role={role} />
      <div className="rounded-2xl bg-surface p-5 ring-1 ring-line">
        <p className="font-mono text-sm tracking-wide text-ink-muted uppercase">
          Bảo mật vai
        </p>
        <p className="pt-3 text-pretty text-base/7 text-ink sm:text-sm/6">
          {isSelf
            ? 'Chỉ màn hình của bạn nhận được thông tin này. Đừng chuyền thiết bị khi vai đang hiển thị.'
            : 'Chỉ màn hình của bạn và Quản trò nhận được thông tin này. Đừng chuyền thiết bị khi vai đang hiển thị.'}
        </p>
      </div>
      <Button
        variant={ready ? 'secondary' : 'primary'}
        size="lg"
        fullWidth
        pending={pending}
        onClick={() => onReadyChange(!ready)}
      >
        {ready ? 'Hủy sẵn sàng' : 'Tôi đã xem vai và sẵn sàng'}
      </Button>
      {error ? <InlineError message={error} /> : null}
    </div>
  )
}
