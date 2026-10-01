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

## 4. Concept kế tiếp: "Sân khấu giữa" 🔜

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

## 5. Theme "Mực & Đèn lồng" 🔜

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

1. "Sân khấu giữa": GameShell về cột giữa + scrim theo vùng (mực đặc trong
   cột, trong suốt ở rìa).
2. Palette "Mực & Đèn lồng" + hairline đèn lồng.
3. Chụp lại bộ case UI (390/768/1440, đủ pha) so trước–sau.
4. Landing: hero dùng tranh đêm (chưa đụng, 340 dòng).
5. Hạ thẩm mỹ thẻ role về slot trung tính.
6. (Tuỳ chọn) schedule `purge_stale_games` bằng pg_cron trong Supabase.

## 7. Ghi chú kỹ thuật nhanh

- Dev/e2e luôn chạy port **3100** (`pnpm dev`; e2e tái dùng server đang chạy).
- Backdrop: `data-bg` trên `<main>` + `.phase-backdrop` (4 lớp WebP) +
  `.phase-scrim`; mapping tại `phaseBackdrop()` trong
  `src/components/ui/PhaseIndicator.tsx`.
- Bug đã fix đáng nhớ: gate `sessionToken` phải chờ hydration
  (`useIsHydrated`) nếu không reload `/game` sẽ đáy về `/`.
