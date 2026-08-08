# Game Orchestration

Thư mục này điều phối một ván game bằng các command thuần TypeScript. Nó nằm giữa rule engine và store: nhận current state, gọi rule validation/resolution, rồi trả về state mới cùng các event cần append.

Orchestration không truy cập Supabase, database, UI hoặc global state.

## Các file

### `model.ts`

Định nghĩa aggregate state cần để chạy game: phase, round, players, Night Action Queue, pending/confirmed action, pending resolution, vote attempt và winner. Ability resources thuộc private state của player sở hữu role tương ứng, không nằm ở game level.

### `commands.ts`

Định nghĩa ý định thay đổi game:

- Player submit night action.
- Moderator confirm, reject hoặc skip queue step.
- Moderator confirm night resolution.
- Bắt đầu vote, submit và confirm vote result.

Authentication và authorization layer phải đảm bảo đúng actor được gửi từng command trước khi gọi orchestrator.

### `events.ts`

Định nghĩa các fact đã xảy ra sau khi command được chấp nhận. Event giữ đủ dữ liệu nội bộ cho audit; projection layer phải lọc hidden target/action trước khi trả history cho client.

Store sẽ bổ sung event ID, timestamp, game ID và người thực hiện khi persist.

### `game-orchestrator.ts`

Cung cấp hai entry point:

- `createFirstNightState`: tạo state cho đêm đầu từ danh sách player đã được phân role.
- `executeCommand`: xử lý một command và trả về `Result<CommandOutcome>`.

`executeCommand` không mutate state đầu vào. Command hợp lệ trả về state kế tiếp và danh sách event; command không hợp lệ trả typed domain error và không tạo event.

## Confirmation boundaries

- Submit night action chỉ chuyển step sang chờ Moderator.
- Reject đưa step về active để player làm lại và không tiêu thụ ability.
- Confirm mới ghi nhận action, tiêu thụ potion và kích hoạt step kế tiếp.
- Kết thúc queue chỉ chuẩn bị night resolution; player chưa chết ngay.
- Confirm night resolution mới cập nhật alive/dead và check win condition.
- Vote result cũng chỉ có effect sau khi Moderator confirm.

Store sau này phải lưu state mới và events trong cùng một atomic operation.
