# MVP Rule Decisions

Tài liệu này dùng để chốt các luật ảnh hưởng trực tiếp đến domain model và rule engine. Mỗi mục đặt phương án khuyến nghị cho MVP lên đầu.

Quy ước trạng thái:

- `[ ]` Chưa chốt.
- `[x]` Đã chốt.
- Khi chốt, đánh dấu đúng một lựa chọn và ghi quyết định vào phần `Kết luận`.

## Tóm tắt phương án khuyến nghị

| ID  | Luật                               | Mặc định đề xuất                                                           |
| --- | ---------------------------------- | -------------------------------------------------------------------------- |
| R01 | Composition 5 người                | 1 Werewolf, 1 Seer, 3 Villagers                                            |
| R02 | Composition 6 người                | 1 Werewolf, 1 Seer, 1 Witch, 3 Villagers                                   |
| R03 | Điều kiện Werewolf thắng           | Werewolf sống >= Village sống                                              |
| R04 | Witch tự cứu                       | Cho phép                                                                   |
| R05 | Witch dùng hai bình cùng đêm       | Không cho phép                                                             |
| R06 | Target của Poison                  | Player khác đang sống                                                      |
| R07 | Thông tin Witch nhận               | Biết chính xác người bị Werewolf chọn                                      |
| R08 | Witch bị tấn công                  | Vẫn được hành động trong đêm đó                                            |
| R09 | Seer tự soi                        | Không cho phép                                                             |
| R10 | Werewolf tự chọn                   | Không cho phép                                                             |
| R11 | Kết quả soi                        | Exact role                                                                 |
| R12 | Công khai role khi chết            | Có                                                                         |
| R13 | Quyền xem của người chết           | Chỉ thông tin công khai và private state của mình                          |
| R14 | Vote hòa                           | Setting khi tạo phòng: revote 1 lần (mặc định) hoặc 1 lần duy nhất         |
| R15 | Player rời game                    | Tạm dừng để Moderator quyết định                                           |
| R16 | Action bị reject                   | Lưu metadata và lý do, không công khai target                              |
| R17 | Sửa role sau khi bắt đầu           | Không; chỉ qua manual override đặc biệt                                    |
| R18 | Override ảnh hưởng state           | Tự động tính lại win condition                                             |
| R19 | Nhiều nguyên nhân chết cùng đêm    | Resolve đồng thời, một kết quả chết/player                                 |
| R20 | Vote ở chế độ không quản trò       | Bỏ phiếu trên thiết bị, bot tính phiếu                                     |
| R21 | Kết thúc thảo luận ban ngày (SELF) | Majority "Sẵn sàng bỏ phiếu" + timer tối thiểu                             |
| R22 | Timeout action đêm và vote (SELF)  | Step đêm 45s, vote 60s; hết giờ skip/abstain                               |
| R23 | Player rời game giữa ván (SELF)    | Không tự mark dead; auto skip/abstain, được quay lại                       |
| R24 | Cấu hình composition (SELF)        | Creator cấu hình như moderator trong lobby                                 |
| R25 | Hành động đêm ở MODERATED          | Quản trò nhập thay qua picker (proxy), audit `enteredBy`                   |
| R26 | Bot ở MODERATED                    | Auto-confirm step đêm + tally; người gate 3 mốc công bố                    |
| R27 | Hoàn tác bước đêm (MODERATED)      | `UNDO_STEP`: step cuối, trước gate bình minh, hoàn trả tài nguyên          |
| R28 | Override của quản trò (MODERATED)  | `MARK_DEAD` tay với lý do; win condition tự tính lại                       |
| R29 | Vote ban ngày (MODERATED)          | Thiết bị mặc định (counts live), đếm tay dự phòng; START_VOTE của quản trò |
| R30 | Màn chơi player MODERATED          | Route `/table` riêng; đêm tĩnh; sổ tay riêng với nhãn nguồn                |
| R31 | Timeout (MODERATED)                | Đêm không timeout; vote alert-only trên màn quản trò                       |

## Các quyết định

### R01. Role composition cho 5 người

- [x] **1 Werewolf, 1 Seer, 3 Villagers (Khuyến nghị).** Ít rule đặc biệt, phù hợp để kiểm thử core loop đầu tiên.
- [ ] 1 Werewolf, 1 Seer, 1 Witch, 2 Villagers. Có đủ mọi role nhưng Witch tạo ảnh hưởng lớn trong nhóm nhỏ.

Kết luận: Đã chốt.

### R02. Role composition cho 6 người

