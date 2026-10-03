# Bot Moderator

Quản trò bot cho chế độ không quản trò (game mode `SELF`, quyết định R20–R24
ở `docs/rules/08-mvp-rule-decisions.md`, kế hoạch ở `docs/bot-moderator-mode.md`).

## Nguyên tắc

- **Bot là hàm thuần.** `nextBotCommands(state, clock)` đọc state và trả danh sách
  command; `runBotLoop(state, clock)` lặp tới fixpoint bằng `executeCommand` của
  orchestration. Không import Supabase, database hay UI.
- **Bot chỉ phát command nhóm "moderator confirmation"** đã có sẵn:
  `CONFIRM_STEP`, `CONFIRM_NIGHT_RESOLUTION`, `CONFIRM_HUNTER_SHOT`,
  `CONFIRM_VOTE_RESULT`, `SKIP_STEP`, `SKIP_HUNTER_SHOT`,
  `SUBMIT_VOTE_RESULT` (từ tally), `START_VOTE`. Rule engine không đổi; event
  do bot tạo ghi actor `SYSTEM` trong event log để audit.
- **`REJECT_STEP` không tồn tại trong SELF**: submit sai target đã bị rule
  engine từ chối ngay lúc submit với typed domain error.
- **Chạy trong cùng transaction với lệnh người chơi.** Store (in-memory hoặc
  postgres) gọi `runBotLoop` sau khi lệnh người chơi được chấp nhận, rồi persist
  state + events một lần; version chỉ tăng một lần.
- **Fixpoint cap** `MAX_BOT_ITERATIONS` chống vòng lặp vô hạn.
- **Bot không biết đồng hồ hay DB.** `BotClock` do store inject: `now` để so mốc
  deadline, `leftPlayerIds` (R23) để skip step/phát bắn của người rời và abstain
  phiếu còn thiếu. Các helper `stampWaitingDeadline` / `stampDiscussionDeadline`
  do store gọi (store mới biết `now`) để gắn mốc cho ngữ cảnh chờ mới.

## Phạm vi hiện tại (T2–T6 hoàn tất)

- Auto-confirm vòng đêm + hunter shot + vote resolution.
- T3: tally phiếu khi đủ người sống bỏ phiếu (`SUBMIT_VOTE_RESULT`), hòa theo R14.
- T4: phát `START_VOTE` khi đủ majority consent + đã qua mốc thảo luận tối thiểu.
- T5: skip/abstain theo deadline — `SKIP_STEP` reason `TIMEOUT`,
  `SKIP_HUNTER_SHOT`, phiếu thiếu tính trắng.
- T6 (R23): người rời game — step/phát bắn của họ bị skip ngay với reason
  `PLAYER_LEFT`, phiếu thiếu của họ không chặn tally, majority consent không
  tính người rời.

Bot cố tình **không** can thiệp thảo luận ngoài các mốc trên — nhịp ngày thuộc
về người chơi (R21).
