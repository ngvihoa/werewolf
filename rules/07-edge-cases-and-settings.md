# Edge Cases and Game Settings

## 1. Triết lý xử lý edge case

System nên:

1. Detect.
2. Giải thích tình huống.
3. Đề xuất rule mặc định.
4. Chờ Moderator quyết định nếu tình huống có thể ảnh hưởng gameplay.
5. Ghi quyết định vào history.

Moderator có quyền cuối cùng.

---

## 2. Một số edge case quan trọng

### Player rời game

Moderator có thể chọn:

- Mark as left game.
- Mark as dead.
- Pause game.
- Custom decision.

### Player submit nhầm target

Trước khi step được confirm:

- Reject.
- Redo action.

Sau khi đã confirm:

- Manual override.
- Ghi reason vào history.

### Role owner đã chết

Queue step tương ứng tự động:

```text
SKIPPED
reason = ROLE_OWNER_DEAD
```

### Ability đã hết

Ví dụ Witch đã dùng Healing Potion.

System không cho submit action đó lần nữa.

### Vote ngoài đời bị hòa

MVP chưa cần hard-code một cách xử lý duy nhất.

System hiển thị:

```text
Vote tied.

Suggested rule:
No elimination.

Moderator:
[No elimination]
[Revote]
[Custom]
```

---

## 3. Manual Override

Moderator có thể cần:

- Alive → Dead.
- Dead → Alive.
- Restore ability.
- Consume ability.
- Change submitted target.
- Cancel action.
- Skip step.
- Repeat step.
- End game manually.

Mọi override phải có:

- Before state.
- After state.
- Moderator.
- Timestamp.
- Reason.

---

## 4. Game Settings nên chốt

### Reveal role on death

```text
Yes / No
```

### Dead player visibility

```text
Public information only
Reveal all roles
```

Mặc định MVP đề xuất:

```text
Public information only
```

### Witch self-heal

```text
Allowed / Not allowed
```

### Witch use both potions in one night

```text
Allowed / Not allowed
```

### Vote tie rule

```text
No elimination
Revote
Moderator decides
```

### Win condition

```text
Werewolf wins when wolves >= villagers
```

MVP nên chọn một cấu hình mặc định cố định trước, nhưng thiết kế data model để có thể đưa các rule này thành settings về sau.

---

## 5. Role vật lý

Các role phụ thuộc vào hành vi vật lý đặc biệt, ví dụ Little Girl lén nhìn khi Sói thức, không nằm trong MVP.

Nếu muốn hỗ trợ sau này, nên redesign ability cho môi trường có điện thoại thay vì cố sao chép nguyên luật vật lý.
