# State, History and Events

## 1. Vì sao cần cả State và History?

Current State trả lời:

> Game đang ở trạng thái nào?

History trả lời:

> Tại sao game lại tới trạng thái đó?

Ví dụ chỉ lưu:

```text
Bình = ALIVE
```

là chưa đủ.

History có thể cho biết:

```text
Werewolf attacked Bình
Witch saved Bình
Moderator confirmed
→ Bình survived
```

---

## 2. Current Game State

Ví dụ:

```text
Game
- gameId
- status = IN_PROGRESS
- round = 2
- phase = NIGHT
- currentQueueStep = WITCH_ACTION
```

Player state:

```text
PlayerState
- playerId
- alive
- role
- team
- abilityState
- publicEffects
- privateEffects
```

---

## 3. Game Event

Mỗi hành động hoặc thay đổi quan trọng tạo ra event.

Gợi ý fields:

```text
GameEvent
- eventId
- gameId
- round
- phase
- eventType
- actorPlayerId
- targetPlayerId
- payload
- createdAt
- createdBy
```

Ví dụ:

```json
{
  "eventType": "WITCH_HEAL",
  "round": 2,
  "actorPlayerId": "player_5",
  "targetPlayerId": "player_2",
  "payload": {
    "potion": "HEAL"
  },
  "createdBy": "PLAYER"
}
```

Sau đó có thể có thêm:

```text
MODERATOR_CONFIRMED_ACTION
NIGHT_RESOLVED
PLAYER_SURVIVED
```

---

## 4. Event Timeline

Ví dụ:

```text
21:03 Night 2 started
21:03 Seer step activated
21:04 Seer inspected An
21:04 Moderator confirmed Seer step
21:05 Werewolf step activated
21:05 Werewolf targeted Bình
21:05 Moderator confirmed Werewolf step
21:06 Witch step activated
21:07 Witch used Healing Potion on Bình
21:07 Moderator confirmed Witch step
21:08 Night resolved
21:08 Bình survived
21:08 Day 3 started
```

---

## 5. Action vs Result

Nên có event type riêng cho:

### Action

```text
WEREWOLF_TARGET_SELECTED
WITCH_HEAL_SELECTED
SEER_INSPECT_SELECTED
```

### Moderator Decision

```text
ACTION_CONFIRMED
ACTION_REJECTED
STEP_SKIPPED
MANUAL_OVERRIDE
```

### Result

```text
PLAYER_DIED
PLAYER_SURVIVED
ROLE_REVEALED
GAME_ENDED
```

Cách này giúp audit dễ hơn nhiều.

---

## 6. Không sửa lịch sử âm thầm

Nếu Moderator sửa state:

```text
Cường: DEAD → ALIVE
```

không xóa event cũ.

Thay vào đó ghi event mới:

```text
MANUAL_OVERRIDE

Before: DEAD
After: ALIVE
Reason: Incorrect vote result was entered
```

Nguyên tắc:

> State có thể thay đổi; lịch sử phải truy nguyên được.

---

## 7. Moderator History View

Moderator nên lọc được theo:

- Round.
- Phase.
- Player.
- Event type.

MVP chưa cần analytics phức tạp; chỉ cần timeline dễ đọc và đủ để kiểm tra lại diễn biến ván.
