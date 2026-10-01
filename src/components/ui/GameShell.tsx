import type { PlayerGameView } from '#/game/projections/model'
import type { ReactNode } from 'react'

import { phaseBackdrop } from './PhaseIndicator'

const BACKDROP_LAYERS = [
  'bg-night',
  'bg-day',
  'bg-voting',
  'bg-game-over',
  'bg-result',
] as const

/**
 * "Sân khấu giữa": tranh theo pha thành cánh gà hai bên, toàn bộ nội dung
 * chơi nằm trong MỘT cột trung tâm (~672px) trên panel mực gần đặc — mắt
 * chỉ cần bao một vùng, tranh thở ở rìa. Header trong suốt phía trên panel,
 * dải tối cố định phía trên cùng giúp chữ header đọc được trên tranh sáng.
 */
export function GameShell({
  phase,
  winner = null,
  header,
  children,
}: {
  phase: PlayerGameView['phase']
  /** Dùng để chọn tranh kết thúc: Ma sói thắng = trăng máu, còn lại = đêm hội. */
  winner?: PlayerGameView['winner']
  header: ReactNode
  children: ReactNode
}) {
  const backdrop = phaseBackdrop(phase, winner ?? undefined)
  return (
    <main
      data-bg={backdrop ?? undefined}
      className="isolate relative min-h-dvh px-4 py-5 sm:px-6 sm:py-7 lg:py-9"
    >
      <div aria-hidden="true" className="phase-backdrop">
        {BACKDROP_LAYERS.map((layer) => (
          <div className={layer} key={layer} />
        ))}
      </div>
      <div aria-hidden="true" className="phase-scrim" />
      <div
        aria-hidden="true"
        className="fixed inset-x-0 top-0 -z-[8] h-24 bg-linear-to-b from-midnight/85 via-midnight/50 to-transparent"
      />
      <div className="relative mx-auto flex w-full max-w-2xl flex-col gap-5">
        {header}
        <section className="ink-panel rounded-3xl px-5 pt-6 pb-8 sm:px-7">
          {children}
        </section>
      </div>
    </main>
  )
}
