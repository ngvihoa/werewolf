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

- Các Werewolf còn sống nhận biết đồng đội và cùng theo dõi một target chung.
- Werewolf không được chọn thành viên phe Werewolf làm target.
- Một Werewolf chọn player hợp lệ và submit action chung của đàn.
- Chờ Moderator xác nhận step.

Mỗi step chỉ có một Werewolf action đang chờ xác nhận. Werewolf khác có thể đổi
target chung trước khi Moderator xác nhận; hệ thống không thực hiện Wolf voting.

### Alpha Werewolf (Sói Đầu Đàn)

Sói Đầu Đàn thuộc phe Werewolf, nhận biết đồng đội và tham gia
`WEREWOLF_ATTACK` như Werewolf thường.

Sói Đầu Đàn có một lần **Cắn xuyên bảo vệ** trong cả game:

- Chỉ Sói Đầu Đàn còn sống được kích hoạt năng lực trên Werewolf action chung.
- Đòn cắn bỏ qua hiệu lực của Protector đối với target trong đêm đó.
- Healing Potion của Witch vẫn cứu được target.
- Năng lực chỉ bị tiêu hao sau khi Moderator xác nhận action.
- Action chưa được xác nhận có thể đổi target hoặc tắt Cắn xuyên bảo vệ mà không
  tiêu hao năng lực.
- Sau khi đã dùng hoặc khi Sói Đầu Đàn chết, Cắn xuyên bảo vệ không còn khả dụng.
- Sói thường không được kích hoạt năng lực thay cho Sói Đầu Đàn.

Trạng thái kích hoạt và số lần sử dụng chỉ được hiển thị cho phe Werewolf và
Moderator. Protector, Witch và các player khác không được biết đòn cắn có xuyên
bảo vệ hay không.

### Hybrid Wolf (Sói Lai)

Sói Lai xuất hiện từ bàn 14 người, bắt đầu thuộc phe Village và có trạng thái
`converted: false`:

- Nếu đòn cắn bị Protector chặn hoặc Witch cứu, Sói Lai không chuyển hóa.
- Cắn xuyên bảo vệ bỏ qua Protector và vẫn chuyển hóa Sói Lai; Witch vẫn cứu
  được và ngăn chuyển hóa.
- Khi Moderator xác nhận Night Resolution của một đòn cắn có hiệu lực, Sói Lai
  sống sót, chuyển sang phe Werewolf và tham gia hành động chung từ đêm kế tiếp.
- Seer thấy `VILLAGE` trước chuyển hóa và `WEREWOLF` sau chuyển hóa.
- Courtesan chỉ chết khi thăm Sói Lai đã chuyển hóa.
- Trước chuyển hóa, Sói có thể chọn Sói Lai làm mục tiêu; sau chuyển hóa, Sói
  Lai là đồng đội và không thể bị đàn Sói chọn cắn.
- Sói Lai thắng theo phe hiệu lực tại thời điểm game kết thúc.

Chỉ Sói Lai và Moderator thấy trạng thái chuyển hóa. Các player khác không nhận
event công khai về việc chuyển phe; đàn Sói nhận biết đồng đội mới từ đêm kế tiếp.

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

## 5. Protector

**Team:** Village

### Ability

Khi step `PROTECTOR_PROTECT` active:

- Protector chọn một player đang sống để bảo vệ trong đêm đó.
- Protector được tự bảo vệ.
- Không được bảo vệ cùng một target trong hai đêm liên tiếp.
- Bảo vệ chỉ chặn `WEREWOLF_ATTACK`; không chặn Witch Poison hoặc Hunter Shot.
- Cắn xuyên bảo vệ của Sói Đầu Đàn bỏ qua hiệu lực này.
- Target được bảo vệ và kết quả chặn đòn là thông tin ẩn.

---

## 6. Hunter

**Team:** Village

### Night Mark

Khi step `HUNTER_MARK` active, Hunter chọn trước một player đang sống:

- Mark chỉ có hiệu lực trong đêm hiện tại.
- Nếu Hunter thực sự chết khi giải quyết đêm, target đã mark chết theo với cause
  `HUNTER_SHOT`.
- Nếu Hunter được cứu hoặc bảo vệ và không chết, mark không kích hoạt.
- Nếu target đã chết bởi cause khác trong cùng đêm, mark không tạo thêm một lần
  chết.

### Vote Shot

Nếu Hunter bị vote loại:

1. Game chuyển sang phase `HUNTER_SHOT`.
2. Hunter đã chết chọn một player khác còn sống.
3. Moderator xác nhận target chết.
4. System kiểm tra điều kiện thắng trước khi chuyển sang đêm tiếp theo.

Target mark, target shot và action đang chờ chỉ được hiển thị cho Hunter và
Moderator cho đến khi kết quả chết được công khai.

---

## 7. Elder

**Team:** Village

Già làng có thể sống sót qua lần `WEREWOLF_ATTACK` chí mạng đầu tiên trong ván:

- Mạng đặc biệt chỉ bị tiêu hao khi đòn cắn thực sự có thể gây chết.
- Witch dùng Healing Potion hoặc Protector chặn đòn thì không tiêu hao mạng.
- Cắn xuyên bảo vệ của Sói Đầu Đàn vẫn kích hoạt và tiêu hao mạng đặc biệt.
- Sau khi đã mất mạng đặc biệt, lần cắn Sói tiếp theo giết Già làng như bình
  thường.
