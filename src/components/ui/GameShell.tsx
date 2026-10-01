import type { PlayerGameView } from '#/game/projections/model'
import type { ReactNode } from 'react'

import { phaseBackdrop } from './PhaseIndicator'

/**
 * Khung chơi dùng chung: mobile xếp action panel (sidebar) lên trước người
 * chơi để "một hành động chính" luôn thấy đầu tiên; desktop tách hai cột
 * theo tỉ lệ sân khấu : ngữ cảnh.
 *
 * Concept "tranh kể chuyện, giao diện im lặng": một bức tranh theo pha nằm
 * full-bleed dưới cùng (crossfade khi đổi pha), màn che scrim đảm bảo chữ
 * đạt contrast; nội dung không thêm khung kính nào khác.
 */
const BACKDROP_LAYERS = [
  'bg-night',
  'bg-day',
  'bg-voting',
  'bg-game-over',
] as const

export function GameShell({
  phase,
  header,
  stage,
  sidebar,
}: {
  phase: PlayerGameView['phase']
  header: ReactNode
  stage: ReactNode
  sidebar: ReactNode
}) {
  const backdrop = phaseBackdrop(phase)
  return (
    <main
      data-bg={backdrop ?? undefined}
      className="isolate relative min-h-dvh px-5 py-6 sm:px-8 sm:py-8 lg:px-12"
    >
      <div aria-hidden="true" className="phase-backdrop">
        {BACKDROP_LAYERS.map((layer) => (
          <div className={layer} key={layer} />
        ))}
      </div>
      <div aria-hidden="true" className="phase-scrim" />
      <div className="relative mx-auto flex max-w-6xl flex-col gap-8 sm:gap-10">
        {header}
        <div className="grid gap-8 lg:grid-cols-[3fr_2fr] lg:gap-16">
          <div className="order-2 flex min-w-0 flex-col gap-6 lg:order-1 lg:gap-8">
            {stage}
          </div>
          <aside className="order-1 min-w-0 lg:order-2 lg:sticky lg:top-8 lg:self-start">
            {sidebar}
          </aside>
        </div>
      </div>
    </main>
  )
}
