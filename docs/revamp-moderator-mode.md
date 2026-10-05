# Revamp chế độ MODERATOR — Quản trò điều phối

> **Trạng thái: ĐÃ TRIỂN KHAI + ĐÃ HỢP NHẤT.** Quyết định M1–M13 đã hợp nhất
> thành **R25–R31** trong `docs/rules/08-mvp-rule-decisions.md` (kèm cập nhật
> `docs/rules/04`, `05`, `07`, `docs/ROADMAP.md` Phase 10). Bài viết dưới giữ
> nguyên dạng bản kế hoạch để tra ngữ cảnh thiết kế; mã M dưới đây tương ứng
> R25–R31 (map trong bảng §2).

## 1. Vấn đề và định hướng

Cơ chế MODERATOR hiện tại ngầm giả định người chơi giữ điện thoại mở suốt ván:
queue đêm **bắt buộc** chủ role submit trên thiết bị (`command-authorization.ts`
chỉ cho player session phát `SUBMIT_NIGHT_ACTION`), trong khi app không có bất kỳ
cơ chế đánh thức nào (wake lock, notification, rung — đã audit toàn `src/`).
Ở bàn vật lý điều này không đứng vững: màn hình khóa, tab background, và tệ hơn —
màn hình sáng lúc đêm là "tell" lộ ai đang hành động.

Định hướng mới — tách hẳn hai định danh sản phẩm trên cùng một engine:

- **SELF** (không đổi): app đóng vai quản trò cho người chơi onl.
- **MODERATED** (revamp): quản trò điều phối bàn vật lý, app là trợ lý. Đêm
  thuộc về quản trò (không cần thiết bị người chơi chút nào); ban ngày mới dùng
  thiết bị cho đúng việc thiết bị hơn người — tally phiếu.

## 2. Tóm tắt quyết định

| Mã  | Quyết định                                                                                                    |
| --- | ------------------------------------------------------------------------------------------------------------- |
| M1  | Định danh 2 mode: SELF giữ nguyên; MODERATED = quản trò điều phối + app trợ lý                                |
| M2  | Mọi hành động đêm do quản trò nhập thay (proxy); chặn player submit action đêm ở MODERATED                    |
| M3  | Bot auto-confirm step đêm ở MODERATED; gate NGƯỜI ở 3 mốc công bố (bình minh / kết quả vote / hunter shot)    |
| M4  | **Parity chiếu dữ liệu**: action quản trò nhập thay vẫn chiếu về đúng chủ để xem lại ban ngày                 |
| M5  | UI quản trò chỉ dùng **picker** (chọn), không free text; free text chỉ dành cho lý do audit                   |
| M6  | Vote ban ngày qua thiết bị: counts live theo ứng viên, bot tally, quản trò confirm; fallback nhập kết quả tay |
| M7  | `START_VOTE` là nút của quản trò; bỏ consent R21 ở MODERATED                                                  |
| M8  | Không timeout đêm; timeout vote = **alert-only** trên màn quản trò                                            |
| M9  | `UNDO_STEP`: hoàn tác action cuối trong đêm, lý do bắt buộc, cửa sổ = trước gate bình minh                    |
| M10 | `MODERATOR_OVERRIDE`: quản trò đánh dấu người chết tay (lý do bắt buộc)                                       |
| M11 | **Route riêng** cho player MODERATED (`/table`); `/game` giữ màn quản trò + SELF player; redirect hai chiều   |
| M12 | Bot chạy theo **allowlist command theo mode** (thay nhánh cứng `mode === 'SELF'`)                             |
| M13 | Màn đêm của player là màn tĩnh — không lộ tiến trình queue                                                    |

Ba điểm clear cuối cùng từ thảo luận map sang: M4 (trả dữ liệu về player), M11
(route mới hoàn toàn), M5 (nhập = chọn option, không phải gõ text).

## 3. Nguyên tắc cứng

1. **Luật chơi không đổi.** Win condition, R14 (voteTie), thứ tự resolution,
   hàng đợi đêm, event sourcing — giữ nguyên. Chỉ đổi _ai phát lệnh_ và _ai thấy
   gì_. Nếu hợp nhất sau này, M* trở thành R25+; không sửa R1–R24.
