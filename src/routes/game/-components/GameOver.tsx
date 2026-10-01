import type { GameState } from '#/game/orchestration/model'

import { Skull } from 'lucide-react'

export function GameOver({ winner }: { winner: GameState['winner'] }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="font-mono text-sm tracking-wide text-accent uppercase">
        Ván chơi kết thúc
      </p>
      <h2 className="text-balance text-3xl font-medium tracking-tight text-ink">
        {winner === 'FOOL'
          ? 'Thằng ngốc chiến thắng'
          : winner === 'PIPER'
            ? 'Người thổi sáo chiến thắng'
            : winner === 'WHITE_WOLF'
              ? 'Sói Trắng chiến thắng'
              : winner === 'LOVERS'
                ? 'Cặp tình nhân chiến thắng'
                : winner === 'WEREWOLF'
                  ? 'Phe Ma sói chiến thắng'
                  : 'Phe Dân làng chiến thắng'}
      </h2>
      <p className="text-pretty text-base/7 text-ink-muted sm:text-sm/6">
        Toàn bộ diễn biến vẫn được giữ trong lịch sử append-only của phòng.
      </p>
      <Skull
        aria-hidden="true"
        className="size-8 self-start text-ink-subtle"
        strokeWidth={1.5}
      />
    </div>
  )
}
