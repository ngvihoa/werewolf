# Werewolf UI/UX Review & Improvement Specification

## 1. Mục tiêu

Tài liệu này tổng hợp review UI/UX cho phiên bản Werewolf hiện tại dựa
trên toàn bộ flow từ Lobby → Phân vai → Ban đêm → Ban ngày → Biểu quyết
→ Kết thúc ván.

Direction hiện tại đã cải thiện rõ rệt: visual identity tốt hơn, phase
ngày/đêm dễ nhận biết, artwork tạo được atmosphere và flow giữa
Moderator/Player tương đối coherent.

Tuy nhiên, vấn đề chính còn lại là:

> **Artwork đã mang cảm giác game, nhưng interaction UI vẫn mang khá
> nhiều cấu trúc của dashboard/form web application.**

Mục tiêu của vòng cải thiện tiếp theo không phải redesign toàn bộ, mà là
giữ visual direction hiện tại và đẩy interaction layer gần hơn với một
**tabletop/social-deduction game experience**.

---

## 2. Design Principles

### 2.1. Player experiences the game world; Moderator sees the game system

Hai loại người dùng có nhu cầu khác nhau:

- **Player UI:** immersive, ít thông tin vận hành, tập trung vào
  current objective và game state.
- **Moderator UI:** operational, rõ trạng thái từng bước, dễ kiểm soát
  và xác nhận action.

Không nên ép cả hai role dùng hoàn toàn cùng một visual grammar.

### 2.2. Game state phải được nhận biết trước khi đọc nội dung

Background hiện tại đang làm tốt việc này và nên được phát triển thành
một phase visual system:

Phase Visual direction

---

Lobby Peaceful daylight
Role reveal Dusk / focused backdrop
Night Moonlit village
Dawn Blue sunrise
Day Bright village
Voting Sunset / tense orange
Execution Dark sunset
Victory Festival / celebration

Artwork không chỉ là decoration mà nên trở thành một phần của navigation
và state communication.

### 2.3. Interaction hierarchy

Player screen nên ưu tiên hierarchy:

```text
GAME STATE
    ↓
CURRENT OBJECTIVE
    ↓
PRIMARY INTERACTION
    ↓
CONFIRMATION
    ↓
SECONDARY INFORMATION
```

Tránh cấu trúc giống dashboard:

```text
Page title
Section
Helper text
Divider
Section
Form
Divider
Button
Section
Grid
```

### 2.4. Spacing trước, container sau

Không phải mọi nhóm thông tin đều cần card hoặc border.

Ưu tiên:

1.  spacing;
2.  typography;
3.  subtle background;
4.  divider;
5.  bordered card chỉ khi thật sự cần.

Interactive elements có thể dùng card mạnh hơn informational elements.

---

# 3. Những điểm nên giữ

## 3.1. Atmosphere và artwork

Day/night transition hiện là một trong những điểm mạnh nhất.

Các state như:

- Lobby/day;
- Night;
- Voting/sunset;
- Victory/festival;

đều tạo được cảm giác phase khác nhau mà không cần người dùng đọc text.

**Không nên redesign direction này từ đầu.**

## 3.2. Main dark panel

Navy translucent panel phù hợp với artwork và tạo đủ contrast cho nội
dung.

Có thể tiếp tục sử dụng, nhưng nên giảm cảm giác "một dashboard card
lớn" bằng hierarchy bên trong tốt hơn.

## 3.3. Semantic status trong Moderator

Các trạng thái như:

- `ĐANG GỌI`
- `CHỜ`
- `CHỜ DUYỆT`
- `XONG`

đang hoạt động khá tốt.

Green cho completed và amber cho pending là direction nên giữ.

## 3.4. Victory screen

Victory screen hiện là một trong những màn hình hoàn thiện nhất về:

- focal point;
- atmosphere;
- semantic color;
- player reveal;
- whitespace;
- payoff.

Nên dùng màn hình này làm **quality bar** cho các phase quan trọng khác.

---

# 4. Các vấn đề chính

## 4.1. Information hierarchy còn phẳng

