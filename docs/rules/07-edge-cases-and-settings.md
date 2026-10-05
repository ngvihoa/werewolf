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

Ở `MODERATED` (R28): người bỏ về giữa ván do quản trò đánh dấu qua
`MODERATOR_OVERRIDE_MARK_DEAD` (lý do bắt buộc) — coi như chết, queue tự skip
role và win condition tự tính lại. Player không có nút "Rời ván" giữa chừng ở
MODERATED; "Rời phòng" chỉ xóa phiên local như cũ.

### Player submit nhầm target

Trước khi step được confirm:

- Reject.
- Redo action.

Sau khi đã confirm:

- Ở MODERATED (R27): `UNDO_STEP` hoàn tác step cuối của đêm hiện tại với lý do
  bắt buộc — hoàn trả tài nguyên đã consume, step về ACTIVE để chọn lại; cửa
  sổ đóng ở `CONFIRM_NIGHT_RESOLUTION`.
- Ở SELF: không có undo — submit sai đã bị rule engine từ chối ngay lúc submit;
  sau confirm chỉ còn manual override (`END_GAME` như lối thoát cuối).
- Ghi reason vào history (event `STEP_UNDONE`).

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

Revamp MODERATED (R28) đưa override vào command set chính thức: duy nhất
`MODERATOR_OVERRIDE_MARK_DEAD { playerId, reason }` — đánh dấu người sống chết
tay (bỏ về giữa ván), event `PLAYER_OVERRIDE_APPLIED`, queue tự skip role của
người chết và win condition tự tính lại từ alive set (R18). Các override khác
trong danh sách trên vẫn là non-goal của MVP.

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
Revote once, then no elimination (mặc định)
One vote only — tie means no elimination
```

**Đã lên setting (2026-10-04):** chọn khi tạo phòng (cả hai mode), lưu vào
`games.settings.voteTie` và mang vào `GameState.voteTie` khi start. Mặc định
`REVOTE_ONCE` giữ hành vi cũ; `NO_REVOTE` = hòa ngay lần đầu thì không ai bị
loại, ván sang đêm. Rule engine áp cho cả tally của bot (SELF) lẫn kết quả
Quản trò khai báo (MODERATED).

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

### Timers ở MODERATED (R31)

Đêm KHÔNG có timeout — nhịp đêm là nhịp quản trò, người nhập luôn có mặt.
Vote tái dùng mốc `waitingDeadlineAt` của R22 nhưng hết hạn chỉ báo động
(alert-only) trên màn quản trò — không lệnh bot nào được phát; quản trò đôn
ngoài đời, skip, hoặc nhập kết quả đếm tay. AUTO_SKIP không tồn tại ở
MODERATED.

---

## 5. Role vật lý

Các role phụ thuộc vào hành vi vật lý đặc biệt, ví dụ Little Girl lén nhìn khi Sói thức, không nằm trong MVP.

Nếu muốn hỗ trợ sau này, nên redesign ability cho môi trường có điện thoại thay vì cố sao chép nguyên luật vật lý.
