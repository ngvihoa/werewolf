# Revamp UI/UX — nhật ký quyết định thiết kế

> Tài liệu làm việc: ghi lại concept đang chạy, phản hồi đã đánh giá và quyết định
> sắp thực thi cho phần UI/UX của ứng dụng Werewolf. Cập nhật mỗi khi chốt thứ gì
> mới. Tài liệu spec gốc (bản tiếng Anh) nằm ngoài repo tại
> `~/Downloads/werewolf-ui-ux-redesign-spec.md`.

Trạng thái: 🔜 cần làm · ✅ đã làm · 💬 đang bàn

---

## 1. Nguyên tắc cứng (mọc lên từ phản hồi thực tế)

1. **Một màn hình = một việc.** Tầm mắt người không bao hết 2 cột trải ngang;
   mọi pha chỉ có đúng một hành động trung tâm cần thấy đầu tiên.
2. **Transparency theo vùng, không đều nhau.** Vùng nội dung (nơi chữ sống) =
   mực gần đặc; chỉ header/rìa được trong suốt. Tránh điểm giữa "vừa trong
   suốt" — đó là chỗ tệ nhất: chữ nhiễu mà tranh vẫn bị dập.
3. **Không cách điệu chữ.** Game thân thiện bạn bè — Inter duy nhất, 3 tầng
   chữ (tiêu đề pha / nội dung / metadata mono). Không display serif, không
   tạo cảm giác cao cấp giả.
4. **Thiết kế phải vô kiến với ảnh thẻ vai.** Ảnh role sẽ được thay — mọi
   xử lý không được phụ thuộc tông/ratio ảnh hiện có; thẻ chỉ là slot trung tính.
5. **UI copy 100% tiếng Việt**, viết hoa chỉ cho nhãn ngắn (tên pha, vai).
6. **UI chỉ render từ projected view** — không bao giờ dùng state thô (chống
   rò rỉ vai/mục tiêu qua devtools).

---

## 2. Đã triển khai ✅

### Nền móng (commits `37b2f16`, `74f2703`)

- Token ngữ nghĩa `@theme inline` (surface/line/ink/danger/accent/success)
  tham chiếu biến runtime — 4 theme cũ vẫn đổi được.
- Font Inter Variable có subset tiếng Việt; `pb-safe` safe-area; viewport-fit.
- Primitives dùng chung: `Button`, `PlayerToken`, `PlayerGrid`,
  `PhaseIndicator`, `GameShell`, `WaitingState` (`src/components/ui/`).

### Màn game + lobby (commits `8c34ede`, `bd50af9`, `ec20049`)

- Mobile: action panel hiện trước lưới người chơi; desktop: 2 cột 3:2.
- Chọn mục tiêu bằng thẻ người chơi (thay `<select>`); sticky primary action
  có safe-area; waiting state có ngữ cảnh.
- RoleCard giữ-để-xem/nhả-để-ẩn (chạm vẫn bật/tắt; keyboard toggle).
- Fix bug có sẵn: reload `/game` bị đáy về `/` do gate session chạy trước khi
  hydration xong (`useIsHydrated`, commit `4c6b1bb`).

### Tranh nền theo pha (commits `d3b0ea5`, `7093ad8`)

- Concept "tranh kể chuyện, giao diện im lặng": 1 tranh full-bleed mỗi pha,
  crossfade 700ms, `prefers-reduced-motion` = cắt thẳng.
- Mapping: LOBBY/SETUP/ROLE_REVEAL/READY_CHECK + DAY → `day-bg`;
  NIGHT/NIGHT_RESOLUTION → `night-bg`; VOTE/VOTE_RESOLUTION/HUNTER_SHOT →
  `voting-bg`; GAME_OVER → `game-over-bg`; dialog kết quả → `result-bg`.
- 5 tranh nén WebP: 11MB → 932KB; PNG gốc giữ ở máy, gitignore.
- Scrim gradient pha từ `--theme-canvas-end` (theo theme).
- e2e chuyển sang tương tác thẻ; suite pass (chạy: `pnpm test:e2e`, port 3100).

### Vòng đời dữ liệu (commit `65cbec0`)

- `purge_stale_games()` migration 0013 (GAME_OVER 3 ngày / LOBBY 24h /
  IN_PROGRESS 7 ngày, cascade toàn bộ bảng con).
- `createGame` bắn purge fire-and-forget (throttle 1h); `pnpm db:purge` chạy
  tay/cron; integration test phủ đủ case.

