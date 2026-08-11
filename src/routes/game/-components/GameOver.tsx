import type { GameState } from '#/game/orchestration/model'

export function GameOver({ winner }: { winner: GameState['winner'] }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="font-mono text-sm tracking-wide text-red-300 uppercase">
        Ván chơi kết thúc
      </p>
      <h2 className="text-balance text-3xl font-medium tracking-tight text-stone-50">
        {winner === 'WEREWOLF'
          ? 'Phe Ma sói chiến thắng'
          : 'Phe Dân làng chiến thắng'}
      </h2>
      <p className="text-pretty text-base/7 text-stone-400 sm:text-sm/6">
        Toàn bộ diễn biến vẫn được giữ trong lịch sử append-only của phòng.
      </p>
    </div>
  )
}
