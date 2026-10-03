# Chế độ không quản trò (quản trò bot)

Kế hoạch thực hiện chế độ chơi không cần người làm quản trò: hệ thống tự động
toàn bộ phần xác nhận/điều phối, người chơi tự chơi với nhau trên thiết bị của
họ. Vẫn là mobile-first chơi tại bàn — tranh luận nói miệng, thiết bị giữ vai
bí mật, nhận lượt và bỏ phiếu.

Các quyết định luật của chế độ này nằm ở `docs/rules/08-mvp-rule-decisions.md`
(R20–R24). **Chốt R20–R24 trước khi bắt đầu T1** — mọi task dưới đây giả định
phương án khuyến nghị; nếu chốt khác thì sửa doc trước, code sau.

## 1. Phạm vi

Làm:

- Game mode mới `SELF` song song với mode hiện tại (đổi tên tường minh thành
  `MODERATED`, làm default, giữ nguyên 100% hành vi).
- Bot là system actor phía server, phát đúng các command nhóm "moderator
  confirmation" đã có qua cùng orchestrator.
- Bỏ phiếu trên thiết bị (chỉ mode SELF).
- Consent kết thúc thảo luận + timer chống kẹt (AFK/disconnect).

Không làm (ngoài scope):

- Không LLM/AI narrator trong mechanics. Muốn thoại trang trí ("Đêm thứ hai
  buông xuống…") thì thêm sau như lớp presentation của projection, không chạm
  rule engine.
- Không chơi online từ xa. Vẫn chơi tại bàn.
- Không đổi UI/flow của mode MODERATED.
- Chưa đưa timer thành setting UI — dùng hằng số MVP, data model chừa đường
  nâng cấp thành settings như các rule khác.

## 2. Nguyên tắc kiến trúc

1. **Bot là hàm thuần.** Module mới `src/game/bot/` đặt cạnh orchestration:
   `nextBotCommands(state): GameCommand[]`. Không import Supabase, database,
   UI hay global state — cùng ràng buộc với orchestration.
2. **Bot chỉ phát command có sẵn.** Các command thuộc nhóm moderator:
   `CONFIRM_STEP`, `SKIP_STEP` (reason `TIMEOUT`/`ROLE_OWNER_DEAD`/…),
   `CONFIRM_NIGHT_RESOLUTION`, `START_VOTE` (khi đủ điều kiện R21),
   `CONFIRM_VOTE_RESULT`, `SKIP_REVOTE` (theo R14), `CONFIRM_HUNTER_SHOT`.
   `REJECT_STEP` không dùng trong SELF: submit sai target đã bị rule engine từ
   chối ngay lúc submit với typed domain error, player tự làm lại.
3. **Chạy trong cùng transaction.** Sau mỗi game command được chấp nhận ở mode
   SELF, store chạy bot-loop tới fixpoint (cap số vòng, ví dụ 50, chống vòng
   vô hạn) rồi persist state + events một lần — giữ ràng buộc atomic hiện có
   của store. Bot command được ghi event với actor `SYSTEM` để audit.
4. **Timer là lazy evaluation.** Deadline lưu trong state (`stepDeadlineAt`,
   `voteDeadlineAt`, `discussionMinEndsAt`). Không cron: client thấy countdown
   về 0 thì gọi `game.tick` (idempotent, ai gọi trước cũng được); mọi command
   và `getGameView` cũng kiểm tra deadline hết hạn trước khi xử lý. Tránh phụ
   thuộc scheduler phía server.
5. **Realtime có sẵn.** Bot làm version tăng → invalidation `{gameId, version}`
   hiện có khiến mọi client refetch. Không cần kênh mới, không đổi Phase 6.
6. **Không có đường leak mới.** Bot chạy server-side, mọi client vẫn chỉ nhận
   projected view. Negative tests hiện có phải giữ nguyên xanh.

## 3. Tasks

Phụ thuộc: T1 → T2 → T3 → T4; T5 cần T2+T3; T6 cần T5; T7–T9 cuối. Mỗi task
1–2 commit nhỏ, conventional commits, message tiếng Việt.

### Milestone 1 — Vertical slice: một ván SELF chơi được từ lobby tới game over

#### T1. Domain + tạo game mode SELF — `feat(game)`

- `src/game/schema.ts`: thêm `gameModeSchema = z.enum(['MODERATED', 'SELF'])`,
  default `MODERATED`; đưa vào game settings/state.
- Store `createGame`: mở rộng contract (backward-compatible) cho phép tạo game
  không có moderator session — creator đăng ký như một player thường và nhận
  player session token.
- `assignRoles`, `setReady`, `startGame`: authorization mở cho creator-player
  khi mode SELF. Start game do creator bấm (tương đương moderator), không
  auto-start.
- oRPC contract + router: `createGame` nhận `mode`; **audit toàn bộ guard
  "chỉ moderator"** trong `src/orpc/`, `src/game/store/`, `src/game/presentation/`
  — mỗi chỗ branch theo mode, không xóa guard của MODERATED.
- UI: màn tạo game thêm chọn chế độ; lobby SELF cho creator quyền cấu hình
  composition (R24).
- Chấp nhận: tạo phòng SELF, 6 người join, creator cấu hình role set, ready
  check, start vào NIGHT. Chạy lại một ván MODERATED không đổi hành vi (test
  hồi quy).

#### T2. Bot actor auto-confirm vòng đêm — `feat(game)`

- Module `src/game/bot/`: `nextBotCommands(state)` + unit test table-driven
  theo style ROADMAP Phase 1.
- Hook bot-loop trong cả hai store implementation (in-memory + postgres) sau
  mỗi command được chấp nhận ở mode SELF, cùng transaction (nguyên tắc 3).
- Bot xử lý: `CONFIRM_STEP` ngay khi action hợp lệ được submit; `SKIP_STEP`
  khi step không thể thực thi (owner chết, ability hết — nếu orchestrator đã
  tự đánh dấu SKIPPED thì bot chỉ đi tiếp); `CONFIRM_NIGHT_RESOLUTION` khi
  queue xong; `CONFIRM_HUNTER_SHOT`.
- Chấp nhận: integration test một đêm 6 người chạy từ NIGHT tới DAY không có
  thao tác nào ngoài submit action của player; event log ghi actor `SYSTEM`.

#### T3. Bỏ phiếu trên thiết bị — `feat(game)` (phụ thuộc T1)

- Command mới `SUBMIT_VOTE { targetId | null }`: auth theo player session,
  chỉ người sống, một phiếu mỗi attempt.
- State: map phiếu theo attempt; bot tally khi đủ phiếu của người sống (hoặc
  hết hạn R22) → resolve theo R14: attempt 1 hòa → revote; attempt 2 hòa →
  không ai bị loại (tận dụng `voteAttempt` sẵn có).
- Projection: trong VOTE chỉ hiện số phiếu đã bỏ (x/y), không lộ nội dung
  phiếu; kết quả public sau resolve (tránh bandwagon khi ngồi cạnh nhau).
- UI: màn bỏ phiếu cho người sống; người chết thấy "đang bỏ phiếu"; màn kết
  quả. Mode MODERATED giữ nguyên `SUBMIT_VOTE_RESULT`.
- Chấp nhận: hòa phiếu chạy đúng R14 hai attempt; negative test: người chết,
  người rời game, session lạ không bỏ phiếu được.

#### T4. Kết thúc thảo luận bằng consent — `feat(game/ui)` (phụ thuộc T3)

- Command `SUBMIT_VOTE_CONSENT` (người sống); state `voteConsentIds`, reset
  mỗi ngày.
- Bot phát `START_VOTE` khi đủ majority người sống consent và đã qua timer
  tối thiểu (R21, hằng số MVP).
- UI: banner prompt giai đoạn DAY + nút "Sẵn sàng bỏ phiếu" + đếm consent.
- Chấp nhận: majority đủ → VOTE mở tự động; timer tối thiểu chặn spam consent
  ngay đầu ngày.

### Milestone 2 — Chống kẹt (AFK/disconnect)

#### T5. Timer lazy + tick — `feat(game)` (phụ thuộc T2, T3)

- Deadline vào state: `stepDeadlineAt`, `voteDeadlineAt` (+ `discussionMinEndsAt`
  của T4). Timer chỉ chạy khi có step/vote đang chờ.
- Endpoint `game.tick`: kiểm hết hạn → phát `SKIP_STEP` reason `TIMEOUT`, tự
  abstain phiếu thiếu, hunter không bắn đúng hạn thì mất phát bắn. Idempotent,
  bump version để mọi client đồng bộ qua invalidation sẵn có.
- Client: countdown hiển thị cho mọi người (step hiện tại/vote); gọi tick khi
  về 0; fallback polling 3–5s hiện có bắt các trường hợp tick bị lỡ.
- Chấp nhận: unit test deadline logic (biên: vừa hết giờ khi có command khác
  tới); e2e nhỏ: player AFK đêm đầu → step auto-skip, đêm vẫn đi tiếp.

#### T6. Rời game giữa ván ở SELF — `feat(game)` (phụ thuộc T5)

- `LEFT_GAME` ở SELF theo R23: không mark dead; action/vote của người rời tự
  skip/abstain; trạng thái hiển thị "đã rời" trong PlayerGrid; quay lại session
  cũ vẫn xem được view.
- Host có nút "Kết thúc game" (manual game-end, bắt buộc ghi reason) như lối
  thoát cuối.
- Chấp nhận: player rời giữa đêm → ván tiếp tục không kẹt; reconnect khôi phục
  đúng view.

### Milestone 3 — Hoàn thiện

#### T7. Game over + rematch ở SELF — `feat(game/ui)`

- Guard rematch mở cho creator-player; game-over view mode SELF (không có khối
  điều khiển moderator).
- Chấp nhận: rematch tạo ván mới cùng mode, giữ lobby.

#### T8. Đồng bộ tài liệu — `docs`

- Chốt R20–R24 trong `08-mvp-rule-decisions.md`, đồng bộ vào `02`, `03`, `04`,
  `05`, `07` theo đúng quy trình "Cách chốt" của doc 08.
- `docs/revamp-ui-ux.md` bổ sung pattern UI mới (ballot, consent banner,
  countdown) — đó là nguồn sự thật của UI.
- README của module mới/sửa (`src/game/bot/`, store, oRPC) cập nhật theo vị trí.

#### T9. Kiểm thử hồi quy + e2e — `test`

- Playwright multi-context: 5–6 player SELF full game (join → vai → đêm →
  ngày → vote → game over), gồm 1 kịch bản AFK.
- Suite e2e MODERATED chạy lại xanh (không hồi quy).
- `pnpm check` + `pnpm test` + `pnpm test:e2e` xanh; captures đánh dấu vào
  `captures/` theo quy ước.

## 4. Rủi ro & điểm cần chú ý

- **Guard moderator rải nhiều lớp.** Router, store, presentation đều có thể
  assume moderator tồn tại. T1 phải bắt đầu bằng audit; sửa ít, branch đúng
  mode, không đụng guard của MODERATED.
- **Bot-loop vô hạn.** Một command của bot có thể kích hoạt điều kiện cho
  command tiếp theo (đêm xong → resolution → day). Cap fixpoint + unit test
  các chuỗi transition dài nhất của flow.
- **Restart dev server sau mỗi lần đổi schema oRPC** (bẫy đã ghi trong
  AGENTS.md) — mọi task đổi contract đều nhớ, tránh "Output validation failed".
- **e2e flake orchestration** đỏ một test lẻ: restart server rồi chạy riêng để
  xác nhận flake, đừng nghi code mới (AGENTS.md).
- **Không đổi rule engine hiện có.** Mọi thay đổi đi qua command surface; nếu
  thấy cần đổi rule engine thì dừng lại chốt luật trước.