---

## 3. Phản hồi sau khi xem bản tranh nền (2026-10-01) — đã đánh giá 💬→🔜

| #   | Phản hồi                                            | Kết luận thiết kế                                                                                                                                               |
| --- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | UI hơi transparent quá                              | Chấp nhận: layout full-bleed khiến tranh và chữ đua cùng tọa độ — "trong suốt vừa" không tồn tại. Giải bằng cấu trúc mới (mục 4), không phải tinh chỉnh con số. |
| 2   | Chưa sáng tạo ra theme                              | 4 theme hiện tại chỉ retint stone/red, xung màu với tranh (tím indigo cạnh navy/cam tranh). Cần theme mới sinh ra từ tranh → "Mực & Đèn lồng" (mục 5).          |
| 3   | Đừng cách điệu font                                 | Bỏ ý serif; Inter 3 tầng. Nguyên tắc #1.                                                                                                                        |
| 4   | Đừng quan trọng hóa thẻ role                        | Slot trung tính, nhỏ, thay ảnh được. Nguyên tắc #4.                                                                                                             |
| 5   | Quá phức tạp, tràn màn — muốn tập trung 1 vùng giữa | Cấu trúc "Sân khấu giữa" (mục 4).                                                                                                                               |

---

## 4. Concept "Sân khấu giữa" ✅ (đã thực thi)

**Cấu trúc:** một cột trung tâm ~680px (max-w ~42rem) đặt giữa màn; tranh
thành "cánh gà" hai bên tự do; scrim đậm chỉ phủ vùng cột.

```
Desktop 1440
│·············· tranh ··············│
│        ┌───────────────────┐      │
│        │ ☾ Đêm 02 · 2ANMWP │      │  header 1 dòng, trong suốt
│        │                   │      │
│        │ việc #1 (prompt)  │      │  tâm điểm
│        │ [thẻ chọn mục tiêu]│     │
│        │ ▓ Gửi hành động ▓ │      │
│        │ ───────────       │      │
│        │ roster phụ, mờ    │      │
│        └───────────────────┘      │
│·············· tranh ··············│
```

- **Một việc mỗi lúc** theo pha: đêm (được gọi) = prompt + picker + gửi;
  đêm (chờ) = waiting + roster mờ; quản trò đêm = hàng đợi dọc + panel duyệt
  nối tiếp trong cột; biểu quyết = picker kết quả; kết thúc = tổng kết.
- **Đánh đổi có chủ ý** (trái spec gốc "desktop = overview-first"): Quản trò
  không còn 2 cột song song; queue chi tiết + lịch sử chuyển vào drawer.
  Sau này có thể thêm nút "bố cục rộng" nếu cần bảng điều khiển.
- Mobile giữ nguyên logic 1 cột hiện có — hai nền tảng cùng một tâm điểm.

## 5. Theme "Mực & Đèn lồng" ✅ (phần cốt lõi đã thực thi)

Palette sample trực tiếp từ tranh (UI và tranh cùng một thế giới):

| Vai trò   | Hex (sample) | Dùng ở                                        |
| --------- | ------------ | --------------------------------------------- |
| Mực đêm   | `#101a2e`    | canvas, panel (90–93% opaque ở vùng nội dung) |
| Đèn lồng  | `#e8a25e`    | hairline trên panel, focus ring, nhãn phụ     |
| Kem trăng | `#f5eeda`    | chữ chính                                     |
| Máu       | `#a83240`    | CTA chính, danger                             |

- Chữ: Inter duy nhất — tiêu đề pha ~30px medium, nội dung 16px, metadata
  mono 12–13px.
- Thẻ role: slot trung tính ~200px, không xử lý phụ thuộc ảnh.
- Vị trí trong hệ theme: xem xét làm **theme mặc định mới** thay
  moonlit-indigo cho màn chơi có tranh; 4 theme cũ giữ cho các màn không tranh
  (landing, /play) hoặc retint theo palette này ở bước sau (chưa chốt).

## 6. Việc tiếp theo (thứ tự đề xuất) 🔜

