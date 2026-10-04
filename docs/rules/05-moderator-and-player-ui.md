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

---

## 6. Chế độ không quản trò (SELF)

Self mode (R20–R24) bỏ Quản trò khỏi vòng chơi; người tạo phòng trở thành một
player thường kiêm **chủ phòng** (host). Mode MODERATED không đổi bất kỳ UI nào
mô tả ở trên.

### Chủ phòng

- Tạo phòng: chọn chế độ MODERATED/SELF; ở SELF creator nhận player session
  và điều khiển sảnh thay Quản trò.
- Lobby: cấu hình composition, phân vai, start — dùng đúng các control Quản
  trò (R24).
- Trong ván: không có bảng điều khiển; nút "Kết thúc ván" là lối thoát cuối,
  bắt buộc ghi lý do trong dialog (R23).
- Màn kết quả: nút "Chơi ván mới cùng phòng" với xác nhận hai bước; sau
  rematch cả bàn về lobby, vai/ready/trạng thái rời ván xóa sạch.

### Người chơi

- Bỏ phiếu trên thiết bị (R20): picker người sống + chọn phiếu trắng; chỉ
  thấy số phiếu đã bỏ (x/y) và phiếu của chính mình.
- Day: banner "Sẵn sàng bỏ phiếu" kèm đếm consent/majority (R21).
- Countdown hiển thị cho mọi người ở ngữ cảnh đang chờ (step đêm / vote /
  hunter shot); khi về 0, client gọi `game.tick` (R22).
- Người đã rời hiển thị "đã rời" trong lưới người chơi — thẻ mờ nhưng không có
  dấu † hay gạch ngang tên vì vẫn "sống" trong luật (R23).
- Nút "Rời ván" nằm trên header trong ván (thay nhãn "Rời phòng") kèm dialog
  xác nhận: sau khi rời, người đó thấy trạng thái chỉ xem và không hành động/
  bỏ phiếu được nữa. Khối cuối màn chơi chỉ còn "Kết thúc ván" của chủ phòng —
  một lối ra duy nhất trong ván, khỏi nhầm hai nút hai ngữ nghĩa.
- Game over: mở lộ vai cả làng như MODERATED; ván kết thúc bằng "Kết thúc ván"
  hiển thị "Ván đã kết thúc" thay vì công bố phe thắng.