- [x] **1 Werewolf, 1 Seer, 1 Witch, 3 Villagers (Khuyến nghị).** Đúng phạm vi hiện tại và kiểm thử được toàn bộ night queue.
- [ ] 1 Werewolf, 1 Seer, 4 Villagers. Cân bằng đơn giản hơn nhưng không kiểm thử Witch trong cấu hình mặc định.

Kết luận: Đã chốt.

### R03. Điều kiện Werewolf thắng

- [x] **Werewolf thắng khi số Werewolf sống >= số thành viên Village sống (Khuyến nghị).** Luật rõ ràng, kết thúc ngay khi Village không còn lợi thế biểu quyết.
- [ ] Werewolf chỉ thắng khi không còn Village sống. Ván kéo dài hơn dù kết quả thực tế gần như đã định đoạt.

Village thắng khi không còn Werewolf sống trong cả hai phương án.

Kết luận: Đã chốt.

### R04. Witch có được tự cứu không?

- [x] **Cho phép (Khuyến nghị).** Dễ hiểu, giảm khả năng Witch chết trước khi dùng ability trong game chỉ có 6 người.
- [ ] Không cho phép. Tăng độ khó và gần với một số biến thể Ma Sói truyền thống.

Kết luận: Đã chốt.

### R05. Witch có được dùng cả hai potion trong một đêm không?

- [ ] **Không cho phép (Khuyến nghị).** Mỗi đêm Witch chọn tối đa một trong `HEAL`, `POISON`, `SKIP`; UI và resolution đơn giản hơn.
- [x] Cho phép. Witch có thể vừa cứu target của Werewolf vừa poison một player khác, tạo tối đa một cứu và một chết.

Kết luận: Đã chốt.

### R06. Witch được poison ai?

- [x] **Chỉ player khác đang sống (Khuyến nghị).** Không tự poison và không chọn người đã chết; tránh action vô nghĩa hoặc thao tác nhầm.
- [ ] Bất kỳ player đang sống, kể cả Witch. Hỗ trợ tự poison nhưng ít giá trị gameplay.
- [ ] Bất kỳ player nào. Moderator phải xử lý cả target đã chết; không nên dùng cho MVP.

Kết luận: Đã chốt.

### R07. Witch biết gì về Werewolf attack?

- [x] **Biết chính xác player bị chọn (Khuyến nghị).** Cần thiết để quyết định dùng Healing Potion và phù hợp UI đã mô tả.
- [ ] Chỉ biết có người bị tấn công. Witch dùng Heal mà không thấy target; giảm thông tin nhưng UX khó hiểu.
- [ ] Không nhận thông tin. Healing Potion phải dùng mù; khác đáng kể flow hiện tại.

Kết luận: Đã chốt.

### R08. Witch bị Werewolf chọn có còn được hành động đêm đó không?

- [x] **Vẫn được hành động (Khuyến nghị).** Mọi night action được thu thập trước khi resolution; Witch có thể tự cứu nếu R04 cho phép.
- [ ] Mất lượt ngay lập tức. Điều này làm lộ kết quả trước resolution và phá nguyên tắc Action khác Result.

Kết luận: Đã chốt.

### R09. Seer có được tự soi không?

- [x] **Không cho phép (Khuyến nghị).** Seer đã biết role của mình; chặn action không mang thêm thông tin.
- [ ] Cho phép. Đơn giản hóa target validation nhưng tạo action vô nghĩa.

Kết luận: Đã chốt.

### R10. Werewolf có được tự chọn mình không?

- [x] **Không cho phép (Khuyến nghị).** Werewolf chỉ được chọn player khác đang sống.
- [ ] Cho phép. Có thể dùng để đánh lạc hướng nếu được cứu, nhưng tạo edge case không cần thiết cho MVP.

Kết luận: Đã chốt.

### R11. Seer nhận loại kết quả nào?

- [ ] **Exact role (Khuyến nghị).** Trả về `VILLAGER`, `WEREWOLF`, `SEER` hoặc `WITCH`; phù hợp tài liệu hiện tại.
- [x] Chỉ team alignment. Trả về `WEREWOLF` hoặc `NOT_WEREWOLF`; dễ mở rộng role đặc biệt sau này.

Kết luận: Đã chốt.

### R12. Role có được công khai khi player chết không?

- [ ] **Có (Khuyến nghị).** Dễ chơi và dễ kiểm chứng hơn cho nhóm MVP; tạo event `ROLE_REVEALED` công khai.
- [x] Không. Tăng suy luận nhưng yêu cầu projection tiếp tục giữ kín role người chết.

