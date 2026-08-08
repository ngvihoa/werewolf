# MVP Rule Decisions

Tài liệu này dùng để chốt các luật ảnh hưởng trực tiếp đến domain model và rule engine. Mỗi mục đặt phương án khuyến nghị cho MVP lên đầu.

Quy ước trạng thái:

- `[ ]` Chưa chốt.
- `[x]` Đã chốt.
- Khi chốt, đánh dấu đúng một lựa chọn và ghi quyết định vào phần `Kết luận`.

## Tóm tắt phương án khuyến nghị

| ID  | Luật                            | Mặc định đề xuất                                  |
| --- | ------------------------------- | ------------------------------------------------- |
| R01 | Composition 5 người             | 1 Werewolf, 1 Seer, 3 Villagers                   |
| R02 | Composition 6 người             | 1 Werewolf, 1 Seer, 1 Witch, 3 Villagers          |
| R03 | Điều kiện Werewolf thắng        | Werewolf sống >= Village sống                     |
| R04 | Witch tự cứu                    | Cho phép                                          |
| R05 | Witch dùng hai bình cùng đêm    | Không cho phép                                    |
| R06 | Target của Poison               | Player khác đang sống                             |
| R07 | Thông tin Witch nhận            | Biết chính xác người bị Werewolf chọn             |
| R08 | Witch bị tấn công               | Vẫn được hành động trong đêm đó                   |
| R09 | Seer tự soi                     | Không cho phép                                    |
| R10 | Werewolf tự chọn                | Không cho phép                                    |
| R11 | Kết quả soi                     | Exact role                                        |
| R12 | Công khai role khi chết         | Có                                                |
| R13 | Quyền xem của người chết        | Chỉ thông tin công khai và private state của mình |
| R14 | Vote hòa                        | Không ai bị loại                                  |
| R15 | Player rời game                 | Tạm dừng để Moderator quyết định                  |
| R16 | Action bị reject                | Lưu metadata và lý do, không công khai target     |
| R17 | Sửa role sau khi bắt đầu        | Không; chỉ qua manual override đặc biệt           |
| R18 | Override ảnh hưởng state        | Tự động tính lại win condition                    |
| R19 | Nhiều nguyên nhân chết cùng đêm | Resolve đồng thời, một kết quả chết/player        |

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

## Cách chốt

1. Đánh dấu một lựa chọn trong từng mục.
2. Thay `Kết luận: Chưa chốt.` bằng quyết định cuối cùng.
3. Sau khi tất cả mục được chốt, đồng bộ các quyết định vào `02-mvp-game-rules.md`, `03-roles-and-visibility.md` và `07-edge-cases-and-settings.md`.
4. Dùng bảng quyết định này làm đầu vào cho transition table và table-driven tests của Phase 1.
