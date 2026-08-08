# Roles and Visibility

## 1. Villager

**Team:** Village

**Ability:** Không có night action.

Gameplay chính:

- Thảo luận.
- Suy luận.
- Vote.

Player vẫn có thể mở màn hình role để đọc lại chức năng bất kỳ lúc nào.

---

## 2. Werewolf

**Team:** Werewolf

### Ability

Khi step `WEREWOLF_ATTACK` được kích hoạt:

- Chọn một player hợp lệ làm target.
- Submit action.
- Chờ Moderator xác nhận step.

Trong MVP chỉ có 1 Werewolf nên chưa cần Wolf voting.

Sau này nếu có nhiều Werewolf, các Werewolf có thể được phép nhận biết đồng đội tùy rule.

---

## 3. Seer

**Team:** Village

### Ability

Khi step `SEER_INSPECT` active:

1. Seer chọn một player.
2. System kiểm tra role.
3. Kết quả chỉ được trả cho Seer và Moderator.
4. Action được ghi vào history.
5. Moderator xác nhận để queue tiếp tục.

MVP chỉ trả về team alignment: `WEREWOLF` hoặc `VILLAGE`.

Ví dụ:

```text
Target: An
Result: WEREWOLF
```

---

## 4. Witch

**Team:** Village

### Resource

- 1 Healing Potion.
- 1 Poison Potion.

Mỗi potion chỉ dùng một lần trong cả game.

### Witch Action

Witch diễn ra sau Werewolf vì cần context từ Werewolf Attack.

Ví dụ:

```text
Werewolf target: Bình

Healing Potion: Available
[Save Bình]
[Do not save]

Poison Potion: Available
[Use Poison]
[Skip]
```

Luật MVP đã chốt:

- Witch được tự cứu.
- Witch được dùng cả hai potion trong cùng một đêm.
- Poison chỉ được chọn một player khác đang sống.

---

# 5. Information Visibility

Không phải mọi state đều được hiển thị cho mọi player.

## Public Information

Mọi người có thể thấy:

- Tên player.
- Alive / Dead.
- Public status.
- Người đã bị loại nếu rule công khai.
- Role của người chết nếu setting bật reveal role.

## Private Information

Chỉ owner và Moderator được thấy:

- Role.
- Team.
- Ability state.
- Potion còn hay đã dùng.
- Night action.
- Investigation result.
- Hidden effects.

---

## 6. Permission Matrix

| Information                | Other Player | Owner | Moderator |
| -------------------------- | -----------: | ----: | --------: |
| Player name                |           ✅ |    ✅ |        ✅ |
| Alive / Dead               |           ✅ |    ✅ |        ✅ |
| Public status              |           ✅ |    ✅ |        ✅ |
| Own role                   |           ❌ |    ✅ |        ✅ |
| Role description           |           ❌ |    ✅ |        ✅ |
| Ability remaining          |           ❌ |    ✅ |        ✅ |
| Own night action           |           ❌ |    ✅ |        ✅ |
| Other player's hidden role |           ❌ |    ❌ |        ✅ |
| Complete game history      |           ❌ |    ❌ |        ✅ |

---

## 7. Player State nên tách Public và Private

Ví dụ:

```text
PUBLIC
- name
- alive
- publicEffects
- deathRound

PRIVATE
- role
- team
- privateEffects
- abilityState
- latestNightAction
```

Client của player khác không nên nhận hidden state nếu không cần thiết.
