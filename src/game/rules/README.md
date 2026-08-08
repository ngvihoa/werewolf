# Game Rules

Thư mục này chứa pure rule engine của game. Các module chỉ nhận dữ liệu đầu vào và trả về kết quả, không truy cập UI, database, Supabase hoặc state dùng chung. Nhờ đó cùng một bộ luật có thể được dùng bởi local in-memory MVP và persistence layer sau này.

## Các file

### `mvp-settings.ts`

Chứa các luật và role composition cố định đã được chốt cho MVP:

- Composition cho game 5 và 6 người.
- Quyền tự cứu và sử dụng potion của Witch.
- Loại kết quả Seer nhận được.
- Luật vote hòa.
- Quy tắc reveal role khi chết.

Đây là nguồn cấu hình mặc định cho rule engine. File không chứa current game state.

### `transitions.ts`

Định nghĩa các chuyển đổi hợp lệ của game state machine và Night Action Queue:

- Phase nào có thể chuyển sang phase nào.
- Role nào sở hữu từng queue step.
- Queue ban đêm tương ứng với role composition hiện tại.

`canTransitionPhase` dùng để chặn chuyển phase không hợp lệ. `getNightQueue` tạo queue cho một ván dựa trên các role đang được sử dụng.

### `role-assignment.ts`

Quản lý role composition và phân vai:

- Trả về composition mặc định theo số người chơi.
- Kiểm tra một role set có đúng luật MVP không.
- Xáo trộn và gán role cho player bằng Web Crypto.

Hàm gán role cho phép truyền random function riêng để caller có thể kiểm soát tính xác định khi cần.

### `night-actions.ts`

Định nghĩa và validate các action ban đêm:

- Seer chọn người để soi.
- Werewolf chọn người để tấn công.
- Witch dùng Healing Potion, Poison Potion hoặc cả hai.

Validation kiểm tra active queue step, role và trạng thái của actor, target hợp lệ, cùng lượng potion trong ability state của Witch. Module chỉ xác nhận action có hợp lệ; nó không làm player chết hoặc tiêu thụ potion trực tiếp.

`getSeerResult` chuyển role của target thành team alignment mà Seer được phép thấy.

### `resolution.ts`

Biến các action đã được xác nhận thành kết quả cuối:

- Resolve Werewolf attack, Witch heal và Witch poison đồng thời.
- Gộp nhiều nguyên nhân chết của cùng một player thành một kết quả.
- Không mutate danh sách player đầu vào.
- Resolve vote thường, lần vote hòa đầu tiên và lần vote hòa thứ hai.

Module này tách `Action` khỏi `Result`: việc Werewolf chọn một target chưa làm target chết cho đến khi night resolution chạy.

### `win-condition.ts`

Tính team thắng dựa trên số player còn sống:

- Village thắng khi không còn Werewolf sống.
- Werewolf thắng khi số Werewolf sống lớn hơn hoặc bằng số thành viên Village sống.
- Trả về `null` nếu game tiếp tục.

Có thể gọi bằng số lượng từng team hoặc trực tiếp bằng danh sách player trong domain state.

## Ranh giới thiết kế

Các module trong thư mục này không chịu trách nhiệm cho:

- Lưu current state hoặc history.
- Xác thực session và phân quyền người gọi.
- Moderator confirm, reject, redo hoặc override.
- Điều phối command theo version/idempotency.
- Tạo permission-aware view cho client.
- Hiển thị UI.

Các trách nhiệm đó thuộc game orchestration, store và projection layer. Orchestration gọi rule engine để validate hoặc resolve, sau đó mới cập nhật state và append event.
