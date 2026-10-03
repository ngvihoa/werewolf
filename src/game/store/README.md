# Game Store

Persistence boundary của game: nhận lệnh từ oRPC, authorize theo session,
thực thi qua orchestration, persist state + events nguyên tử và trả view đúng
quyền. Có hai implementation cho cùng một interface `GameStore` (`game-store.ts`):

- **`in-memory-game-store.ts`** — dùng cho unit test: snapshot detached,
  receipt idempotency trong map, đồng bộ contract (optimistic locking, error
  code) với PostgreSQL 1-1.
- **`postgres-game-store.ts`** (`postgres/`) — dùng ở runtime qua singleton
  `local-game-store.ts` (instance giữ trên `globalThis` cho Vite hot reload).
  Event-sourced: mọi thay đổi đi qua transaction (lock game row → receipt →
  rule engine → bot loop ở SELF → persist state/queue/players → append events
  → bump version).

## Bề mặt command

- Lobby: `createGame`, `joinGame`, `setReady`, `assignRoles`, `startGame`,
  `rematch`, và `leaveGame` (R23 — chỉ SELF).
- Trong ván: `execute` với `GameCommand` (submit/confirm/skip, vote, hunter
  shot, `END_GAME`) và `tick` (R22 — lazy tick chống AFK, idempotent).

## Authorization

`command-authorization.ts` phân command theo actor: PLAYER (submit action,
vote, consent), MODERATOR (confirm/skip/resolve, END_GAME), dual-actor
(END_GAME — Quản trò hoặc chủ phòng SELF). Các lệnh điều khiển sảnh
(assign/start/rematch) kiểm "game controller": MODERATED là session Moderator,
SELF là chủ phòng (`game_players.is_host`).

## Chế độ không quản trò (SELF, R20–R24)

- Người tạo phòng là một player thường kiêm host; không có session Moderator.
- Sau mỗi lệnh người chơi được chấp nhận ở SELF, store chạy bot loop
  (`src/game/bot/`) tới fixpoint trong cùng transaction; event bot ghi actor
  `SYSTEM`.
- `leaveGame`: ghi `left_at` + event `PLAYER_LEFT_GAME`, không mark dead, bot
  tự skip/abstain phần còn thiếu của người rời; session cũ giữ nguyên để xem
  tiếp. Người rời bị loại khỏi phân vai/ready-check; rematch xóa `left_at`.

## Giới hạn đã biết

- Restart server xóa mọi game in-memory (implementation test-only).
- Token session ở in-memory giữ raw; phía postgres chỉ lưu hash.
- `getGame`/`getGameByRoomCode` trả raw snapshot, không gọi trực tiếp từ API
  người chơi — client-facing procedures phải dùng `getGameView`.
