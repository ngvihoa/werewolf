import { healthRouter } from './router.health'
import { lobbyRouter } from './router.lobby'
import { baseRouter } from './base'

// os.router kiểm tra toàn bộ cây implementation khớp với appContract.
// Chỉ gom object thủ công sẽ không có bước enforcement đầy đủ này.
export const appRouter = baseRouter.router({
  health: healthRouter,
  lobby: lobbyRouter,
})
