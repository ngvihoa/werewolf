import { roleLabel } from '#/game/presentation/labels'

import { StatusBadge } from './StatusBadge'

export type RoomPlayer = {
  id: string
  displayName: string
  ready: boolean
  role: 'VILLAGER' | 'WEREWOLF' | 'SEER' | 'WITCH' | null
  alive?: boolean
}

export function PlayerList({
  players,
  isModerator,
  rolesAssigned,
  activePlayerIds,
  currentPlayerId,
  showLifeStatus = false,
}: {
  players: RoomPlayer[]
  isModerator: boolean
  rolesAssigned: boolean
  activePlayerIds?: ReadonlySet<string>
  currentPlayerId?: string
  showLifeStatus?: boolean
}) {
  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <h2 className="text-xl font-medium text-stone-100">Người chơi</h2>
        <p className="font-mono text-sm tabular-nums text-stone-500">
          {players.length} / 6
        </p>
      </div>
      <ul className="divide-y divide-white/10" role="list">
        {players.length ? (
          players.map((player, index) => {
            const active = activePlayerIds?.has(player.id) ?? false
            const isCurrentPlayer = player.id === currentPlayerId
            return (
              <li
                aria-current={active ? 'step' : undefined}
                className={`grid grid-cols-[auto_1fr_auto] items-center gap-4 rounded-lg px-3 py-4 transition-colors ${
                  active
                    ? 'bg-red-500/10 ring-1 ring-red-400/25'
                    : 'ring-1 ring-transparent'
                }`}
                key={player.id}
              >
                <span
                  className={`grid size-10 place-items-center overflow-hidden rounded-full font-mono text-sm ring-1 ${
                    active
                      ? 'bg-red-500/15 text-red-200 ring-red-400/40'
                      : 'bg-white/5 text-stone-400 ring-white/10'
                  }`}
                >
                  {isModerator && player.role ? (
                    <img
                      alt={`Vai ${roleLabel(player.role)}`}
                      className="size-full object-cover"
                      height={40}
                      src={`/role/${player.role.toLowerCase()}.png`}
                      width={40}
                    />
                  ) : (
                    String(index + 1).padStart(2, '0')
                  )}
                </span>
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-base font-medium text-stone-100 sm:text-sm">
                    <span className="truncate">{player.displayName}</span>
                    {isCurrentPlayer ? (
                      <span className="shrink-0 rounded-full bg-amber-300/10 px-2 py-0.5 text-xs font-medium text-amber-200 ring-1 ring-amber-300/20">
                        Bạn
                      </span>
                    ) : null}
                  </p>
                  <p className="truncate text-base/7 text-stone-500 sm:text-sm/6">
                    {isModerator && player.role
                      ? roleLabel(player.role)
                      : 'Vai trò được giữ kín'}
                  </p>
                </div>
                <StatusBadge
                  ready={player.ready}
                  assigned={rolesAssigned}
                  active={active}
                  alive={player.alive}
                  showLifeStatus={showLifeStatus}
                />
              </li>
            )
          })
        ) : (
          <li className="py-12 text-center text-base/7 text-stone-500 sm:text-sm/6">
            Chưa có người chơi. Room code đang chờ được nhập.
          </li>
        )}
      </ul>
    </div>
  )
}
