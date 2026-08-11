export function RoomSummary({
  gameStarted,
  roomCode,
  version,
}: {
  gameStarted: boolean
  roomCode: string
  version: number
}) {
  return (
    <div className="flex flex-col gap-3">
      <p className="font-mono text-sm tracking-wide text-red-300 uppercase">
        {gameStarted ? 'Ván chơi đã bắt đầu' : 'Đang chờ trong sảnh'}
      </p>
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div className="flex flex-col gap-2">
          <h1 className="text-balance text-4xl font-medium tracking-tight text-stone-50 sm:text-5xl">
            Phòng <span className="font-mono text-red-200">{roomCode}</span>
          </h1>
          <p className="text-pretty text-base/7 text-stone-400 sm:text-sm/6">
            Chia sẻ mã này cho người chơi mở trong tab hoặc thiết bị khác.
          </p>
        </div>
        <div className="flex items-center gap-2 font-mono text-sm text-stone-500">
          <span className="size-1.5 rounded-full bg-emerald-400" />
          Local sync · v<span className="tabular-nums">{version}</span>
        </div>
      </div>
    </div>
  )
}