Ví dụ một night action hiện thường có:

```text
Đêm 01
Làng chìm vào giấc ngủ.

Chọn nạn nhân cho đàn Sói
Thông tin trên màn hình...

ĐỒNG ĐỘI MA SÓI
...

MA SÓI TẤN CÔNG
...

[player grid]

[CTA]
```

Có quá nhiều heading/subheading có visual weight gần nhau.

### Đề xuất

Rút thành:

```text
ĐÊM 01
● Ma Sói đang thức

Chọn một nạn nhân

[player] [player] [player]
[player] [player] [player]

[XÁC NHẬN LỰA CHỌN]
```

Các thông tin như teammate, instruction hoặc private-state nên chuyển
thành compact contextual elements.

---

## 4.2. Quá nhiều container và divider

Pattern hiện tại thường là:

```text
Main Card
 ├── Section
 │   └── Card
 ├── Divider
 ├── Section
 │   ├── Card
 │   ├── Card
 │   └── Card
 ├── CTA
 ├── Divider
 └── Player section
     └── Cards
```

Điều này làm UI bị segmented và tăng cảm giác dashboard.

### Đề xuất

Informational block:

```text
MỤC TIÊU CỦA MA SÓI

      Bảo Ngọc
```

không nhất thiết phải nằm trong một bordered card lớn.

Dùng card mạnh chủ yếu cho:

- selectable player;
- result;
- confirmation;
- warning;
- role card;
- interactive controls.

---

# 5. PlayerTile --- ưu tiên redesign cao nhất

Player card hiện tại là thành phần yếu nhất trong visual system.

Một tile chỉ gồm số + tên dễ tạo cảm giác giống seat picker hoặc admin
dashboard.

## 5.1. Component thống nhất

Đề xuất tạo một component:

```text
<PlayerTile />
```

với các state:

- default;
- selectable;
- selected;
- disabled;
- dead;
- current actor;
- role visible;
- role hidden;
- winner;
- targeted.

### Default / hidden role

```text
╭────────────────╮
│       06       │
│                │
│    TUẤN KIỆT   │
╰────────────────╯
```

### Role visible

```text
╭────────────────╮
│       ◉        │
│                │
│    TUẤN KIỆT   │
│     Ma Sói     │
╰────────────────╯
```

### Selected

```text
╭════════════════╮
│             ✓  │
│       06       │
│    TUẤN KIỆT   │
╰════════════════╯
```

### Dead

```text
╭────────────────╮
│       ☠        │
│   TUẤN KIỆT    │
│     ĐÃ CHẾT    │
╰────────────────╯
```

Selection, role visibility và alive/dead phải là state của cùng một
component thay vì các implementation khác nhau.

---

# 6. Semantic Color System

Accent rose/red hiện đang đảm nhiệm quá nhiều ý nghĩa:

- primary CTA;
- selection;
- active phase;
- current action;
- warning;
- wolf action;
- checked control.

Nên tách semantic rõ hơn:

Meaning Suggested direction

---

Primary action Rose
Dangerous/elimination Red
Selected Lavender hoặc rose outline
Pending Amber
Success/completed Mint
Information Blue/Lavender
Disabled Slate

Không cần tăng số lượng màu mạnh. Mục tiêu là mỗi accent có ý nghĩa ổn
định xuyên suốt game.

---

# 7. Phase Header

Hiện các heading như `Đêm 01`, `Ngày 01`, `Gần sáng`, `Biểu quyết` vẫn
khá giống page heading thông thường.

Nên xây một reusable:

```text
<PhaseHeader />
```

Ví dụ:

```text
        ☾
      ĐÊM 01
Ma Sói đang thức
```

hoặc:

```text
        ☀
      NGÀY 01
Làng thức dậy
```

Phase header có thể thay đổi:

- icon;
- label;
- accent;
- supporting text;

nhưng giữ layout nhất quán.

---

# 8. Role Reveal

Role reveal là một major game moment nhưng hiện vẫn giống content nằm
bên trong webpage.

Nên nâng thành một experience riêng:

```text
       THÂN PHẬN CỦA BẠN

              ✦

       ┌─────────────┐
       │             │
       │  CHARACTER  │
       │             │
       └─────────────┘

           TIÊN TRI

  Mỗi đêm bạn có thể soi phe
       của một người chơi.

        [ TÔI ĐÃ HIỂU ]
```

## Yêu cầu

- Dim background mạnh hơn.
- Role card là focal point.
- Có explicit confirmation.
- Có thể dùng subtle entrance animation.
- Không đặt quá nhiều secondary information cạnh role reveal.
- `Xem vai trò` sau đó có thể sử dụng modal compact như implementation
  hiện tại.

Role reveal nên cảm giác như **một event**, không chỉ là page state.

---

# 9. Lobby

Lobby hiện chứa khá nhiều thông tin đồng thời:

- room status;
- room code;
- sync/version;
- instructions;
- readiness checklist;
- role strategy;
- shuffle;
- start;
- player list.

Flow quan trọng thực tế chỉ là:

```text
Players
   ↓
Assign roles
   ↓
Players ready
   ↓
Start
```

## Đề xuất layout

```text
PHÒNG V5NKW4                         8/15

● Người chơi          8/5 minimum
● Vai trò             Chưa phân
○ Sẵn sàng            0/8

Cách chia vai

(●) Ngẫu nhiên
( ) Không Dân thường
( ) Moderator tự chọn

[XÁO & PHÂN VAI]

────────────────────────

Người chơi

[player grid]

[BẮT ĐẦU VÁN]
```

### Important

`Bắt đầu ván` nên:

- nằm sau player list; hoặc
- sticky ở bottom khi điều kiện start đã thỏa.

Không nên đặt Start trước player list vì flow hiện tại thành:

```text
configure → start → inspect players
```

thay vì:

```text
configure → inspect players → start
```

---

# 10. Moderator Experience

Moderator dashboard là nơi dashboard metaphor hợp lý.

Flow hiện tại:

```text
01 Thợ săn chọn mục tiêu       ĐANG GỌI
02 Bảo vệ chọn người bảo hộ    CHỜ
03 Tiên tri soi                CHỜ
04 Ma sói tấn công             CHỜ
05 Phù thủy hành động          CHỜ
```

nên được giữ và refine.

## Đề xuất

Moderator nên dễ nhìn thấy:

- current step;
- completed steps;
- pending action;
- action waiting for confirmation;
- remaining players;
- history/event log.

Current step cần nổi bật rõ nhưng không cần dùng quá nhiều border đỏ.

---

# 11. Player Night Action

Player không cần nhìn thấy workflow hệ thống.

Ví dụ Tiên tri nên tập trung vào:

```text
ĐÊM 01
Tiên tri đang thức

Chọn một người để soi phe

[player grid]

[XÁC NHẬN NGƯỜI CHƠI]
```

Sau khi moderator confirm:

```text
KẾT QUẢ SOI

Tuấn Kiệt

        MA SÓI

[ẨN KẾT QUẢ]
```

History nên là secondary content, có thể collapse.

---

# 12. Witch Action

Current screen có nhiều information blocks:

- wolf target;
- potion history;
- heal control;
- poison selection;
- player grid;
- CTA.

Nên ưu tiên current decision.

Ví dụ:

```text
ĐÊM 02
Phù thủy đang thức

Ma Sói đã chọn

      MAI PHƯƠNG

Bạn muốn làm gì?

[ 🧪 CỨU MAI PHƯƠNG ]

HOẶC

Dùng bình độc
[player grid]

[ XÁC NHẬN ]
```

Potion history nên là:

```text
Lịch sử dùng bình ›
```

hoặc secondary expandable block.

---

# 13. Day Discussion

Day discussion hiện có quá nhiều empty space mà chưa tạo được
intentional phase moment.

Nên biến nó thành một calm transition:

```text
              ☀

           NGÀY 01

       Cùng bàn thảo luận

  Hãy thảo luận và tìm ra Ma Sói.
  Quản trò sẽ bắt đầu biểu quyết
      khi mọi người sẵn sàng.

        8 người còn sống

────────────────────────

Người chơi
[player grid]
```