Kết luận: Đã chốt.

### R13. Người chết được xem thông tin nào?

- [x] **Chỉ public information và private state của chính mình (Khuyến nghị).** Không làm lộ role hoặc night action nếu điện thoại được chuyền tay.
- [ ] Reveal toàn bộ role cho người chết. Tăng trải nghiệm theo dõi nhưng tăng rủi ro tiết lộ thông tin ngoài đời.

Người chết không được submit night action hoặc tham gia vote trong ứng dụng.

Kết luận: Đã chốt.

### R14. Vote ngoài đời bị hòa

- [ ] **Không ai bị loại (Khuyến nghị).** Một kết quả xác định, không cần thêm phase hoặc bộ đếm revote.
- [x] Vote lại một lần; nếu tiếp tục hòa thì không ai bị loại. Gameplay tốt hơn nhưng cần model thêm attempt.
- [ ] Moderator quyết định mỗi lần. Linh hoạt nhưng kết quả rule engine không còn hoàn toàn deterministic.

Kết luận: Đã chốt.

Cập nhật 2026-10-04: luật hòa thành **setting chọn khi tạo phòng** —
`REVOTE_ONCE` (mặc định, hành vi trên) hoặc `NO_REVOTE` (một lần duy nhất,
hòa ngay thì không ai bị loại, ván sang đêm). Lưu ở `games.settings.voteTie`,
mang vào `GameState.voteTie` khi start; `resolveVote` áp cho cả tally bot
(SELF) lẫn kết quả Quản trò khai báo (MODERATED). Chi tiết: docs/rules/07.

### R15. Player rời game giữa chừng

- [x] **Tạm dừng để Moderator quyết định (Khuyến nghị).** Moderator chọn `MARK_DEAD`, `RESTORE_SESSION` hoặc kết thúc game; mọi quyết định được audit.
- [ ] Tự động mark dead. Nhanh nhưng disconnect tạm thời có thể làm thay đổi kết quả ván.
- [ ] Không thay đổi gameplay state. Player vẫn được tính là sống, có thể khiến queue hoặc win condition bị kẹt.

`LEFT_GAME` không nên tự động thay đổi win condition trước khi Moderator ra quyết định.

Kết luận: Đã chốt.

### R16. Ghi history cho action bị reject

- [x] **Lưu actor, step, timestamp, reason và target trong private Moderator history (Khuyến nghị).** Public history chỉ ghi step đã bị reject, không chứa target hay role.
- [ ] Chỉ lưu rằng action bị reject. Ít dữ liệu nhạy cảm hơn nhưng khó audit thao tác sai.
- [ ] Không lưu action bị reject. History không còn giải thích đầy đủ diễn biến và không nên chọn.

Kết luận: Đã chốt.

### R17. Moderator có được sửa role sau khi game bắt đầu không?

- [x] **Không trong flow thông thường; chỉ qua manual override có xác nhận và reason (Khuyến nghị).** Sau khi đổi phải rebuild queue liên quan và tính lại win condition.
- [ ] Cho phép tự do. Linh hoạt nhưng dễ làm ability state, visibility và history không nhất quán.
- [ ] Cấm hoàn toàn. An toàn nhất nhưng Moderator không thể sửa lỗi setup.

Kết luận: Đã chốt.

### R18. Manual override có tự động tính lại win condition không?

- [x] **Có, nếu override ảnh hưởng alive/dead, role hoặc team (Khuyến nghị).** Nếu đạt điều kiện thắng, hệ thống đề xuất game over để Moderator xác nhận.
- [ ] Không; Moderator tự kích hoạt check win. Dễ bỏ sót và có thể để game tiếp tục trong state không hợp lệ.

Override không liên quan gameplay, ví dụ sửa display name, không cần check win.

Kết luận: Đã chốt.

### R19. Một player chịu nhiều nguyên nhân chết trong cùng đêm

- [x] **Resolve đồng thời và tạo đúng một final result cho mỗi player (Khuyến nghị).** Event chi tiết vẫn lưu mọi nguyên nhân; trạng thái cuối chỉ chuyển `ALIVE -> DEAD` một lần.
- [ ] Resolve tuần tự theo queue. Kết quả có thể phụ thuộc thứ tự xử lý và làm lộ action sớm.

Ví dụ: Werewolf attack A, Witch không cứu A và poison A vẫn chỉ tạo một kết quả `PLAYER_DIED` cho A, kèm hai nguyên nhân trong private resolution detail.

