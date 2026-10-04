import type { GameState } from '#/game/orchestration/model'

import { useEffect, useState } from 'react'

/**
 * Revamp MODERATED (M6/M8): màn theo dõi biểu quyết trên thiết bị — x/y đã
 * bỏ, counts theo ứng viên (từ god view; breakdown từng lá phiếu không có ở
 * đây). Deadline hết giờ chỉ là ĐÈN ALERT (M8) — quản trò đôn ngoài đời hoặc
 * nhập kết quả tay, hệ thống không tự phát lệnh nào.
 */
export function VoteMonitor({
  state,
  names,
}: {
  state: GameState
  names: Map<string, string>
}) {
  const submissions = state.voteSubmissions ?? {}
  const alivePlayers = state.players.filter((player) => player.alive)
  const votedCount = alivePlayers.filter(
    (player) => submissions[player.id] !== undefined,
  ).length
  const counts = new Map<string, number>()
  for (const [voterId, targetId] of Object.entries(submissions)) {
    if (!targetId) continue
    if (!alivePlayers.some((player) => player.id === voterId)) continue
    counts.set(targetId, (counts.get(targetId) ?? 0) + 1)
  }
  const blankCount =
    votedCount - [...counts.values()].reduce((sum, count) => sum + count, 0)
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1])

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-surface-raised p-5 ring-1 ring-line">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-mono text-sm tracking-wide text-accent uppercase">
          Biểu quyết lượt {state.voteAttempt}/2
        </p>
        <p className="font-mono text-sm tabular-nums text-ink">
          {votedCount}/{alivePlayers.length} phiếu
        </p>
      </div>
      {state.waitingDeadlineAt ? (
        <VoteAlertClock
          attempt={state.voteAttempt}
          deadlineAt={state.waitingDeadlineAt}
        />
      ) : null}
      {ranked.length > 0 || blankCount > 0 ? (
        <ul className="flex flex-col list-none gap-1.5">
          {ranked.map(([playerId, count]) => (
            <li
              className="flex items-center justify-between gap-3 text-base/7 text-ink sm:text-sm/6"
              key={playerId}
            >
              <span>{names.get(playerId) ?? 'Người chơi'}</span>
              <span className="font-mono tabular-nums">{count}</span>
            </li>
          ))}
          {blankCount > 0 ? (
            <li className="flex items-center justify-between gap-3 text-base/7 text-ink-muted sm:text-sm/6">
              <span>Phiếu trắng</span>
              <span className="font-mono tabular-nums">{blankCount}</span>
            </li>
          ) : null}
        </ul>
      ) : (
        <p className="text-sm/6 text-ink-muted">
          Chưa có phiếu nào — đôn cả bàn mở thiết bị.
        </p>
      )}
      {votedCount < alivePlayers.length ? (
        <p className="text-sm/6 text-ink-muted">
          Còn{' '}
          <span className="text-ink">
            {alivePlayers.length - votedCount} người
          </span>{' '}
          chưa bỏ phiếu. Đủ phiếu hệ thống tự tính, bạn chỉ cần công bố.
        </p>
      ) : (
        <p className="text-sm/6 text-ink">
          Đủ phiếu — hệ thống đang tính, chờ màn xác nhận công bố.
        </p>
      )}
    </div>
  )
}

// M8: alert-only — đếm thụ động, hết giờ chỉ sáng đèn nhắc quản trò, không
// gọi tick, không phát lệnh nào (khác WaitingCountdown của SELF).
function VoteAlertClock({
  attempt,
  deadlineAt,
}: {
  attempt: 1 | 2
  deadlineAt: string
}) {
  const [remainingMs, setRemainingMs] = useState(
    () => Date.parse(deadlineAt) - Date.now(),
  )
  useEffect(() => {
    const deadline = Date.parse(deadlineAt)
    const update = () => setRemainingMs(deadline - Date.now())
    update()
    const timer = window.setInterval(update, 1000)
    return () => window.clearInterval(timer)
  }, [deadlineAt])

  if (remainingMs <= 0) {
    return (
      <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm/6 text-danger">
        Đã quá giờ biểu quyết lượt {attempt}/2 — đôn cả bàn hoặc nhập kết quả
        đếm tay bên dưới.
      </p>
    )
  }
  const totalSeconds = Math.ceil(remainingMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = String(totalSeconds % 60).padStart(2, '0')
  return (
    <p className="text-center font-mono text-sm tabular-nums text-ink-subtle">
      Thời gian biểu quyết · {minutes}:{seconds}
    </p>
  )
}
