import type { PlayerGameView } from '#/game/projections/model'

import { Moon, Sun } from 'lucide-react'

type GamePhase = PlayerGameView['phase']

/** Đêm/ngày quyết định khí quyển; các pha trung tính không đổi nền. */
export function phaseKind(phase: GamePhase): 'night' | 'day' | null {
  if (phase === 'NIGHT' || phase === 'NIGHT_RESOLUTION') return 'night'
  if (
    phase === 'DAY' ||
    phase === 'VOTE' ||
    phase === 'VOTE_RESOLUTION' ||
    phase === 'HUNTER_SHOT' ||
    phase === 'GAME_OVER'
  ) {
    return 'day'
  }
  return null
}

function phaseDisplay(phase: GamePhase, round: number): string {
  if (phase === 'NIGHT') return `Đêm ${String(round).padStart(2, '0')}`
  if (phase === 'DAY') return `Ngày ${String(round).padStart(2, '0')}`
  return (
    {
      NIGHT_RESOLUTION: 'Gần sáng',
      VOTE: 'Biểu quyết',
      VOTE_RESOLUTION: 'Kết quả biểu quyết',
      HUNTER_SHOT: 'Phát súng cuối cùng',
      GAME_OVER: 'Kết thúc ván',
      LOBBY: 'Sảnh chờ',
      SETUP: 'Chuẩn bị',
      ROLE_REVEAL: 'Xem vai',
      READY_CHECK: 'Chờ sẵn sàng',
    } as const
  )[phase]
}

function phaseEvent(phase: GamePhase): string {
  return (
    {
      NIGHT: 'Làng chìm vào giấc ngủ.',
      NIGHT_RESOLUTION: 'Trời sắp sáng, đợi công bố.',
      DAY: 'Làng thức dậy.',
      VOTE: 'Cả bàn đang chỉ ra ai là Ma sói.',
      VOTE_RESOLUTION: 'Kết quả sắp được công bố.',
      HUNTER_SHOT: 'Thợ săn kịp thời trả thù.',
      GAME_OVER: 'Sự thật đã được lộ ra.',
      LOBBY: 'Phòng đang chờ người chơi.',
      SETUP: 'Đang chuẩn bị ván mới.',
      ROLE_REVEAL: 'Xem vai trong kín đáo.',
      READY_CHECK: 'Chờ mọi người xác nhận sẵn sàng.',
    } as const
  )[phase]
}

export function PhaseIndicator({
  phase,
  round,
}: {
  phase: GamePhase
  round: number
}) {
  const kind = phaseKind(phase)
  const Icon = kind === 'day' ? Sun : Moon
  return (
    <div className="flex items-center gap-4">
      <span
        className={`grid size-12 shrink-0 place-items-center rounded-full ring-1 ${
          kind === 'day'
            ? 'bg-amber-300/10 text-amber-200 ring-amber-300/25'
            : 'bg-surface text-ink ring-line'
        }`}
      >
        <Icon aria-hidden="true" className="size-6" strokeWidth={1.5} />
      </span>
      <div className="min-w-0">
        <h2 className="text-3xl font-medium tracking-tight text-ink">
          {phaseDisplay(phase, round)}
        </h2>
        <p className="pt-0.5 text-sm text-ink-muted">{phaseEvent(phase)}</p>
      </div>
    </div>
  )
}
