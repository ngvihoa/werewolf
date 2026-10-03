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

Ở `SELF` (R23): tự động "mark as left" — không mark dead, action/vote còn thiếu
của người rời tự skip/abstain (step skip với reason `PLAYER_LEFT`), người rời
dùng session cũ để xem tiếp. Host có nút "Kết thúc ván" như lối thoát cuối.

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

MVP cho vote lại đúng một lần. Nếu lần vote thứ hai tiếp tục hòa thì không ai bị loại.

System hiển thị:

```text
Vote tied.

First tie:
Revote.

Second tie:
No elimination.

Moderator confirms the result.
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

End game manually đã có command `END_GAME`: Quản trò (MODERATED) hoặc chủ phòng
(SELF) kết thúc ván sớm, reason bắt buộc để audit; winner giữ NULL — màn kết
quả hiển thị "Ván đã kết thúc" thay vì công bố phe thắng.

---

## 4. Game Settings nên chốt

### Reveal role on death

```text
No
```

### Dead player visibility

```text
Public information only
Reveal all roles
```

Mặc định MVP đã chốt:

```text
Public information only
```

### Witch self-heal

```text
Allowed
```

### Witch use both potions in one night

```text
Allowed
```

### Vote tie rule

```text
Revote once, then no elimination
```

### Win condition

```text
Werewolf wins when wolves >= villagers
```

### Timers ở SELF (R21/R22)

```text
Min discussion:  30s
Night step:      45s
Ballot:          60s
Hunter shot:     60s
```

Hằng số MVP, chưa đưa lên setting UI — data model chừa đường nâng cấp thành
settings như các rule khác.

MVP dùng cấu hình mặc định cố định ở trên, nhưng data model vẫn có thể đưa các rule này thành settings về sau.

---

## 5. Role vật lý

Các role phụ thuộc vào hành vi vật lý đặc biệt, ví dụ Little Girl lén nhìn khi Sói thức, không nằm trong MVP.

Nếu muốn hỗ trợ sau này, nên redesign ability cho môi trường có điện thoại thay vì cố sao chép nguyên luật vật lý.