Kết luận: Đã chốt.

## Quyết định cho chế độ không quản trò (R20–R24)

Các quyết định dưới đây chỉ áp dụng cho chế độ không quản trò (game mode `SELF`,
kế hoạch thực hiện ở `docs/bot-moderator-mode.md`). Chế độ có quản trò
(`MODERATED`) giữ nguyên mọi luật hiện có.

### R20. Vote diễn ra như thế nào ở chế độ không quản trò?

- [x] **Bỏ phiếu trên thiết bị, bot tính phiếu (Khuyến nghị).** Thêm command
      `SUBMIT_VOTE` có auth theo actor; chỉ người sống được bỏ; bot tally và resolve
      theo R14. Không còn ai nhập kết quả thủ công nên không có đường gian lận.
- [ ] Vote ngoài đời, một player tự nhập kết quả. Không ai xác thực người nhập;
      người nhập biết trước kết quả có thể thao túng.
- [ ] Vote ngoài đời, cả nhóm đồng ý rồi một player nhập. Vẫn không xác thực
      được và thêm một bước đồng thuận dễ chết vì chờ nhau.

Chế độ `MODERATED` giữ nguyên vote ngoài đời + moderator nhập kết quả.

Kết luận: Đã chốt — vote trên thiết bị, bot tính phiếu theo R14.

### R21. Thảo luận ban ngày kết thúc khi nào ở SELF?

- [x] **Majority người sống bấm "Sẵn sàng bỏ phiếu" + timer tối thiểu
      (Khuyến nghị).** Bot mở vote khi đủ majority và đã qua thời gian tối thiểu
      (hằng số MVP). Nhịp do nhóm kiểm soát, một người không đồng ý không kẹt ván.
- [ ] Tất cả người sống phải đồng ý. An toàn nhưng một người AFK kẹt cả ván.
- [ ] Chỉ timer cố định. Không cần bấm nhưng ván bị kéo dài vô ích và người
      chơi mất quyền kiểm soát nhịp thảo luận.

Kết luận: Đã chốt — majority consent + timer tối thiểu.

### R22. Hết giờ cho action đêm và vote ở SELF thì sao?

- [x] **Tự skip/abstain theo deadline (Khuyến nghị).** Step đêm có deadline
      (đề xuất 45s), vote có deadline (đề xuất 60s); hết giờ step bị skip với reason
      `TIMEOUT` (ability không tiêu thụ vì chưa confirm) và phiếu thiếu tính là
      trắng. Hunter không bắn đúng hạn thì mất phát bắn. Mọi deadline ghi history.
- [ ] Không có timeout. Một người tắt màn hình là ván kẹt vĩnh viễn.
- [ ] Hết giờ tự hủy game. Phạt cả nhóm vì một người, quá nặng cho MVP.

Kết luận: Đã chốt — skip/abstain theo deadline.

### R23. Player rời game giữa ván ở SELF thì sao?

- [x] **Không tự mark dead; action/vote tự skip/abstain, được quay lại
      (Khuyến nghị).** Nhất quán với tinh thần R15 (không để disconnect tạm thời
      thay đổi gameplay state); timer R22 bảo đảm ván không kẹt. Host giữ nút kết
      thúc game sớm như lối thoát cuối.
- [ ] Tự mark dead sau một khoảng thời gian dài. Disconnect tạm thời (mất sóng,
      chuyển app) sẽ làm sai lệch kết quả ván — trái nguyên tắc R15.
- [ ] Dùng nguyên văn R15 (tạm dừng chờ quyết định). Trong SELF không có ai
      ra quyết định nên ván kẹt.

Kết luận: Đã chốt — không mark dead, auto skip/abstain.

### R24. Ai cấu hình role composition ở SELF?

- [x] **Creator cấu hình như moderator trong lobby (Khuyến nghị).** Tận dụng
      nguyên luồng `assignRoles` hiện có, chỉ mở authorization cho creator-player.
- [ ] Cả lobby vote chọn composition. Công bằng hơn nhưng thêm một pha đồng
      thuận nữa cho MVP.

Kết luận: Đã chốt — creator cấu hình.

## Quyết định cho chế độ quản trò điều phối (R25–R31)

