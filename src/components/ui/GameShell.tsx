import type { PlayerGameView } from '#/game/projections/model'
import type { ReactNode } from 'react'

import { phaseKind } from './PhaseIndicator'

/**
 * Khung chơi dùng chung: mobile xếp action panel (sidebar) lên trước người
 * chơi để "một hành động chính" luôn thấy đầu tiên; desktop tách hai cột
 * theo tỉ lệ sân khấu : ngữ cảnh.
 */
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
  const kind = phaseKind(phase)
  return (
    <main
      data-phase={kind ?? undefined}
      className="isolate relative min-h-dvh px-5 py-6 sm:px-8 sm:py-8 lg:px-12"
    >
      {kind ? <div aria-hidden="true" className="phase-atmosphere" /> : null}
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
