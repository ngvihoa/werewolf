# Werewolf Moderator Assistant

Bộ tài liệu này mô tả MVP cho một nền tảng hỗ trợ chơi **Ma Sói trực tiếp (offline)**.

Hệ thống **không thay thế Quản trò**. Hệ thống chịu trách nhiệm điều phối luồng chơi, random role, hiển thị thông tin đúng quyền, theo dõi trạng thái và lưu lịch sử. Quản trò giám sát, xác nhận các bước quan trọng và xử lý ngoại lệ.

## Phạm vi MVP

- 1 Quản trò.
- 5–6 người chơi, không tính Quản trò.
- Role ban đầu:
  - Villager
  - Werewolf
  - Seer
  - Witch
- Hệ thống tự random role.
- Mỗi người chơi xem được role và mô tả role của chính mình.
- Người chơi xem được trạng thái công khai của những người khác.
- Ban đêm sử dụng **Night Action Queue** để tự kích hoạt role theo thứ tự.
- Quản trò xác nhận hoàn thành bước hiện tại; hệ thống tự chuyển sang bước tiếp theo.
- Hệ thống lưu Current Game State và Game History.
- Quản trò có quyền xử lý ngoại lệ và manual override.
- Không đưa các role phụ thuộc hành vi vật lý ngoài đời vào MVP.

## Cấu trúc tài liệu

| File                               | Nội dung                                          |
| ---------------------------------- | ------------------------------------------------- |
| `01-product-scope.md`              | Mục tiêu sản phẩm, actor và phạm vi MVP           |
| `02-mvp-game-rules.md`             | Luật chơi và role composition cho MVP             |
| `03-roles-and-visibility.md`       | Role, quyền xem thông tin và trạng thái           |
| `04-game-flow-and-action-queue.md` | Game flow và cơ chế thứ tự thức dậy               |
| `05-moderator-and-player-ui.md`    | Trách nhiệm và UI của Quản trò / người chơi       |
| `06-state-history-and-events.md`   | Game state, lịch sử, event và audit               |
| `07-edge-cases-and-settings.md`    | Edge case, override và các setting cần quyết định |
| `08-mvp-rule-decisions.md`         | Checklist chốt luật và phương án đề xuất cho MVP  |

## Nguyên tắc thiết kế cốt lõi

> **System điều phối. Moderator giám sát. Player hành động. History ghi lại mọi thay đổi quan trọng.**

Một action của người chơi không nhất thiết đồng nghĩa với kết quả cuối cùng. Ví dụ Werewolf chọn tấn công A nhưng Witch cứu A thì kết quả cuối cùng là A vẫn sống.
