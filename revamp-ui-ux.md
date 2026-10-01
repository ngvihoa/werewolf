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

## 7. Tích hợp bộ chibi role (2026-10-01) ✅

User bổ sung 14 ảnh chibi (public/role/chibi, PNG nguồn ~18MB giữ ở máy + gitignore). Đã all-in bộ chibi theo chốt A:

- chuẩn hóa WebP 512² pad contain (672KB), path tập trung ở `roleArtUrl(role)` (src/game/presentation/role-art.ts) — đổi art lần sau chỉ sửa 1 hàm
- RoleCard đổi thành thẻ vuông: chibi contain trên nền mực + hào quang đèn lồng, tên/mô tả tách xuống dải dưới ảnh (bài học: flex-1 chứa img cần min-h-0 nếu không dải dưới bị đẩy ra khỏi overflow-hidden)
- avatar token 40px: mặt chibi đọc rõ (lợi thế so với art dọc bị crop)
- trang luật: RoleGuideCard aspect 4/5 + RulesHero bộ thẻ trôi bọc chibi mini-card — hết tham chiếu role/optimized
- repo nhẹ đi ~40MB art nguồn (bỏ track role/*.png + role/optimized)

Mặt ngửa lá bài (cả RoleGuideCard lẫn RoleCard trong game): nền trắng + radial-gradient màu nhận diện từng vai (bảng ROLE_ACCENTS trong role-art.ts, tông theo art chibi, nhóm chùng theo phe); mặt sau giữ tối. Hero deck trang luật cũng đồng bộ (HeroCardFace nền trắng + accent, shine vàng đèn lồng). Người dùng chốt 'theo recommend'; vòng sau chỉnh: quầng màu đậm hơn (alpha 60%→30%), RoleCard trong game tỉ lệ 2:3 max-w-64 để nhân vật to ra sau khi đề xuất nền trắng + màu vai blur.

Chốt (thay PA1): nguyên nhân thật là thẻ TRỐNG chứ không phải thiếu viền → sân khấu tròn màu vai (đĩa accent 20% + bóng đổ chân blur) đặt sau chibi ở cả 3 nơi; bỏ khung mảnh PA1. Bài học: chẩn đoán đúng nhu cầu (lấp khoảng trống) trước khi chọn cơ chế (khung).

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