2. **Parity chiếu dữ liệu (M4).** Thông tin riêng mà người chơi lẽ ra biết nếu
   tự nhập action thì phải hiện trên device của họ bất kể ai nhập — kèm nhãn
   "do quản trò nhập" trong lịch sử.
3. **Gate công bố.** Mọi thay đổi hiển thị cho người chơi chỉ xảy ra sau confirm
   của quản trò (chết chóc apply ở `CONFIRM_NIGHT_RESOLUTION`, kết quả vote ở
   `CONFIRM_VOTE_RESULT`). Player page không thể lộ thứ nó không được chiếu.
4. **Picker-only (M5).** Dữ liệu game (target, lựa chọn, kết quả) chọn bằng
   picker/single-select/toggle có validate của rule engine phản hồi ngay. Ô text
   tự do chỉ tồn tại cho lý do audit (skip/undo/override).
5. **SELF không đổi.** Mọi thay đổi phải vô hình với SELF: UI, bot behavior,
   luật R20–R24.

## 4. Đêm: quản trò nhập thay

### 4.1. Flow từng step

```text
Bot kích hoạt step (queue như cũ, tự động skip ROLE_OWNER_DEAD)
        ↓
Màn quản trò: "Gọi: <tên> (<vai>)" + picker target hợp lệ
        ↓
Quản trò chọn + submit (SUBMIT_NIGHT_ACTION, actorId = chủ role,
                      enteredBy = MODERATOR)
        ↓
Rule engine validate ngay (sai target → lỗi typed hiện tại, chọn lại)
        ↓
Bot phát CONFIRM_STEP trong cùng transaction (M3) → queue tự tiến
        ↓
Lặp tới step cuối → state vào NIGHT_RESOLUTION, CHỜ GATE NGƯỜI
```

Không còn `REJECT_STEP` ở MODERATED (cửa sổ confirm dài 0 giây dưới bot); thay
bằng `UNDO_STEP` (M9, §4.3). `SKIP_STEP` của quản trò giữ nguyên.

### 4.2. Truyền đạt thông tin đêm (màn quản trò)

- **Bối cảnh Witch**: tới lượt Witch hiện rõ "Sói đã chọn: `<tên>`" (quản trò
  đọc thành tiếng cho Witch quyết định cứu/độc).
- **Card kết quả Seer**: sau khi confirm step Seer, hiện nổi bật "Báo `<tên
Seer>`: `<target>` là SÓI/NGƯỜI" — card quay màn hình cho người xem (nguồn:
  event `SEER_RESULT_RECORDED` đã có).
- Tên người được gọi kèm vai (god view có sẵn) để quản trò gọi bằng tên thay vì
  đọc tên vai thành tiếng nếu bàn muốn vậy.

### 4.3. Hoàn tác — `UNDO_STEP` (M9)

Quản trò giờ là người nhập duy nhất, mis-tap không còn cửa sổ confirm để bắt →
undo lên MVP của revamp này.

- Phạm vi: step `COMPLETED` **cuối cùng của đêm hiện tại**; một lần một step.
- Cửa sổ: bất cứ lúc nào trước khi `CONFIRM_NIGHT_RESOLUTION` (mọi thứ vẫn
  private — chết chóc chưa apply).
- Logic engine: pop action cuối khỏi `confirmedNightActions` → hoàn trả tài
  nguyên đã consume (potion Witch, `enhanced` Alpha, `killAvailable` White Wolf,
  unlink Cupid) → step về `ACTIVE` → nếu state đã ở `NIGHT_RESOLUTION` thì xóa
  `pendingNightResolution`, phase về `NIGHT`.
- Lý do bắt buộc (audit). Event `STEP_UNDONE { step, action, reason }`.
- UI: dialog xác nhận (chống bấm nhầm) + hiển thị lại action sắp hoàn tác.

### 4.4. Audit

`NIGHT_ACTION_SUBMITTED` / `NIGHT_ACTION_CONFIRMED` thêm
`enteredBy: 'PLAYER' | 'MODERATOR'` (store gắn theo session kind khi execute —
command surface không đổi). Tương tự cho `HUNTER_SHOT_SUBMITTED`.

## 5. Parity chiếu dữ liệu về người chơi (M4)

Dữ liệu riêng theo vai, hiện trên device của chủ sở hữu **ngay khi step được
confirm** (tư riêng — không lý do chờ bình minh), dùng lại ban ngày thoải mái:

| Vai    | Dữ liệu riêng trên device                                         |
| ------ | ----------------------------------------------------------------- |
| Seer   | Danh sách kết quả soi tích lũy: đêm nào, target, kết quả          |
| Witch  | Trạng thái potion + nhật ký mỗi đêm: sói chọn ai, mình cứu/độc ai |
| Hunter | Mục tiêu mark hiện tại; phát bắn còn/mất                          |
| Lovers | Ai là cặp đôi với mình (cả hai đều thấy)                          |
| Cupid  | Cặp đôi đã nối                                                    |
| Tất cả | Role card + mô tả vai + trạng thái sống/chết người khác (public)  |

- Mỗi mục lịch sử ghi nhãn nguồn: "Do quản trò nhập" khi `enteredBy` là
  MODERATOR.
- Projection triển khai thành một field `privateActionHistory` per viewer
  (nới rộng projection hiện có — xem §10).
- **Màn đêm = màn tĩnh (M13)**: chỉ role card + lưới người chơi public. Không
  "đang chờ ai", không tiến trình queue, không countdown — không tell ánh sáng
  lẫn nhịp đêm.

## 6. Vote ban ngày (M6, M7)

```text
Thảo luận vật lý (không đổi)
        ↓
