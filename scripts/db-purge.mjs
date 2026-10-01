// Dọn các ván chơi hết vòng đời bằng hàm purge_stale_games (xem drizzle/0013).
// Dùng tay hoặc gắn vào cron. Cú pháp:
//   pnpm db:purge                                    # ngưỡng mặc định 3 ngày / 24 giờ / 7 ngày
//   pnpm db:purge 7 48 14                            # GAME_OVER / LOBBY idle / IN_PROGRESS
import postgres from 'postgres'
import 'dotenv/config'

const intArg = (index, fallback, label) => {
  const raw = process.argv[index]
  if (raw === undefined) return fallback
  const value = Number.parseInt(raw, 10)
  if (!Number.isInteger(value) || value < 0) {
    console.error(`${label} phải là số nguyên không âm, nhận được: "${raw}"`)
    process.exit(1)
  }
  return value
}

const gameOverDays = intArg(2, 3, 'Số ngày giữ ván GAME_OVER')
const lobbyIdleHours = intArg(3, 24, 'Số giờ giữ sảnh LOBBY')
const inProgressDays = intArg(4, 7, 'Số ngày giữ ván IN_PROGRESS')

if (!process.env.DATABASE_URL) {
  console.error('Thiếu DATABASE_URL — kiểm tra file .env')
  process.exit(1)
}

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 })

try {
  const [row] = await sql`
    SELECT purge_stale_games(
      ${gameOverDays}::int,
      ${lobbyIdleHours}::int,
      ${inProgressDays}::int
    ) AS purged
  `
  console.log(
    `Đã xóa ${row.purged} ván chơi hết vòng đời ` +
      `(GAME_OVER > ${gameOverDays} ngày, LOBBY > ${lobbyIdleHours} giờ, IN_PROGRESS > ${inProgressDays} ngày).`,
  )
} finally {
  await sql.end()
}