Whitespace lúc này trở thành intentional thay vì cảm giác thiếu content.

---

# 14. Voting

Voting screen hiện tương đối rõ, nhưng có thể tăng tension bằng
hierarchy:

```text
BIỂU QUYẾT
Lượt 1 / 2

Ai sẽ bị loại khỏi làng?

[player grid]

□ Kết quả hòa

[XÁC NHẬN BIỂU QUYẾT]
```

Không cần lặp lại nhiều explanatory text nếu game state đã rõ.

Selected player cần dùng cùng `PlayerTile` state với night actions.

---

# 15. Dawn / Night Result

Các result screen nên có presentation khác action screen.

Ví dụ:

```text
          BÌNH MINH

        Đêm đã kết thúc

           ☠

        Mai Phương
        đã bị sát hại
```

hoặc:

```text
          BÌNH MINH

      Không có ai thiệt mạng.
```

Moderator có thể xem detailed resolution, nhưng player nên nhận result
theo cách cinematic hơn.

---

# 16. Victory Screen

Victory screen hiện là quality bar tốt.

Có thể tăng focal point thành:

```text
             🏆

          CHIẾN THẮNG

         PHE DÂN LÀNG

   Dân làng đã tiêu diệt
        toàn bộ Ma Sói
```

Sau đó mới reveal toàn bộ role.

Victory nên có animation nhẹ nếu phù hợp:

- lantern movement;
- subtle particles;
- trophy entrance;
- role reveal stagger.

Không cần animation phức tạp hoặc gây distraction.

---

# 17. Typography

Không nên dùng fantasy font cho toàn bộ UI vì sẽ giảm readability.

Có thể tách:

### Display typography

Dùng cho:

- ĐÊM 01;
- NGÀY 01;
- BÌNH MINH;
- BIỂU QUYẾT;
- CHIẾN THẮNG.

Có thể tạo personality chỉ bằng:

- uppercase;
- tracking;
- weight;
- size;
- subtle serif/display font nếu phù hợp.

### UI typography

Giữ clean sans-serif cho:

- player names;
- instructions;
- buttons;
- status;
- form controls.

---

# 18. Responsive / Mobile Direction

Mobile không nên chỉ là:

```css
desktop-panel {
  width: 100%;
}
```

Game này có khả năng được sử dụng chủ yếu theo mô hình mỗi player cầm
một điện thoại, vì vậy mobile cần được coi là first-class experience.

## Mobile priorities

### Primary action luôn dễ tiếp cận

Action quan trọng có thể dùng sticky bottom action:

```text
┌──────────────────────┐
│                      │
│      CONTENT         │
│                      │
├──────────────────────┤
│  XÁC NHẬN LỰA CHỌN  │
└──────────────────────┘
```

### Player grid

Desktop:

```text
4 columns
```

Tablet:

```text
3 columns
```

Mobile:

```text
2 columns
```

Không ép 3--4 card nhỏ vào mobile.

### Header

Room code + leave action cần compact lại.

Ví dụ:

```text
● ĐÊM 01       V5NKW4   ⋯
```

Secondary controls có thể vào overflow menu.

### Role reveal

Trên mobile, role card có thể chiếm phần lớn viewport.

### Moderator

Moderator dashboard mobile có thể chuyển từ table-like layout thành
vertical queue:

```text
✓ Thợ săn
✓ Bảo vệ

● Tiên tri
  Đang chờ xác nhận

○ Ma Sói
○ Phù thủy
```

---

# 19. Component Architecture đề xuất

Các component UI quan trọng:

```text
GameShell
PhaseBackground
GamePanel

RoomHeader
PhaseHeader
PhaseStatus

PlayerGrid
PlayerTile
PlayerAvatar

RoleCard
RoleReveal
RoleViewerDialog

ActionPanel
ActionSummary
ConfirmationPanel

ModeratorActionQueue
ModeratorActionItem

GameResult
VoteResult
NightResult
VictoryPanel

PrimaryActionBar
StatusBadge
ContextBanner
```

