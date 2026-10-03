# Bot Moderator

Quản trò bot cho chế độ không quản trò (game mode `SELF`, quyết định R20–R24
ở `docs/rules/08-mvp-rule-decisions.md`, kế hoạch ở `docs/bot-moderator-mode.md`).

## Nguyên tắc

- **Bot là hàm thuần.** `nextBotCommands(state)` đọc state và trả danh sách
  command; `runBotLoop(state)` lặp tới fixpoint bằng `executeCommand` của
  orchestration. Không import Supabase, database hay UI.
- **Bot chỉ phát command nhóm "moderator confirmation"** đã có sẵn:
  `CONFIRM_STEP`, `CONFIRM_NIGHT_RESOLUTION`, `CONFIRM_HUNTER_SHOT`,
  `CONFIRM_VOTE_RESULT`. Rule engine không đổi; event do bot tạo ghi actor
  `SYSTEM` trong event log để audit.
- **`REJECT_STEP` không tồn tại trong SELF**: submit sai target đã bị rule
  engine từ chối ngay lúc submit với typed domain error.
- **Chạy trong cùng transaction với lệnh người chơi.** Store (in-memory hoặc
  postgres) gọi `runBotLoop` sau khi lệnh người chơi được chấp nhận, rồi persist
  state + events một lần; version chỉ tăng một lần.
- **Fixpoint cap** `MAX_BOT_ITERATIONS` chống vòng lặp vô hạn.

## Phạm vi hiện tại (T2) và phần đang chờ

- T2: auto-confirm vòng đêm + hunter shot + confirm vote resolution.
- T3 (`SUBMIT_VOTE` + tally): bot sẽ tự tally phiếu khi đủ người sống bỏ phiếu.
- T4 (`SUBMIT_VOTE_CONSENT`): bot phát `START_VOTE` khi đủ majority consent.
- T5 (timer): bot phát `SKIP_STEP` reason `TIMEOUT` khi hết hạn.

Bot cố tình **không** phát `START_VOTE` hay can thiệp thảo luận — nhịp ngày
thuộc về người chơi (R21).
