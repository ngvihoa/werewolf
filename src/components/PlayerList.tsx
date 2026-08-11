import { roleLabel } from '#/game/presentation/labels'

import { StatusBadge } from './StatusBadge'

export type RoomPlayer = {
  id: string
  displayName: string
  ready: boolean
  role: 'VILLAGER' | 'WEREWOLF' | 'SEER' | 'WITCH' | null
}

export function PlayerList({
  players,
  isModerator,
  rolesAssigned,
}: {
  players: RoomPlayer[]
  isModerator: boolean
  rolesAssigned: boolean
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
          players.map((player, index) => (
            <li
              className="grid grid-cols-[auto_1fr_auto] items-center gap-4 py-4"
              key={player.id}
            >
              <span className="grid size-10 place-items-center rounded-full bg-white/5 font-mono text-sm text-stone-400 ring-1 ring-white/10">
                {String(index + 1).padStart(2, '0')}
              </span>
              <div className="min-w-0">
                <p className="truncate text-base font-medium text-stone-100 sm:text-sm">
                  {player.displayName}
                </p>
                <p className="truncate text-base/7 text-stone-500 sm:text-sm/6">
                  {isModerator && player.role
                    ? roleLabel(player.role)
                    : 'Vai trò được giữ kín'}
                </p>
              </div>
              <StatusBadge ready={player.ready} assigned={rolesAssigned} />
            </li>
          ))
        ) : (
          <li className="py-12 text-center text-base/7 text-stone-500 sm:text-sm/6">
            Chưa có người chơi. Room code đang chờ được nhập.
          </li>
        )}
      </ul>
    </div>
  )
}