- Vote, Witch Poison và Hunter Shot giết Già làng ngay, không bị mạng đặc biệt
  ngăn cản.

Trạng thái mạng đặc biệt chỉ hiển thị cho Già làng và Moderator.

---

## 8. Fool

**Team:** Neutral

Thằng ngốc xuất hiện từ bàn 10 người và thắng một mình khi bị loại bởi biểu quyết
đã được Moderator xác nhận:

- Chiến thắng được xử lý ngay sau khi xác nhận loại, trước Hunter Shot và điều
  kiện thắng của hai phe.
- Chết bởi Werewolf Attack, Witch Poison, Hunter Shot hoặc Hunter Mark không tạo
  chiến thắng cho Thằng ngốc.
- Nếu phe Village thắng theo điều kiện thông thường, Thằng ngốc vẫn thua.
- Seer soi Thằng ngốc nhận kết quả `VILLAGE`.
- Thằng ngốc không có night action hoặc tài nguyên riêng.

---

## 9. Piper

**Team:** Neutral

Người thổi sáo xuất hiện từ bàn 11 người và mỗi đêm mê hoặc một người chơi mới:

- Piper không được chọn chính mình, người đã chết hoặc người đã bị mê hoặc.
- Người bị mê vẫn giữ nguyên vai trò và hành động bình thường.
- Người bị mê chỉ biết trạng thái của chính mình; họ không thấy Piper hoặc những
  người đã bị mê khác.
- Piper thấy danh sách mục tiêu mình đã mê để chọn mục tiêu mới.
- Piper thắng một mình sau khi Moderator xác nhận kết quả đêm nếu Piper còn sống
  và tất cả người chơi còn sống khác đều đã bị mê.
- Nếu Piper chết trong chính đêm đó thì không thắng.
- Seer soi Piper nhận kết quả `VILLAGE`.

---

## 10. Cupid

**Team:** Village

Thần tình yêu xuất hiện từ bàn 12 người và chỉ hành động trong đêm đầu tiên:

- Cupid chọn hai người đang sống khác nhau và không được chọn chính mình.
- Hai tình nhân biết danh tính của nhau nhưng không biết vai trò của nhau.
- Khi một người chết bởi bất kỳ nguyên nhân nào, người còn lại chết theo với
  cause `HEARTBREAK`.
- Hệ thống không cấm tình nhân nhắm vào nhau; Werewolf Attack vẫn là hành động
  chung của đàn Sói.
- Nếu hai tình nhân cùng alignment, họ tiếp tục thắng hoặc thua cùng phe gốc.
- Nếu một người thuộc Werewolf và người kia không thuộc Werewolf, họ thắng với
  `LOVERS` khi là hai người cuối cùng còn sống.
- Khi cùng đạt điều kiện sau Night Resolution, `LOVERS` được kiểm tra trước Piper
  rồi mới đến Village/Werewolf.
- Cupid không tự động thắng cùng cặp đôi và Seer soi Cupid nhận `VILLAGE`.

---

## 11. Courtesan

**Team:** Village

Kỹ nữ xuất hiện từ bàn 13 người và mỗi đêm đến thăm một người chơi khác:

- Không được thăm cùng một người trong hai đêm liên tiếp.
- Nếu Sói cắn Kỹ nữ khi cô đang đi thăm, đòn cắn tại nhà cô không trúng.
- Nếu Kỹ nữ thăm Werewolf hoặc Alpha Werewolf, cô chết với cause
  `COURTESAN_VISIT`.
- Nếu Sói cắn đúng người được thăm và đòn cắn thực sự giết mục tiêu, Kỹ nữ cũng
  chết với cause `COURTESAN_VISIT`.
- Nếu Protector, Witch hoặc mạng đặc biệt của Elder khiến mục tiêu sống sót, Kỹ
  nữ cũng sống.
- Kỹ nữ không chết theo Witch Poison, Hunter Shot hoặc nguồn chết khác xảy ra với
  người được thăm.
- Chuyến thăm không chặn năng lực của mục tiêu và chỉ Kỹ nữ cùng Moderator thấy.
- Seer soi Kỹ nữ nhận kết quả `VILLAGE`.

---

# 8. Information Visibility

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
- Thành viên phe Werewolf và Werewolf target chung.
- Potion còn hay đã dùng.
- Night action.
- Investigation result.
- Hidden effects.

---

## 8. Permission Matrix

| Information                     | Other Player | Owner | Moderator |
| ------------------------------- | -----------: | ----: | --------: |
| Player name                     |           ✅ |    ✅ |        ✅ |
| Alive / Dead                    |           ✅ |    ✅ |        ✅ |
| Public status                   |           ✅ |    ✅ |        ✅ |
| Own role                        |           ❌ |    ✅ |        ✅ |
| Role description                |           ❌ |    ✅ |        ✅ |
| Ability remaining               |           ❌ |    ✅ |        ✅ |
| Own night action                |           ❌ |    ✅ |        ✅ |
| Werewolf teammates (Wolf owner) |           ❌ |    ✅ |        ✅ |
| Shared target (Wolf owner)      |           ❌ |    ✅ |        ✅ |
| Enhanced attack (Wolf owner)    |           ❌ |    ✅ |        ✅ |
| Other player's hidden role      |           ❌ |    ❌ |        ✅ |
| Complete game history           |           ❌ |    ❌ |        ✅ |

---

## 9. Player State nên tách Public và Private

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