Revamp MODERATED (M1–M13, nguồn `docs/revamp-moderator-mode.md`): tách hẳn hai
định danh sản phẩm trên cùng một engine — **SELF** giữ nguyên ("app là quản
trò"), **MODERATED** trở thành "quản trò điều phối + app trợ lý" cho bàn vật lý.
Luật chơi không đổi (win condition, R14, hàng đợi đêm, event sourcing); chỉ đổi
_ai phát lệnh_ và _ai thấy gì_. SELF phải vô hình trước mọi thay đổi.

### R25. Ai nhập hành động đêm ở MODERATED?

- [x] **Quản trò nhập thay trên màn của mình qua picker (proxy, M2/M5,
      Khuyến nghị).** Queue đêm cũ bắt buộc chủ role submit trên thiết bị —
      ngầm giả định người chơi giữ máy mở suốt ván, trong khi app không có
      wake lock/notification; màn hình sáng lúc đêm còn là "tell" lộ ai đang
      hành động. Quản trò gọi từng vai theo hàng đợi, chọn giúp bằng picker có
      validate của rule engine phản hồi ngay (dữ liệu game chỉ chọn — ô text
      tự do chỉ dành cho lý do audit). Lệnh vẫn mang actorId của chủ role,
      audit gắn `enteredBy: 'MODERATOR'`. Player bị chặn submit action đêm ở
      MODERATED.
- [ ] Player tự submit trên thiết bị (bản cũ). Điện thoại khóa màn hình là
      treo cả đêm, không ai biết tới lượt của mình ngoài giọng quản trò.
- [ ] Proxy chỉ là fallback khi player không submit. Hai đường song song làm
      UI rối và không xóa được tell màn hình sáng.

Kết luận: Đã chốt — proxy picker là đường chính; parity dữ liệu (R30) bảo đảm
action nhập hộ vẫn chiếu về đúng chủ kèm nhãn nguồn.

### R26. Bot ở MODERATED xác nhận cái gì?

- [x] **Bot auto-confirm step đêm + tally; người gate 3 mốc công bố
      (M3/M12, Khuyến nghị).** Thay nhánh cứng `mode === 'SELF'` bằng allowlist
      command theo mode: bot phát `CONFIRM_STEP` ngay sau mỗi proxy submit
      (hàng đợi tự tiến) và `SUBMIT_VOTE_RESULT` khi đủ phiếu; `CONFIRM_NIGHT_RESOLUTION`,
      `CONFIRM_HUNTER_SHOT`, `CONFIRM_VOTE_RESULT` và `START_VOTE` là của người.
      Bot im lặng ở consent R21, timeout R22 và skip — nhịp bàn thuộc về quản
      trò.
- [ ] Bot confirm tất cả như SELF. Mất quyền công bố — quản trò không còn vai
      trò trọng tài.
- [ ] Người confirm từng step. Trở lại nút bấm dày đặc mà revamp muốn xóa.

Kết luận: Đã chốt — allowlist theo mode; `REJECT_STEP` không tồn tại ở
MODERATED (cửa sổ confirm dài 0 giây dưới bot), lưới an toàn là `UNDO_STEP` (R27).

### R27. Quản trò chọn nhầm thì sao? — hoàn tác bước đêm

- [x] **`UNDO_STEP`: hoàn tác step COMPLETED cuối cùng của đêm hiện tại, lý do
      bắt buộc (M9, Khuyến nghị).** Cửa sổ tới trước `CONFIRM_NIGHT_RESOLUTION`
      — mọi thứ vẫn private, chết chóc chưa apply. Hoàn trả tài nguyên đã
      consume (bình Witch, enhanced Alpha, killAvailable White Wolf, nối Cupid),
      step về `ACTIVE`, các step ACTIVE phía sau (bot đã kích hoạt) về `PENDING`;
      nếu state đã vào `NIGHT_RESOLUTION` thì revert phase. Event
      `STEP_UNDONE { step, action, reason }`. Trên Postgres, row `CONFIRMED`
      của step bị hoàn tác chuyển sang `CANCELLED` để attempt kế không va
      partial unique index.
- [ ] Không có undo, reject lúc submit. Quản trò proxy không có cửa sổ confirm
      để bắt lỗi (bot confirm tức thì) — mis-tap là chết chóc.
- [ ] Undo nhiều step / xuyên đêm. Vượt scope MVP; state cũ không còn tái tạo
      được một cách tin cậy.

Kết luận: Đã chốt — một step, một lần, trước gate bình minh.

### R28. Override của quản trò ở MODERATED?

- [x] **`MODERATOR_OVERRIDE_MARK_DEAD` duy nhất, lý do bắt buộc (M10, Khuyến
      nghị).** Người bỏ về giữa ván được đánh dấu chết tay (thông lệ bàn vật
      lý); queue tự skip role của người chết (`ROLE_OWNER_DEAD` có sẵn) và win
      condition tự tính lại từ alive set — nhất quán R18. Không làm `MARK_LEFT`
      ở revamp này để tránh đụng machinery R23 của SELF.
- [ ] Bộ override đầy đủ (alive↔dead, restore ability, đổi target). Đụng quá
      nhiều engine state cho MVP.
- [ ] Không có override. Bàn vật lý chắc chắn gặp người bỏ về — ván kẹt.

Kết luận: Đã chốt — chỉ MARK_DEAD với lý do bắt buộc, event `PLAYER_OVERRIDE_APPLIED`.

### R29. Vote ban ngày diễn ra thế nào ở MODERATED?

- [x] **Thiết bị là mặc định + fallback đếm tay; `START_VOTE` là nút của quản
      trò (M6/M7, Khuyến nghị).** Không consent R21. Người chơi bỏ phiếu trên
      thiết bị (tái dùng `SUBMIT_VOTE`), mọi người thấy counts live theo ứng
      viên + x/y đã bỏ nhưng KHÔNG lộ ai vote ai; đủ phiếu bot tally, hòa xử
      theo R14 voteTie. `CONFIRM_VOTE_RESULT` là gate công bố. Bàn không muốn
      vote qua máy → quản trò nhập kết quả đếm tay trực tiếp (`SUBMIT_VOTE_RESULT`
      với picker người/hòa). Hunter bị vote loại tự bấm phát bắn trên thiết bị
      ban ngày; `CONFIRM_HUNTER_SHOT` là gate.
- [ ] Chỉ nhập kết quả đếm tay (bản cũ). Mất counts live — lợi thế chính của
      vote thiết bị.
- [ ] Consent + thiết bị. Hai lớp đồng thuận dư thừa — nhịp bàn là quyền quản
      trò.

Kết luận: Đã chốt — thiết bị mặc định, đếm tay dự phòng.

### R30. Người chơi MODERATED thấy gì và ở đâu?

- [x] **Route riêng `/table`; đêm là màn tĩnh; sổ tay riêng tư (M1/M4/M11/M13,
      Khuyến nghị).** Player MODERATED được redirect khỏi `/game` sang `/table`
      (guards hai chiều; join không cần biết mode). Đêm: chỉ role card + lưới
      public — không tiến trình queue, không countdown, không "đang chờ ai"
      (chống tell ánh sáng lẫn nhịp đêm). Dữ liệu riêng theo vai (kết quả soi,
      potion…) hiện ngay khi step được confirm — parity với việc họ tự nhập
      (M4), mục lịch sử gắn nhãn nguồn "do quản trò nhập". Không có nút "Rời
      ván" giữa chừng — người bỏ về do quản trò xử lý qua R28.
- [ ] Dùng lại màn `/game` của SELF branch theo mode. Countdown/consent của
      SELF lộ nhịp đêm; component rối đôi nhánh.
- [ ] Đêm vẫn hiện hàng đợi ẩn danh. Vẫn tell nhịp — màn đổi mỗi step.

Kết luận: Đã chốt — `/table`, màn tĩnh, parity dữ liệu.

### R31. Timeout ở MODERATED thì sao?

- [x] **Đêm không timeout; vote alert-only (M8, Khuyến nghị).** Nhịp đêm là
      nhịp quản trò — người nhập luôn có mặt nên stall không tồn tại. Vote tái
      dùng mốc `waitingDeadlineAt` của R22 nhưng hết hạn KHÔNG phát lệnh bot
      nào: màn quản trò sáng đèn "quá giờ — đôn ngoài đời, skip, hay nhập
      tay?" và người quyết. AUTO_SKIP không đưa vào MODERATED.
- [ ] Timeouts như SELF (auto-skip). Bàn vật lý chậm là thật — tự skip là
      mất quyền người chơi.
- [ ] Không có alert. Quản trò phải tự canh giờ bằng tay.

Kết luận: Đã chốt — không timeout đêm, vote alert-only.

## Cách chốt

1. Đánh dấu một lựa chọn trong từng mục.
2. Thay `Kết luận: Chưa chốt.` bằng quyết định cuối cùng.
3. Sau khi tất cả mục được chốt, đồng bộ các quyết định vào `02-mvp-game-rules.md`, `03-roles-and-visibility.md` và `07-edge-cases-and-settings.md`.
4. Dùng bảng quyết định này làm đầu vào cho transition table và table-driven tests của Phase 1.
