import type { PlayerGameView } from '#/game/projections/model'
import type { Winner } from '#/game/domain'

import { Moon, Sun } from 'lucide-react'

type GamePhase = PlayerGameView['phase']

export type PhaseBackdrop = 'night' | 'day' | 'voting' | 'game-over' | 'result'

/**
 * Tranh nền theo pha — cùng một quảng trường làng đổi mood theo khoảnh khắc
 * của ván (public/bg/*.webp). Sảnh và chuẩn bị dùng tranh ban ngày; null
 * chỉ còn là phương án dự phòng khi không map được pha. Kết thúc ván: Ma sói
 * thắng dùng trăng máu, mọi kết quả khác dùng đêm hội đèn trời.
 */
export function phaseBackdrop(
  phase: GamePhase,
  winner?: Winner | null,
): PhaseBackdrop | null {
  if (phase === 'NIGHT' || phase === 'NIGHT_RESOLUTION') return 'night'
  if (
    phase === 'DAY' ||
    phase === 'LOBBY' ||
    phase === 'SETUP' ||
    phase === 'ROLE_REVEAL' ||
    phase === 'READY_CHECK'
  ) {
    return 'day'
  }
  if (
    phase === 'VOTE' ||
    phase === 'VOTE_RESOLUTION' ||
    phase === 'HUNTER_SHOT'
  ) {
    return 'voting'
  }
  if (phase === 'GAME_OVER') {
    return winner === 'WEREWOLF' ? 'game-over' : 'result'
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

/**
 * Tông màu icon theo pha — chỉ là nhấn nghĩa trang trí gắn với tranh nền
 * (amber = ngày, indigo = đêm, sky = gần sáng, orange = biểu quyết, lantern
 * = kết thúc); KHÔNG phải semantic status — bảng mapping màu xem
 * docs/revamp-ui-ux.md mục semantic color.
 */
function phaseIconTint(phase: GamePhase): string {
  if (phase === 'NIGHT') {
    return 'bg-indigo-300/10 text-indigo-200 ring-indigo-300/25'
  }
  if (phase === 'NIGHT_RESOLUTION') {
    return 'bg-sky-300/10 text-sky-200 ring-sky-300/25'
  }
  if (
    phase === 'VOTE' ||
    phase === 'VOTE_RESOLUTION' ||
    phase === 'HUNTER_SHOT'
  ) {
    return 'bg-orange-300/10 text-orange-200 ring-orange-300/25'
  }
  if (phase === 'GAME_OVER') {
    return 'bg-lantern/10 text-lantern ring-lantern/25'
  }
  return 'bg-amber-300/10 text-amber-200 ring-amber-300/25'
}

export function PhaseIndicator({
  phase,
  round,
}: {
  phase: GamePhase
  round: number
}) {
  const Icon = phaseBackdrop(phase) === 'day' ? Sun : Moon
  return (
    <div className="flex items-center gap-4">
      <span
        className={`grid size-12 shrink-0 place-items-center rounded-full ring-1 ${phaseIconTint(phase)}`}
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