1. ✅ "Sân khấu giữa": GameShell một cột giữa + .ink-panel + scrim rỉa nhẹ.
2. ✅ Palette "Mực & Đèn lồng": token midnight/lantern + hairline đèn lồng
   (màu máu #a83240 chưa áp — hệ đỏ theo theme đang giữ vì 4 theme cũ).
3. ✅ Chụp lại bộ case UI (390/768/1440) qua đủ pha, đã trình user.
4. ✅ Landing: hero dùng tranh đêm + scrim mực, mask fade vào nền.
5. ✅ Thẻ role: max-w-56, dời xuống dưới form hành động.
6. (Tuỳ chọn) schedule `purge_stale_games` bằng pg_cron trong Supabase.
7. 🔜 Dự thảo: drawer cho queue/lịch sử Quản trò nếu cần; nút "bố cục rộng".
8. ✅ Trang /play "Cổng vào đêm" + QR mời vào phòng (mục 9).

## 7. Tích hợp bộ chibi role (2026-10-01) ✅

User bổ sung 14 ảnh chibi (public/role/chibi, PNG nguồn ~18MB giữ ở máy + gitignore). Đã all-in bộ chibi theo chốt A:

- chuẩn hóa WebP 512² pad contain (672KB), path tập trung ở `roleArtUrl(role)` (src/game/presentation/role-art.ts) — đổi art lần sau chỉ sửa 1 hàm
- RoleCard đổi thành thẻ vuông: chibi contain trên nền mực + hào quang đèn lồng, tên/mô tả tách xuống dải dưới ảnh (bài học: flex-1 chứa img cần min-h-0 nếu không dải dưới bị đẩy ra khỏi overflow-hidden)
- avatar token 40px: mặt chibi đọc rõ (lợi thế so với art dọc bị crop)
- trang luật: RoleGuideCard aspect 4/5 + RulesHero bộ thẻ trôi bọc chibi mini-card — hết tham chiếu role/optimized
- repo nhẹ đi ~40MB art nguồn (bỏ track role/*.png + role/optimized)

Mặt ngửa lá bài (cả RoleGuideCard lẫn RoleCard trong game): nền trắng + radial-gradient màu nhận diện từng vai (bảng ROLE_ACCENTS trong role-art.ts, tông theo art chibi, nhóm chùng theo phe); mặt sau giữ tối. Hero deck trang luật cũng đồng bộ (HeroCardFace nền trắng + accent, shine vàng đèn lồng). Người dùng chốt 'theo recommend'; vòng sau chỉnh: quầng màu đậm hơn (alpha 60%→30%), RoleCard trong game tỉ lệ 2:3 max-w-64 để nhân vật to ra sau khi đề xuất nền trắng + màu vai blur.

Chốt (thay PA1): nguyên nhân thật là thẻ TRỐNG chứ không phải thiếu viền → sân khấu tròn màu vai (đĩa accent 20% + bóng đổ chân blur) đặt sau chibi ở cả 3 nơi; bỏ khung mảnh PA1. Bài học: chẩn đoán đúng nhu cầu (lấp khoảng trống) trước khi chọn cơ chế (khung).

Logo (2026-10-02) ✅: user generate đúng hướng đề xuất — đầu sói chibi trên cờ đuôi én, đủ 4 màu theme. Đã tích hợp: favicon.ico đa-size + apple-touch + logo.webp 256 (master logo.png 956² track trong repo), theme-color #101a2e, logo thay chấm đỏ ở 3 header (landing/play/rules); RoomHeader giữ chấm đỏ vì đó là dot trạng thái. Favicon test pass ở 32px.

Logo V2 (2026-10-02 tối) ✅: user thay master mới (859², flat vector — cờ đỏ, thanh + mũi tên đèn lồng cam, khớp palette Mực & Đèn lồng hơn) và xoá logo.webp. Đã tái xuất nguyên bộ giữ nguyên tên file (0 đổi code): logo.webp 256/15KB, favicon.ico 16/32/48, favicon-32, apple-touch 180 RGBA. Test nét ở 32px + header 36px pass.

## 8. Vòng phản hồi sau "sân khấu giữa" (2026-10-01) ✅

| #   | Phản hồi                                | Đã xử lý                                                                                                                                                                                                                                                                                                                                                                                                                     |
| --- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Chữ mỏng, không thấy trên background    | Dải tối cố định đỉnh màn (midnight 85→50%), nhãn header + nút Rời phòng lên text-ink đầy đủ, chip mã phòng đổi sang mực 75% + backdrop-blur, hero landing tăng scrim 80/65/35.                                                                                                                                                                                                                                               |
| 2   | Màn kết quả nên là trang, không overlay | GameResultDialog xóa. Trang kết quả: banner thắng/thua (tính từ didPlayerWin, gồm Sói Lai chuyển phe + Tình nhân) → lưới "Sự thật được lộ ra" (ảnh vai toàn bộ người chơi, vương miện đèn lồng trên thẻ phe thắng, người đã chết mà thắng vẫn giữ vương miện). Projection mở role cho player khi GAME_OVER (schema optional chống lệch phiên client/server). Tranh kết thúc theo phe: Ma sói = trăng máu, còn lại = đêm hội. |

Đã chốt thêm: thẻ người chơi cao rộng bằng nhau tuyệt đối (tên 1 dòng, auto-rows-fr), bỏ badge Bạn. Lưới kết quả không phân biệt sống chết — mọi lá bài rõ như nhau (bỏ fade/† chỉ ở màn này; trong ván vẫn giữ ngôn ngữ mờ = đã chết).

Giới hạn đã biết: winner LOVERS chưa đánh dấu được vương miện (projection chưa lộ cặp tình nhân cho người khác); Sói Lai đã chuyển phe trong danh sách người khác vẫn tính theo vai gốc.

## 8. Ghi chú kỹ thuật nhanh

- Dev/e2e luôn chạy port **3100** (`pnpm dev`; e2e tái dùng server đang chạy).
- Backdrop: `data-bg` trên `<main>` + `.phase-backdrop` (4 lớp WebP) +
  `.phase-scrim`; mapping tại `phaseBackdrop()` trong
  `src/components/ui/PhaseIndicator.tsx`.
- Bug đã fix đáng nhớ: gate `sessionToken` phải chờ hydration
  (`useIsHydrated`) nếu không reload `/game` sẽ đáy về `/`.

## 9. Trang /play — "Cổng vào đêm" (2026-10-02) ✅

Grill-me 2 vòng với user, chốt 7 quyết định. Bệnh chẩn đoán: /play là trang duy
nhất còn vi phạm nguyên tắc #1 — 2 cột 2 trọng tâm, hero + stats cạnh tranh chú
ý với hành động, toggle tab ẩn một nửa form, form max-w-xs nhạt nhòa lệch thế
giới thị giác với màn game đã revamp. **Đã thực thi cùng ngày** (user cung cấp
tranh entry `public/bg/start-bg.png` 1672×941 → WebP 255KB).

| #   | Quyết định              | Nội dung                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| --- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Cấu trúc                | Xoá split-screen. Một card trung tâm (ngôn ngữ "Sân khấu giữa", ~max-w-lg) trên tranh nền + scrim; header mỏng chỉ còn logo + "Xem luật". Hero rút còn 1 dòng eyebrow trên card; stats bỏ hẳn (đã có ở landing).                                                                                                                                                                                                                                                                                                             |
| 2   | Hai lối hiện cùng lúc   | Bỏ toggle CREATE/JOIN (ModeButton + state mode + h2 đổi theo mode xoá sạch). Card có 2 khối: "Quản trò" (tên → Mở phòng mới) và "Người chơi" (mã 6 ô + tên → Vào phòng), ngăn bởi divider "hoặc". Hai luồng ngang bằng, không mode ẩn — mọi thứ thấy một lần. **[Rev 2026-10-02 tối]** User xem bản thật rồi đổi ý: 2 form chung 1 card "nhìn nhiều quá" → chuyển phương án 2 nút-lối (tile icon Crown/Users + mô tả) đầu card, chọn lối rồi form mới hiện kèm nút "Chọn lại lối"; deep-link vẫn bỏ qua menu vào thẳng JOIN. |
| 3   | Nền                     | Tranh pha + scrim mực như màn game (placeholder day-bg). User đang generate tranh entry riêng, cung cấp sau — thiết kế vô kiến với tranh (nguyên tắc #4), chỉ thêm mapping `entry-bg` khi có asset.                                                                                                                                                                                                                                                                                                                          |
| 4   | Deep-link `/join/$code` | Route mới: cùng card nhưng chỉ khối Người chơi, mã prefill từ URL, focus vào tên. Code sai/không tồn tại → lỗi hiện tại chỗ, mã vẫn sửa được. Đường QR bám vào URL này.                                                                                                                                                                                                                                                                                                                                                      |
| 5   | QR mời vào phòng        | RoomSummary phía Quản trò thêm QR ~80px luôn hiện, encode `${origin}/join/${roomCode}`; bấm phóng to full-screen (chiếu máy/để bàn xa); nút copy link cạnh nút copy mã. Thư viện: `qrcode` (SVG, deps nhẹ).                                                                                                                                                                                                                                                                                                                  |
| 6   | Ô mã phòng              | 1 input mono uppercase tracking rộng hiển thị dạng 6 ngăn (không auto-advance phức tạp); paste cả mã vào được. Deep-link prefill là chính, gõ tay là phụ.                                                                                                                                                                                                                                                                                                                                                                    |
| 7   | Copy                    | 100% tiếng Việt, nhãn ngắn "Quản trò" / "Người chơi" (nguyên tắc #5); footnote phiên riêng giữ 1 dòng mono dưới card.                                                                                                                                                                                                                                                                                                                                                                                                        |

Ảnh hưởng phải xử lý khi thực thi:

- `play.tsx`: gộp 2 mutation song song không phụ thuộc mode; layout chuyển
  `lg:grid-cols-[5fr_4fr]` → 1 cột giữa; màu chữ toàn trang theo theme mực
  (bỏ hệ stone sáng của cột form cũ).
- e2e đang bấm toggle mode → chuyển sang điền trực tiếp 2 form; thêm case
  deep-link `/join/$code` (prefill, chỉ điền tên). Chạy port 3100.
- Gate session cho `/join/$code` dùng cùng rule `/play` (có session → /lobby,
  chờ hydration trước khi gate — bài học commit `4c6b1bb`).
- Landing giữ CTA → /play (2 lối ngang bằng nên không cần tách CTA riêng).

Thực thi và bài học (2026-10-02):

- `EntryGate` component dùng chung (`src/routes/(home)/-components/EntryGate.tsx`):
  play.tsx và join.$code.tsx đều render nó — có `joinCode` thì card rút còn
  một lối. ModeButton + EntryStat đã xoá.
- Ô mã 6 ngăn: thử CSS-only (repeating-gradient 6 ngăn + 1 input tracking
  rộng) FAIL — chữ mono centered thành khối, không thẳng từng ô với ngăn.
  Thay bằng pattern input-otp lite: 6 ô hiển thị mirror giá trị + 1 input
  thật trong suốt đè trên (`text-transparent caret-ink`); paste/xóa là hành
  vi input gốc, FormData vẫn đọc được value, không auto-advance.
- `RoomInviteQR` (`src/components/RoomInviteQR.tsx`): QR 80px nền kem
  (#f5eeda) module mực (#101a2e) luôn hiện ở RoomSummary phía Quản trò +
  nút copy link; native dialog phóng to (pattern RoleCardDialog). Lib
  `qrcode` 1.5.4 (import default — types dùng `export =`).
- e2e: fixture bỏ click "Tham gia"; thêm 2 test (deep-link join, mở dialog
  QR). Bài học e2e: fill trước khi hydration xong bị client re-render xóa
  giá trị → `required` chặn submit im lặng; luôn chờ networkidle sau goto
  như fixture cũ.
- Verified: 189 unit pass; e2e chromium 5/5; screenshot 4 case desktop
  (/play, /join, lobby QR, dialog QR) — tranh entry ăn khớp thế giới chibi.
- Rev card entry (2026-10-02 tối): user đổi ý "2 options để chung 1 card
  nhìn nhiều quá" → EntryGate chuyển sang state MENU (2 PathTile Crown/Users)
  → chọn lối mới ra form, back bằng "Chọn lại lối"; h1 đổi theo state
  (Chọn lối vào bàn / Mở phòng mới / Vào phòng đang chờ). e2e fixture thêm
  bước click lối trước khi fill.

## 10. Rebrand "Moonveil" + logo-with-name (2026-10-02 tối) ✅

User cung cấp `public/logo-with-name.png` (1536×1024 RGBA — cờ Sói + wordmark
"Moonveil" chữ mực + sao đèn lồng) và chốt Moonveil là tên chính thức của site.
Grill-me 1 vòng, 4 quyết định (đều theo phương án đề xuất):

1.  **Quy ước tên**: giữ cấu trúc lockup, chỉ thay brand — header "Moonveil /
    Bàn chơi trực tuyến" (/play), "Moonveil / Trợ lý quản trò" (landing),
    "Moonveil / Luật chơi" (rules); document title "Moonveil — Ma sói trực
    tuyến"; meta rules "Luật chơi & Vai trò | Moonveil".
2.  **"Werewolf Moderator Assistant"** (footer landing + footer/eyebrow rules)
    → "Moonveil — Trợ lý quản trò".
3.  **/play**: logo-with-name thay h1 chữ ở state MENU (h1 sr-only "Moonveil —
    chọn lối vào bàn" cho a11y/SEO); state CREATE/JOIN vẫn h1 chữ, không logo.
    Header trang giữ lockup nhỏ (mark đơn).
4.  **Landing**: logo-with-name đầu cột hero, trên eyebrow; rules giữ mark đơn.

**Bài học cứng — wordmark mực tối trên nền tối**: chữ "Moonveil" trong artwork
là NAVY TỐI, biến mất trên hero/card mực. Thử recolor pixel (navy→kem, giới
hạng vùng dưới mũi cờ) FAIL — mũi cờ V cắm xuống tới y=816/1024 ĐÉ len đoạn
đầu chữ, cắt ngang thành chữ hai màu. Phương án chốt: đặt logo nguyên bản
100% pixel lên **tấm nền kem #f5eeda** (plaque rounded-2xl + shadow) — cùng
ngôn ngữ với nút QR nền kem ở lobby và mặt lá bài nền trắng; không đụng vào
artwork của user. `logo-with-name.webp` 512w/34KB xuất từ master PNG (master
track trong repo, giữ nguyên).

Tên miền logic game (role Ma sói/Alpha Werewolf, key localStorage, package
name) KHÔNG đổi — đó là thuật ngữ game, không phải brand.

**Rev 3 — bố cục logo ở /play (2026-10-02 đêm)**: plaque kem lẻ loi bị chê
→ thử "card kem mặt ngửa" (toàn card MENU nền kem, tile mực trên kem, lật
sang panel mực khi chọn lối) → user xem bản thật chê "tệ quá": khối kem lớn
nuốt mất tranh, tile mực trong kem lệch hệ. BÀI HỌC CỨNG: ép artwork
wordmark 3:2 (cần mặt sáng lớn) lên trang tối luôn sinh ra khối sáng — nhỏ
thì lẻ loi, to thì đốt trang; wordmark belongs to LANDING (nơi có hero
chứa nó), /play dùng mark đơn (tự sáng trên tối) + "Moonveil" Inter.
Chốt cuối: card MENU về panel mực nguyên bản + brand block trên card =
mark đơn 64px + h1 "Moonveil" Inter 3xl + eyebrow mono "Chọn lối vào bàn";
tile về bg-surface gốc. Logo-with-name chỉ ở landing hero (tấm kem).

**Rev 4 — chốt entry card theo mockup user (2026-10-02 đêm)**: user generate
mockup qua ChatGPT và duyệt hướng: card kem parchment (#f6ecd2) khung viền
dập nổi mảnh (inset 2.5 border #d9c398), logo-with-name TREO ĐÈ MÉP TRÊN
card (absolute -top-[112px] w-64 — mũi cờ cắm xuống card, wordmark trọn
trên kem; giải đúng bài toán "lẻ loi" + "chữ mực trên nền tối" của rev 2/3
mà không cần sửa artwork), headline serif + 2 tile phân màu (host navy
#1d2a45 + vương miện lantern; player đỏ máu tối #4b1d26 + huy hiệu hồng đá),
sparkle ✦ đáy card. NGUYÊN TẮC #3 được ghi đè có chủ ý: thêm
**Playfair Display Variable** (subset vi) làm token --font-display, CHỈ dùng
cho brand moment (headline card entry); body/3 tầng chữ vẫn Inter. Copy:
"Bạn sẽ tham gia với vai trò nào?" / "Chọn cách bạn muốn bước vào Moonveil."
/ "Tạo phòng và dẫn dắt ván chơi." / "Vào phòng bằng mã mời."

**Rev 5 — review vòng 2 của user (2026-10-02 đêm), 3 sửa:** (1) BỎ serif —
Inter toàn bộ, gỡ @fontsource-variable/playfair-display + token
--font-display; ngoại lệ nguyên tắc #3 rút lại (thử thật rồi user chốt
Inter — principle #3 hồi hiệu lực trọn vẹn). (2) Thêm HÌNH TRÒN kem
(size-44 rounded-full, -top-[96px]) phía sau logo-with-name tạo bump trên
mép card — logo "đóng đinh" vào vòng tròn đúng silhouette mockup, giải
nốt cảm giác overlap "trơ". (3) Bỏ helper text "Mỗi người dùng một phiên
riêng" dưới card. e2e entry pass.
