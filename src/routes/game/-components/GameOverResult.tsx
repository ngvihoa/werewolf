import type { PlayerGameView } from '#/game/projections/model'

import { ShieldCheck, Skull, Trophy } from 'lucide-react'
import { PlayerToken } from '#/components/ui/PlayerToken'
import { getRoleTeam } from '#/game/domain'
import { PlayerGrid } from '#/components/ui/PlayerGrid'
import { roleLabel } from '#/game/presentation/labels'
import {
  winnerDisplayName,
  didPlayerWin,
} from '#/game/presentation/game-result'

/**
 * Trang kết thúc ván phía người chơi: thẳng thắn thắng/thua rồi mở lộ vai
 * trò của cả làng — người thuộc phe thắng đeo vương miện trên thẻ.
 */
export function GameOverResult({ view }: { view: PlayerGameView }) {
  const winner = view.winner
  const role = view.me.role
  const hybridConverted =
    role === 'HYBRID_WOLF' &&
    view.me.abilityState !== null &&
    'converted' in view.me.abilityState &&
    view.me.abilityState.converted
  const won =
    role !== null && winner !== null
      ? didPlayerWin({
          role,
          winner,
          hybridConverted,
          isLover: view.lover !== null,
        })
      : false

  const isWinnerRole = (
    playerRole: NonNullable<(typeof view.players)[number]['role']>,
  ) => {
    if (!winner) return false
    if (winner === 'LOVERS') return false
    if (winner === 'FOOL' || winner === 'PIPER' || winner === 'WHITE_WOLF') {
      return playerRole === winner
    }
    return getRoleTeam(playerRole) === winner
  }

  const Icon = won ? Trophy : Skull

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col items-center gap-4 rounded-2xl bg-surface-raised px-5 py-7 text-center ring-1 ring-line">
        <div
          className={`grid size-16 place-items-center rounded-full ring-1 ${
            won
              ? 'bg-emerald-400/10 text-emerald-300 ring-emerald-300/25'
              : 'bg-danger/10 text-accent ring-danger/25'
          }`}
        >
          <Icon aria-hidden="true" className="size-8" strokeWidth={1.5} />
        </div>
        <div className="flex flex-col gap-2">
          <p
            className={`font-mono text-sm tracking-wide uppercase ${
              won ? 'text-emerald-300' : 'text-accent'
            }`}
          >
            {won ? 'Chiến thắng' : 'Thất bại'}
          </p>
          <h2 className="text-balance text-3xl font-medium tracking-tight text-ink">
            {winner
              ? `${winnerDisplayName(winner)} chiến thắng`
              : 'Ván đã kết thúc'}
          </h2>
          {role ? (
            <p className="text-pretty text-base/7 text-ink-muted">
              Vai trò của bạn:{' '}
              <span className="font-medium text-ink">{roleLabel(role)}</span>
            </p>
          ) : null}
        </div>
        <p className="flex items-center gap-2 rounded-full bg-surface px-3.5 py-1.5 text-sm text-ink-muted ring-1 ring-line">
          <ShieldCheck aria-hidden="true" className="size-4 shrink-0" />
          Toàn bộ vai trò đã được lộ ra bên dưới
        </p>
      </div>

      <PlayerGrid
        title="Sự thật được lộ ra"
        countLabel={`${view.players.length} người`}
        items={view.players}
        renderItem={(player, index) => {
          const playerWon = player.role ? isWinnerRole(player.role) : false
          return (
            <PlayerToken
              key={player.id}
              displayName={player.displayName}
              index={index}
              // Màn kết quả không phân biệt sống chết — mọi lá bài rõ như nhau.
              winner={playerWon}
              roleImageSrc={
                player.role ? `/role/${player.role.toLowerCase()}.png` : null
              }
              roleLabelText={
                player.role ? roleLabel(player.role) : 'Vai được giữ kín'
              }
            />
          )
        }}
      />
    </div>
  )
}
