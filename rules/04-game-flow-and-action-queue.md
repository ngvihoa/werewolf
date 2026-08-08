# Game Flow and Night Action Queue

## 1. Tổng thể flow

```text
CREATE GAME
    ↓
PLAYERS JOIN
    ↓
SELECT ROLE SET
    ↓
SYSTEM RANDOMIZES ROLES
    ↓
PLAYERS VIEW OWN ROLE
    ↓
READY CHECK
    ↓
START GAME
    ↓
NIGHT
    ↓
BUILD NIGHT ACTION QUEUE
    ↓
RUN QUEUE
    ↓
NIGHT RESOLUTION
    ↓
MODERATOR CONFIRM
    ↓
DAY
    ↓
DISCUSSION
    ↓
VOTE RESULT INPUT
    ↓
MODERATOR CONFIRM
    ↓
UPDATE STATE
    ↓
CHECK WIN
```

---

## 2. Night Action Queue

Không để Moderator tự nhấn vào từng role để kích hoạt.

System tạo queue dựa trên role hiện có trong game.

Ví dụ:

```text
Night 2

1. SEER_INSPECT
2. WEREWOLF_ATTACK
3. WITCH_ACTION
4. NIGHT_RESOLUTION
```

Nếu game 5 người không có Witch:

```text
1. SEER_INSPECT
2. WEREWOLF_ATTACK
3. NIGHT_RESOLUTION
```

---

## 3. Step Status

Mỗi step có thể có:

```text
PENDING
ACTIVE
WAITING_MODERATOR_CONFIRMATION
COMPLETED
SKIPPED
```

Ví dụ:

```text
✓ Seer       COMPLETED
→ Werewolf   ACTIVE
○ Witch      PENDING
```

---

## 4. Transition Rule

Flow chuẩn:

```text
System activates current step
        ↓
Role owner performs action
        ↓
System validates action
        ↓
Step → WAITING_MODERATOR_CONFIRMATION
        ↓
Moderator confirms
        ↓
Step → COMPLETED
        ↓
System activates next step
```

Moderator không cần chọn next role.

---

## 5. Queue Configuration

Không nên hard-code hoàn toàn.

Có thể lưu dạng:

```text
SEER_INSPECT      order = 10
WEREWOLF_ATTACK   order = 20
WITCH_ACTION      order = 30
NIGHT_RESOLUTION  order = 100
```

Dùng khoảng cách `10, 20, 30` giúp chèn role mới sau này.

Ví dụ thêm Defender:

```text
DEFENDER_PROTECT  order = 5
SEER_INSPECT      order = 10
WEREWOLF_ATTACK   order = 20
WITCH_ACTION      order = 30
```

---

## 6. Dependency

Một số step cần dữ liệu của step trước.

Ví dụ:

```text
WITCH_ACTION
dependsOn = WEREWOLF_ATTACK
```

Witch cần biết target mà Werewolf đã chọn.

Do đó queue không chỉ là thứ tự hiển thị mà còn là dependency graph đơn giản cho action.

---

## 7. Skip và lỗi

Nếu một step không thể thực thi:

- Role đã chết.
- Player rời game.
- Ability không còn dùng được.
- Moderator quyết định skip.

System có thể đánh dấu:

```text
SKIPPED
```

và lưu lý do vào Game History trước khi tự chuyển bước.
