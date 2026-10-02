# Moderator and Player UI

## 1. Player UI

Player UI nên tập trung vào ba câu hỏi:

1. Tôi là ai?
2. Hiện tại tôi có thể làm gì?
3. Trạng thái công khai của ván là gì?

### My Role

Ví dụ:

```text
🔮 SEER
Village Team

Ability:
Mỗi đêm chọn một người chơi
để kiểm tra role.

[Chi tiết luật]
```

Player có thể mở lại bất kỳ lúc nào.

---

### My Status

Ví dụ Witch:

```text
Alive

Healing Potion
✓ Available

Poison Potion
✗ Used
```

---

### Other Players

Chỉ hiển thị public state:

```text
An      🟢 Alive
Bình    🟢 Alive
Cường   💀 Dead
Dũng    🟢 Alive
```

Không hiển thị hidden role của người khác.

---

### Khi chưa tới lượt

```text
🌙 Night 2

Waiting for your turn...
```

### Khi tới lượt

Ví dụ Seer:

```text
🔮 YOUR TURN

Choose one player:

○ An
○ Bình
○ Cường
○ Dũng

[Inspect]
```

Sau khi submit, player chờ Moderator xác nhận và system chuyển queue.

---

## 2. Moderator UI

Moderator UI là control panel, không phải một form nhập liệu lớn.

Moderator cần thấy:

- Current phase.
- Current round/day.
- Tất cả player.
- Tất cả role.
- Hidden state.
- Current queue.
- Current active step.
- Submitted action.
- Pending result.
- History.
- Warning / edge case.

Ví dụ:

```text
NIGHT 2

✓ Seer        Completed
→ Werewolf    Waiting confirmation
○ Witch       Pending

Werewolf selected:
Bình

[Confirm & Continue]
[Reject / Redo]
```

---

## 3. Moderator nhập gì?

MVP nên giảm tối đa input của Moderator.

### Setup

- Chọn role set.
- Có thể cấu hình game settings.

### Night

Thông thường Moderator không nhập target thay player.

Moderator chủ yếu:

- Confirm action.
- Reject / redo khi sai.
- Skip khi cần.

### Day

Do vote diễn ra ngoài đời, Moderator nhập:

```text
Eliminated player: [Cường]
```

MVP chưa cần nhập từng lá phiếu.

### Edge Case

Moderator có thể:

- Skip.
- Redo.
- Cancel action.
- Manual override.
- Ghi reason.

---

## 4. System UI Principle

Hệ thống nên tự làm:

- Random role.
- Xác định ai được action.
- Kích hoạt đúng role.
- Kiểm tra target hợp lệ.
- Tính effect.
- Theo dõi potion.
- Update round / phase.
- Ghi history.
- Check win condition.

Moderator không nên phải tự tính rồi nhập kết quả vào hệ thống.

---

## 5. Dead Player UI

Nếu player chết:

```text
💀 YOU ARE DEAD

Role:
🔮 Seer

You can no longer:
- Vote
- Use ability
- Perform night action
```

Việc dead player được xem role người khác hay không nên là setting; mặc định MVP nên giữ nguyên public visibility để giảm nguy cơ lộ thông tin ngoài đời.