Quản trò bấm [Bắt đầu bỏ phiếu] (START_VOTE — M7, không consent R21)
        ↓
Player mở thiết bị: picker người sống + phiếu trắng (tái dùng SUBMIT_VOTE)
        ↓
Live: counts theo ứng viên cho mọi người (KHÔNG lộ ai vote ai)
        ↓
Đủ phiếu → bot tally (SUBMIT_VOTE_RESULT; hòa xử theo R14 voteTie)
        ↓
Màn quản trò preview kết quả → đọc công bố → CONFIRM_VOTE_RESULT (gate người)
        ↓
Hunter bị loại → HUNTER_SHOT (ban ngày, mắt mở): hunter tự bấm trên thiết bị
hoặc quản trò proxy; CONFIRM_HUNTER_SHOT là gate người
```

- **Counts live**: số phiếu mỗi ứng viên + x/y đã bỏ. Ai vote cho ai KHÔNG hiện
  trong lúc vote; có lộ breakdown ở kết quả không — câu hỏi mở (§12).
- Người thiếu phiếu: quản trò thấy x/y trên god view, đôn ngoài đời. Không
  auto-abstain ở MODERATED.
- **Fallback**: bàn không muốn vote qua máy → quản trò nhập kết quả đếm tay
  (`SUBMIT_VOTE_RESULT` trực tiếp với picker người/hòa — đường này đã tồn tại,
  chỉ cần UI). Vote qua thiết bị là mặc định, nhập tay là lối thoát.
- Revote R14 hoạt động nguyên vẹn (tally tự động xử hòa theo setting phòng).

## 7. Timeout (M8)

- **Đêm: không timeout.** Nhịp đêm là nhịp quản trò; stall không tồn tại vì
  người nhập luôn có mặt.
- **Vote: alert-only.** Tái dùng hạ tầng mốc `waitingDeadlineAt` (R22) nhưng hết
  hạn KHÔNG kích hoạt lệnh bot nào — màn quản trò sáng đèn "quá `<X>`s — đôn,
  skip, hay nhập tay?" và người quyết. AUTO_SKIP không đưa vào MODERATED ở
  revamp này.

## 8. Override của quản trò (M10)

Gap thật: docs 01 giao quản trò "sửa trạng thái khi ngoại lệ" nhưng command set
không có lệnh nào. Bàn vật lý chắc chắn gặp (người bỏ về giữa ván).

- MVP **chỉ** `MODERATOR_OVERRIDE_MARK_DEAD { playerId, reason }`: đánh dấu
  chết tay, lý do bắt buộc, event `PLAYER_OVERRIDE_APPLIED`.
- Hiệu ứng kéo theo tự nhiên: queue tự skip role của người chết
  (`ROLE_OWNER_DEAD` có sẵn), win condition / majority tự tính lại từ alive set.
- Không làm `MARK_LEFT` ở revamp này (người bỏ về coi như chết — thông lệ bàn
  vật lý, tránh đụng machinery R23 của SELF).

## 9. Bot theo mode — allowlist (M12)

Thay nhánh `if (game.mode === 'SELF')` ở `execute-command.ts` bằng chạy bot loop
cho **cả hai mode** với allowlist:

| Command bot                                | SELF (giữ nguyên) | MODERATED (mới)                                 |
| ------------------------------------------ | ----------------- | ----------------------------------------------- |
| `CONFIRM_STEP`                             | bot               | **bot** (sau khi quản trò proxy submit)         |
| `SKIP_STEP` (TIMEOUT / PLAYER_LEFT)        | bot               | người — không timeout đêm, rời ván qua override |
| `CONFIRM_NIGHT_RESOLUTION`                 | bot               | **NGƯỜI** — gate bình minh                      |
| `CONFIRM_HUNTER_SHOT` / `SKIP_HUNTER_SHOT` | bot               | **NGƯỜI** — gate công bố                        |
| `START_VOTE` (consent R21)                 | bot               | **NGƯỜI** — nút quản trò (M7)                   |
| `SUBMIT_VOTE_RESULT` (đủ phiếu)            | bot               | **bot** (tally — M6)                            |
| `SUBMIT_VOTE_RESULT` (timeout)             | bot               | NGƯỜI (nhập tay fallback)                       |
| `CONFIRM_VOTE_RESULT`                      | bot               | **NGƯỜI** — gate công bố                        |

- `nextBotCommands` nhận thêm mode (hoặc allowlist từ store) — ưu tiên giữ một
  entry point, các nhánh consent/timeout tách theo mode.
- Stamping mốc: SELF stamp đủ mọi ngữ cảnh như nay; MODERATED **chỉ** stamp
  ngữ cảnh VOTE (để alert §7).

## 10. Routes và UI (M11)

### 10.1. Route mới cho player MODERATED

- Thư mục mới `src/routes/table/route.tsx` → URL `/table`, **session-driven**
  như `/game` (không param — định danh ván bằng session token, đúng pattern
  hiện có). Tên URL là câu hỏi mở (§12), `/table` = "chơi tại bàn".
- Guards theo đúng thứ tự bẫy đã biết (hydration trước, session sau):
  1. `!hydrated` → loading; `!sessionToken` → Navigate `/`.
  2. `viewer === 'MODERATOR'` → Navigate `/game`.
  3. `gameMode !== 'MODERATED'` → Navigate `/game`.
  4. Chưa vào ván → Navigate `/lobby`.
- `/game` thêm guard ngược: viewer là PLAYER và mode MODERATED → Navigate
  `/table`. Join flow không cần biết mode — redirect lo.

### 10.2. Trang `/table` (player MODERATED)

Tái dùng primitives (GameShell, RoomHeader, PlayerGrid, PlayerToken, SecretRow)
nhưng KHÔNG tái dùng component màn SELF (countdown, consent, waiting screen —
branch theo mode sẽ rối). Các màn:

| Ngữ cảnh      | Nội dung                                              |
| ------------- | ----------------------------------------------------- |
| Đêm           | Tĩnh: role card + lưới public (M13)                   |
| Ngày          | Role card + private history (§5) + lưới public        |
| Vote          | Overlay picker người sống + phiếu trắng + counts live |
| Chết / đã rời | Trạng thái xem, không hành động                       |
| GAME_OVER     | Mở lộ vai cả làng (như hiện tại)                      |

Không có nút "Rời ván" giữa chừng kiểu SELF — người bỏ về là chuyện quản trò
xử lý bằng override (§8); player giữ nút "Rời phòng" xóa phiên local như cũ
ở MODERATED.

### 10.3. Màn `/game` phía quản trò (tiến hóa ModeratorGamePanel)

Bổ sung: khối nhập action theo step active (§4.1 — picker + validate), bối cảnh
Witch + card Seer (§4.2), nút [Hoàn tác] (§4.3), [Bắt đầu bỏ phiếu] + vote
monitor (x/y, counts, đèn alert §7) + nhập kết quả tay (§6), override (§8).
Giữ nguyên: queue view, skip, gate 3 mốc công bố, history sheet.

## 11. Thay đổi engine/store

| Nơi                                  | Thay đổi                                                                                                                                                                           |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `orchestration/commands.ts`          | +`UNDO_STEP { reason }`, +`MODERATOR_OVERRIDE_MARK_DEAD { playerId, reason }`                                                                                                      |
| `orchestration/game-orchestrator.ts` | Handler `undoStep` (hoàn trả tài nguyên, revert queue/phase), handler `overrideMarkDead`                                                                                           |
| `store/command-authorization.ts`     | Nhận thêm mode: MODERATED → moderator được proxy `SUBMIT_NIGHT_ACTION`/`SUBMIT_HUNTER_SHOT`; player bị chặn night action, vẫn được `SUBMIT_VOTE` + `SUBMIT_HUNTER_SHOT` (ban ngày) |
| `orchestration/events.ts`            | `NIGHT_ACTION_SUBMITTED`/`CONFIRMED`, `HUNTER_SHOT_SUBMITTED` +`enteredBy`; +`STEP_UNDONE`; +`PLAYER_OVERRIDE_APPLIED`                                                             |
| `bot/bot-moderator.ts`               | `nextBotCommands` theo mode/allowlist (§9); stamping chọn lọc                                                                                                                      |
| `store/postgres/execute-command.ts`  | Bot loop cho cả hai mode; gắn `enteredBy` theo session kind                                                                                                                        |
| `projections/`                       | +`privateActionHistory` per viewer (§5); +vote candidate counts (MODERATED, chỉ counts); đả enteredBy vào history                                                                  |
| `schema.ts` (contracts)              | Field mới dạng `.optional()` — nhớ restart dev server sau đổi schema (bẫy đã biết)                                                                                                 |

## 12. Câu hỏi mở (chốt trước khi code)

1. **URL route mới**: đề xuất `/table`; phương án khác?
2. **Breakdown phiếu ở kết quả MODERATED**: lộ ai vote ai sau khi confirm
   (vote ngoài đời vốn công khai) hay chỉ giữ counts? Đề xuất: lộ, làm setting.
3. **Override scope**: xác nhận MVP chỉ `MARK_DEAD`, bỏ `MARK_LEFT`.
4. **Undo UX**: xác nhận dialog xác nhận + lý do bắt buộc (đề xuất có).

## 13. Non-goals

- Notification / wake lock / PWA push.
- Bất kỳ thay đổi nào của SELF (UI, bot, luật).
- Override trạng thái tùy ý (chỉ MARK_DEAD tối giản).
- Nâng các hằng số timeout / min discussion thành setting UI.
- Kịch bản dẫn chuyện (narration script) cho quản trò.

## 14. Trình tự triển khai dự kiến

Không phải task list — thứ tự phụ thuộc kỹ thuật:

1. Engine: `UNDO_STEP` + override + `enteredBy` events + proxy authorization +
   unit tests (thuần, không DB).
2. Store: bot allowlist theo mode + stamping chọn lọc + integration tests.
3. Projections: `privateActionHistory` + vote counts + schema tests.
4. Màn quản trò: nhập action đêm + relay + undo + start vote + vote monitor +
   fallback tay + override.
5. Route `/table` + guards hai chiều + trang player MODERATED.
6. e2e: kịch bản đạo diễn MODERATED (proxy đêm, undo, vote thiết bị, fallback
   tay, override) + captures theo quy ước `captures/`.

Sau khi mọi mục chốt: hợp nhất quyết định M* thành R25+ vào `docs/rules/07–08`
rồi mới mở task triển khai.
