import type { Role, Team } from '#/game/domain'

import { ShieldCheck, Skull, Trophy } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { getRoleTeam } from '#/game/domain'

export function GameResultDialog({
  winner,
  role,
}: {
  winner: Team
  role: Role
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const playerTeam = getRoleTeam(role)
  const won = playerTeam === winner
  const isWerewolf = playerTeam === 'WEREWOLF'

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [winner])

  const Icon = won ? Trophy : Skull
  const teamName = isWerewolf ? 'phe Ma sói' : 'phe Dân làng'

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="game-result-title"
      aria-describedby="game-result-description"
      className="m-auto w-[calc(100%-2.5rem)] max-w-md overflow-hidden rounded-3xl bg-stone-950 p-0 text-stone-50 shadow-2xl ring-1 ring-white/15 backdrop:bg-stone-950/85 backdrop:backdrop-blur-sm"
    >
      <div
        className={`h-1.5 w-full ${won ? 'bg-emerald-400' : 'bg-red-500'}`}
        aria-hidden="true"
      />
      <div className="flex flex-col items-center gap-6 p-6 text-center sm:p-8">
        <div
          className={`grid size-20 place-items-center rounded-full ring-1 ${
            won
              ? 'bg-emerald-400/10 text-emerald-300 ring-emerald-300/25'
              : 'bg-red-500/10 text-red-300 ring-red-400/25'
          }`}
        >
          <Icon className="size-10" strokeWidth={1.5} aria-hidden="true" />
        </div>

        <div className="flex flex-col items-center gap-3">
          <p
            className={`font-mono text-sm tracking-wide uppercase ${
              won ? 'text-emerald-300' : 'text-red-300'
            }`}
          >
            {won ? 'Chiến thắng' : 'Thất bại'}
          </p>
          <h2
            id="game-result-title"
            className="text-balance text-3xl font-medium tracking-tight"
          >
            {won ? 'Chúc mừng, phe của bạn đã thắng!' : 'Phe của bạn đã thua'}
          </h2>
          <p
            id="game-result-description"
            className="max-w-[38ch] text-pretty text-base/7 text-stone-400 sm:text-sm/6"
          >
            {won
              ? `Bạn thuộc ${teamName}. Mọi quyết định trong ván đấu đã đưa phe của bạn đến chiến thắng.`
              : `Bạn thuộc ${teamName}. ${winner === 'WEREWOLF' ? 'Phe Ma sói' : 'Phe Dân làng'} đã giành chiến thắng trong ván này.`}
          </p>
        </div>

        <div className="flex w-full items-center gap-3 rounded-2xl bg-white/5 p-4 text-left ring-1 ring-white/10">
          <ShieldCheck
            className="size-6 shrink-0 text-stone-300 sm:size-5"
            aria-hidden="true"
          />
          <p className="text-pretty text-base/7 text-stone-300 sm:text-sm/6">
            Vai trò của bạn: {roleLabel(role)} ·{' '}
            {isWerewolf ? 'Phe Ma sói' : 'Phe Dân làng'}
          </p>
        </div>

        <form method="dialog" className="w-full">
          <button
            type="submit"
            className={`w-full rounded-xl px-3 py-2.5 text-base font-medium focus-visible:outline-2 focus-visible:outline-offset-2 sm:py-2 sm:text-sm ${
              won
                ? 'bg-emerald-400 text-stone-950 focus-visible:outline-emerald-400'
                : 'bg-red-500 text-white focus-visible:outline-red-500'
            }`}
          >
            Xem lại kết quả
          </button>
        </form>
      </div>
    </dialog>
  )
}

function roleLabel(role: Role): string {
  switch (role) {
    case 'WEREWOLF':
      return 'Ma sói'
    case 'SEER':
      return 'Tiên tri'
    case 'WITCH':
      return 'Phù thủy'
    case 'PROTECTOR':
      return 'Bảo vệ'
    case 'HUNTER':
      return 'Thợ săn'
    case 'VILLAGER':
      return 'Dân làng'
  }
}
