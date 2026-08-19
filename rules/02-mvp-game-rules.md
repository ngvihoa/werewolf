# MVP Game Rules

## 1. Core Loop

Một ván lặp lại theo chu trình:

```text
Setup
  ↓
Night
  ↓
Night Resolution
  ↓
Day
  ↓
Discussion
  ↓
Vote
  ↓
Vote Resolution
  ↓
Check Win
  ↓
Night / Game Over
```

Hệ thống chịu trách nhiệm duy trì phase hiện tại.

---

## 2. Role Composition đề xuất

Đây là composition dành cho thử nghiệm MVP, chưa phải mục tiêu cân bằng cuối cùng.

### 5 người chơi

- 1 Werewolf
- 1 Seer
- 3 Villagers

### 6 người chơi

- 1 Werewolf
- 1 Seer
- 1 Witch
- 3 Villagers

Từ 9 người chơi trở lên, composition mặc định thay một Villager bằng một Elder.
Elder là vai thụ động, không thêm queue step; khả năng sống sót được xử lý khi
Moderator xác nhận Night Resolution.

Từ 10 người chơi trở lên, composition thay một Villager bằng Fool. Từ 11 người
chơi trở lên, composition tiếp tục thay một Villager bằng Piper và thêm step
`PIPER_CHARM` ở cuối queue đêm.

Mục tiêu của MVP là kiểm tra toàn bộ flow và state management trước khi tối ưu balance.

---

## 3. Điều kiện thắng

### Village Team

Thắng khi tất cả Werewolf đã bị loại.

### Werewolf Team

Trong MVP nên định nghĩa rõ một luật duy nhất.

Đề xuất:

> Werewolf thắng khi số Werewolf còn sống bằng hoặc lớn hơn số thành viên Village còn sống.

Ví dụ:

```text
1 Werewolf + 1 Villager
→ Werewolf thắng
```

Nếu muốn dùng luật khác, nên đưa thành Game Setting sau MVP.

### Neutral

- Fool thắng một mình khi bị loại bởi biểu quyết đã được Moderator xác nhận.
- Piper thắng một mình sau Night Resolution khi còn sống và mọi người chơi còn
  sống khác đều đã bị mê hoặc.

---

## 4. Ban đêm

Ở MVP 6 người, thứ tự mặc định:

```text
1. Seer Inspect
2. Werewolf Attack
3. Witch Action
4. Night Resolution
```

Mỗi role chỉ được thực hiện action khi step tương ứng đang `ACTIVE`.

Quản trò không tự chọn role tiếp theo. Sau khi Quản trò xác nhận step hiện tại hoàn tất, hệ thống tự kích hoạt step tiếp theo.

---

## 5. Ban ngày

Sau khi Night Resolution hoàn tất:

1. Hệ thống cập nhật trạng thái.
2. Moderator xác nhận kết quả.
3. Hệ thống chuyển sang Day.
4. Người chơi thảo luận trực tiếp ngoài đời.
5. Moderator ghi nhận người bị vote loại.
6. Hệ thống tính kết quả.
7. Moderator xác nhận.
8. Hệ thống cập nhật state.
9. Hệ thống kiểm tra điều kiện thắng.

MVP không cần nhập từng lá phiếu. Chỉ cần nhập người bị loại sau khi nhóm đã vote ngoài đời.

---

## 6. Action không đồng nghĩa với Result

Ví dụ:

```text
Werewolf Attack A
```

chỉ là một action.

Nếu:

```text
Witch Save A
```

thì:

```text
Final Result: A survives
```

Do đó hệ thống cần tách:

- Action
- Resolution
- Result

Không cập nhật `alive = false` ngay khi Werewolf chọn target.