Không nên tạo component riêng cho từng role nếu cấu trúc interaction
giống nhau.

Ví dụ:

```text
SeerTargetPicker
WolfTargetPicker
HunterTargetPicker
```

nên cân nhắc abstraction:

```text
TargetPicker
```

với props/state khác nhau.

---

# 20. Priority Roadmap

## P0 --- Foundation

### 1. Redesign `PlayerTile`

Xây unified state system cho:

- normal;
- selected;
- dead;
- role-visible;
- role-hidden;
- targeted;
- winner;
- disabled.

### 2. Chuẩn hóa semantic colors

Loại bỏ việc rose/red đảm nhiệm quá nhiều nghĩa.

### 3. Xây `PhaseHeader`

Tạo visual identity rõ cho từng phase.

---

## P1 --- Player Experience

### 4. Simplify player night screens

Giảm:

- divider;
- helper text;
- nested card;
- operational information.

Tăng emphasis vào current objective.

### 5. Redesign Role Reveal

Biến thành major game event.

### 6. Redesign Dawn/Result presentation

Result screen cần khác action screen.

---

## P2 --- Game Flow

### 7. Simplify Lobby

Flow:

```text
Players → Roles → Ready → Start
```

### 8. Improve Day Discussion

Biến empty state thành intentional phase experience.

### 9. Refine Voting

Tăng tension và tái sử dụng unified PlayerTile.

---

## P3 --- Responsive

### 10. Mobile-first pass

Review riêng các viewport:

```text
360px
390px
430px
768px
1024px+
```

Đặc biệt kiểm tra:

- player selection;
- role reveal;
- moderator queue;
- sticky CTA;
- long player names;
- 15-player room;
- landscape orientation;
- browser safe area.

---

# 21. Acceptance Criteria

## Visual

- Background phase thay đổi rõ ràng theo game state.
- UI vẫn nhận diện được là Werewolf/game interface ngay cả khi blur
  hoặc bỏ artwork.
- Không lạm dụng bordered container.
- Primary objective luôn có visual priority cao nhất.
- Status colors có semantic nhất quán.

## PlayerTile

- Một component hỗ trợ toàn bộ player states.
- Selected state rõ ràng mà không phụ thuộc chỉ vào màu.
- Dead state nhận biết ngay.
- Role visibility không leak information cho player không được phép
  xem.
- Touch target phù hợp mobile.

## Player UX

Trong vòng khoảng 1--2 giây, player phải trả lời được:

1.  Đây là phase nào?
2.  Tôi có cần làm gì không?
3.  Nếu có, tôi phải chọn gì?
4.  Action nào xác nhận lựa chọn?

## Moderator UX

Moderator phải nhanh chóng nhận biết:

1.  Current action là gì?
2.  Player nào đang được gọi?
3.  Action đã submit chưa?
4.  Có cần confirm không?
5.  Step tiếp theo là gì?

## Responsive

- Không horizontal overflow ở 360px.
- CTA chính luôn dễ reach.
- Player grid tối thiểu 2 columns trên mobile nếu kích thước cho phép.
- Không giảm font size quá mức chỉ để fit layout.
- Dialog không vượt viewport.
- Role card có thể xem đầy đủ mà không cần awkward horizontal scroll.
- Safe-area được xử lý trên mobile.

---

# 22. North-star Direction

Không cần tăng thêm nhiều decoration.

Direction tiếp theo nên là:

> **Giảm dashboard structure, tăng game interaction hierarchy.**

Và nguyên tắc quan trọng nhất:

> **Moderator sees the game system. Player experiences the game world.**

Target cuối cùng:

> Ngay cả khi background artwork bị blur hoàn toàn, interaction layer
> vẫn phải khiến người dùng nhận ra đây là một social-deduction /
> Werewolf game, không phải một SaaS workflow application.

Phiên bản hiện tại đã có foundation tốt. Vòng cải thiện tiếp theo nên
tập trung vào interaction system, component states và mobile UX thay vì
thay đổi toàn bộ visual direction.
