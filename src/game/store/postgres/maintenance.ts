import type { PostgresStoreDeps } from './shared'

import { sql } from 'drizzle-orm'

export type PurgeThresholds = {
  /** Ván đã kết thúc được giữ lại bao lâu trước khi xóa. */
  gameOverDays: number
  /** Sảnh không có hoạt động bao lâu thì coi là bỏ hoang. */
  lobbyIdleHours: number
  /** Ván đang chơi đứng im bao lâu thì coi là bỏ bê. */
  inProgressDays: number
}

export const DEFAULT_PURGE_THRESHOLDS: PurgeThresholds = {
  gameOverDays: 3,
  lobbyIdleHours: 24,
  inProgressDays: 7,
}

// Dữ liệu ván chơi chỉ có giá trị trong và ngay sau ván; job này xóa các ván
// đã quá vòng đời. Toàn bộ bảng con cascade theo games nên một DELETE là đủ.
export async function purgeStaleGames(
  deps: PostgresStoreDeps,
  thresholds: Partial<PurgeThresholds> = {},
): Promise<number> {
  const resolved = { ...DEFAULT_PURGE_THRESHOLDS, ...thresholds }
  const outcome = await deps.database.execute(sql`
    SELECT purge_stale_games(
      ${resolved.gameOverDays}::int,
      ${resolved.lobbyIdleHours}::int,
      ${resolved.inProgressDays}::int
    ) AS purged
  `)
  const firstRow: { purged?: number } | undefined = Array.isArray(outcome)
    ? outcome[0]
    : ((outcome as { rows?: { purged?: number }[] }).rows?.[0] ?? undefined)
  return Number(firstRow?.purged ?? 0)
}

// Hook chạy kèm createGame: chỉ chạy tối đa một lần mỗi giờ để việc tạo phòng
// không phải trả chi phí dọn dẹp lặp lại. Lỗi dọn dẹp không được làm hỏng lượt
// tạo phòng nên nuốt lỗi và chỉ ghi cảnh báo.
const PURGE_MIN_INTERVAL_MS = 60 * 60 * 1000
let lastPurgeScheduledAt = 0

export function scheduleStaleGamePurge(
  deps: PostgresStoreDeps,
  thresholds: Partial<PurgeThresholds> = {},
): void {
  const now = Date.now()
  if (now - lastPurgeScheduledAt < PURGE_MIN_INTERVAL_MS) return
  lastPurgeScheduledAt = now
  void purgeStaleGames(deps, thresholds).catch((error: unknown) => {
    console.warn(
      '[maintenance] Không dọn được các ván chơi hết vòng đời:',
      error,
    )
  })
}
