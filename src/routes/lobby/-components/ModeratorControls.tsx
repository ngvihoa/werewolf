import type { Role, RoleCompositionSelection } from '#/game/domain'

import { InlineError } from '#/components/InlineError'
import { ROLE_VALUES } from '#/game/schema'
import { roleLabel } from '#/game/presentation/labels'
import { useState } from 'react'
import { Button } from '#/components/ui/Button'

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
  onAssign: (composition: RoleCompositionSelection) => void
  onStart: () => void
}) {
  const validCount = playerCount >= 5 && playerCount <= 15
  const [mode, setMode] = useState<RoleCompositionSelection['mode']>('DEFAULT')
  const [roleCounts, setRoleCounts] = useState<Record<Role, number>>(() => {
    return Object.fromEntries(ROLE_VALUES.map((role) => [role, 0])) as Record<
      Role,
      number
    >
  })
  const selectedRoleCount = Object.values(roleCounts).reduce(
    (total, count) => total + count,
    0,
  )
  const composition: RoleCompositionSelection =
    mode === 'CUSTOM'
      ? {
          mode,
          roles: ROLE_VALUES.flatMap((role) =>
            Array<Role>(roleCounts[role]).fill(role),
          ),
        }
      : { mode }
  const invalidSelection =
    !validCount ||
    selectedRoleCount > playerCount ||
    (mode === 'NO_VILLAGER' && playerCount === 15)

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <p className="font-mono text-sm tracking-wide text-red-300 uppercase">
          Điều khiển sảnh
        </p>
        <h2 className="text-balance text-2xl font-medium tracking-tight text-stone-50 sm:text-3xl">
          Chuẩn bị trước khi đêm xuống
        </h2>
        <p className="text-pretty text-base/7 text-stone-400 sm:text-sm/6">
          Phân vai khi đủ 5–15 người. Sau đó, mọi người xem vai riêng và xác
          nhận sẵn sàng.
        </p>
      </div>

      <ol className="flex flex-col divide-y divide-white/10" role="list">
        <ControlStep done={validCount} number="01" label="Đủ 5–15 người chơi" />
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

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 text-sm font-medium text-stone-200">
          Cách chọn vai
        </legend>
        {[
          ['DEFAULT', 'Mặc định'],
          ['NO_VILLAGER', 'Không Dân thường'],
          ['CUSTOM', 'Tự chọn vai'],
        ].map(([value, label]) => (
          <label
            className="flex items-center gap-3 text-sm text-stone-300"
            key={value}
          >
            <input
              checked={mode === value}
              className="size-4 accent-danger"
              disabled={value === 'NO_VILLAGER' && playerCount === 15}
              name="composition-mode"
              type="radio"
              value={value}
              onChange={() =>
                setMode(value as RoleCompositionSelection['mode'])
              }
            />
            {label}
          </label>
        ))}
        {playerCount === 15 ? (
          <p className="text-xs/5 text-stone-500">
            Preset không Dân thường không hỗ trợ 15 người để tránh tự thêm Sói.
          </p>
        ) : null}
      </fieldset>

      {mode === 'CUSTOM' ? (
        <div className="flex flex-col gap-3 border-t border-white/15 pt-5">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-medium text-stone-200">Danh sách vai</p>
            <p
              className={`font-mono text-xs ${selectedRoleCount > playerCount ? 'text-red-400' : 'text-stone-400'}`}
            >
              {selectedRoleCount}/{playerCount} đã chọn
            </p>
          </div>
          <p className="text-xs/5 text-stone-500">
            Nếu còn chỗ, hệ thống bổ sung Sói đến số lượng mặc định, sau đó lấp
            các vị trí còn lại bằng Dân. Chọn đủ vai sẽ giữ nguyên danh sách.
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
            {ROLE_VALUES.map((role) => {
              return (
                <label
                  className="flex items-center justify-between gap-3 rounded-md bg-white/[0.07] px-3 py-2 text-sm text-stone-200 ring-1 ring-white/15"
                  key={role}
                >
                  <span>{roleLabel(role)}</span>
                  <input
                    aria-label={`Chọn ${roleLabel(role)}`}
                    checked={roleCounts[role] === 1}
                    className="size-4 accent-danger"
                    type="checkbox"
                    onChange={(event) =>
                      setRoleCounts((current) => ({
                        ...current,
                        [role]: event.target.checked ? 1 : 0,
                      }))
                    }
                  />
                </label>
              )
            })}
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
        <Button
          variant="secondary"
          size="lg"
          fullWidth
          pending={assigning}
          pendingLabel="Đang xáo vai..."
          disabled={invalidSelection || starting}
          onClick={() => onAssign(composition)}
        >
          {rolesAssigned ? 'Xáo và phân lại vai' : 'Xáo và phân vai'}
        </Button>
        <Button
          variant="primary"
          size="lg"
          fullWidth
          pending={starting}
          pendingLabel="Đang bắt đầu..."
          disabled={!rolesAssigned || !allReady || assigning}
          onClick={onStart}
        >
          Bắt đầu đêm đầu tiên
        </Button>
      </div>
      {error ? <InlineError message={error} /> : null}
    </div>
  )
}
