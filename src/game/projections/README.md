# Permission-Aware Projections

Projection layer chuyển raw server game state thành view đúng quyền. Đây là security boundary: client không nhận raw state rồi tự ẩn field bằng UI.

## View types

### Moderator view

Moderator nhận full local game snapshot, gồm role, ability state, submitted actions và complete history.

### Player view

Player nhận:

- Public identity và alive/dead status của mọi player.
- Role, ready state và ability state của chính mình.
- Queue status và thông tin mình có được action hay không.
- Werewolf target chỉ khi viewer là Witch và `WITCH_ACTION` đang active.
- Night actions do chính viewer submit.
- Seer result chỉ của chính Seer.
- Public history được lọc theo allowlist.

Role của player khác, potion state của Witch khác, hidden target, death cause và rejected action của người khác không xuất hiện trong Player view.

## History policy

Public history được xây mới từ allowlist event type. Projection không spread raw event rồi xóa field nhạy cảm. Vì vậy event mới được thêm vào domain sẽ mặc định không xuất hiện cho Player cho đến khi có projection rõ ràng.

`SEER_RESULT_RECORDED` lưu alignment tại thời điểm Moderator confirm để role override trong tương lai không làm thay đổi kết quả soi trong lịch sử.
