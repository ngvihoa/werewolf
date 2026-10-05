# Moderator and Player UI

## 1. Player UI

Player UI nên tập trung vào ba câu hỏi:

1. Tôi là ai?
2. Hiện tại tôi có thể làm gì?
3. Trạng thái công khai của ván là gì?

Ở `MODERATED`, người chơi chơi trên route riêng `/table` (R30): màn đêm là màn
tĩnh — chỉ role card + lưới public, không tiến trình queue hay countdown; dữ
liệu riêng của vai (kết quả soi, potion…) hiện kèm nhãn nguồn khi mục lịch sử
là action quản trò nhập hộ; ban ngày thêm phiếu biểu quyết với counts live.
Người chơi bị chặn mọi hành động đêm ở mode này (R25).

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

Revamp MODERATED (R25–R31) bổ sung vào panel:

- **Khối nhập action đêm theo step ACTIVE** — picker người sống có validate
  của rule engine, nút "Ghi nhận lựa chọn của `<vai>`" (R25).
- **Relay thông tin đêm** — "Báo Phù thủy: Sói đã chọn `<tên>`" khi tới lượt
  Witch; card "Báo Tiên tri: `<tên>` soi `<target>`: SÓI/NGƯỜI" sau khi soi
  được ghi nhận (quản trò đọc/lật màn hình cho bàn).
- **Hoàn tác bước vừa rồi** — dialog xác nhận + lý do bắt buộc (R27).
- **Bắt đầu biểu quyết + vote monitor** — x/y đã bỏ, counts theo ứng viên
  (không lộ ai vote ai), đèn alert khi quá giờ (R29, R31); form nhập kết quả
  đếm tay thu gọn làm fallback.
- **Đánh dấu người bỏ khỏi ván** — dialog chọn người sống + lý do (R28).

Ví dụ (đêm, một form proxy hiện tại):

```text
NIGHT 2

✓ Seer        Xong
→ Werewolf    Đang gọi
○ Witch       Chờ

Gọi Player 5, Player 6 (Ma sói) rồi chọn giúp họ.
Ai cắn đêm nay?  [token picker]

[Ghi nhận lựa chọn của Ma sói]
[Hoàn tác bước vừa rồi]
```

---

## 3. Moderator nhập gì?

MVP nên giảm tối đa input của Moderator.

### Setup

- Chọn role set.
- Có thể cấu hình game settings.

### Night

Ở `MODERATED` (R25): quản trò nhập thay chủ role — gọi từng vai theo hàng đợi,
chọn giúp qua picker có validate của rule engine; lệnh mang actorId của chủ
role, audit ghi `enteredBy: 'MODERATOR'`. Chọn nhầm thì hoàn tác bằng
`UNDO_STEP` (R27). Thông tin đêm phải truyền đạt (Sói chọn ai cho Phù thủy,
kết quả soi) hiện sẵn trên panel để quản trò đọc.

Ở `SELF` (R20–R22): người chơi tự submit trên thiết bị, bot auto-confirm —
quản trò không tồn tại.

### Day

Ở `MODERATED` (R29): vote diễn ra qua thiết bị — người chơi bấm phiếu, panel
quản trò thấy counts live và bấm công bố. Fallback khi bàn không dùng máy:

```text
Nhập kết quả đếm tay (dự phòng)

Eliminated player: [picker]
```

Ở `SELF`: tương tự R20 — phiếu trên thiết bị, bot tally.

### Edge Case

Moderator có thể:

- Skip.
- Hoàn tác bước đêm (`UNDO_STEP`, R27).
- Manual override (`MODERATOR_OVERRIDE_MARK_DEAD`, R28).
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
