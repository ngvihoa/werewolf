# Local In-Memory Store

Thư mục này cung cấp persistence boundary tạm thời cho MVP chạy local. Toàn bộ game, session và history chỉ tồn tại trong memory của server process; không có kết nối Supabase hoặc database.

## Các file

### `model.ts`

Định nghĩa local game record, lobby player, fake session, setup event, stored event và typed store errors.

`StoredEvent` bọc domain event bằng metadata local gồm sequence, ID, game ID, actor và timestamp. Payload event vẫn được giữ nguyên để projection layer lọc theo quyền sau này.

### `in-memory-game-store.ts`

`InMemoryGameStore` quản lý:

- Tạo game và room code.
- Player join bằng display name.
- Fake Moderator/Player session token.
- Ready check và role assignment.
- Chuyển lobby thành orchestration state khi bắt đầu game.
- Authorize command theo session.
- Optimistic locking bằng `expectedVersion`.
- Current state và append-only event history.
- Detached snapshot để caller không mutate dữ liệu trong store.
- Permission-aware game view theo fake session.
- Reset toàn bộ local data.

### `local-game-store.ts`

Export singleton `localGameStore` để server functions và oRPC procedures dùng chung một store. Instance được giữ trên `globalThis` để Vite hot reload không vô tình xóa các game đang test local.

## Local-only behavior

- Restart server sẽ xóa toàn bộ game.
- Session token được giữ raw trong memory, không hash.
- Store chỉ an toàn trong một JavaScript process.
- Không có transaction, cross-process locking hoặc realtime broadcast.
- `getGame` trả raw server snapshot và không được gọi trực tiếp từ Player API. Client-facing procedures phải dùng `getGameView`.

Các giới hạn trên là chủ ý cho local MVP. Khi chuyển sang Supabase, API của orchestration và projection có thể giữ nguyên; persistence implementation sẽ được thay thế bằng Drizzle transactions.
