# AGENTS.md — chỉ dẫn cho AI agent làm việc trên repo Moonveil

Game Ma sói (Werewolf) trực tuyến: Quản trò điều phối qua màn hình riêng,
người chơi xem vai bí mật trên thiết bị của họ. Mobile-first, chơi tại bàn.

## Lệnh

```bash
pnpm dev            # dev server — LUÔN port 3100 (3000 là project khác của user)
pnpm check          # prettier + eslint + tsc — chạy trước khi commit
pnpm test           # unit (không cần DB)
pnpm test:e2e       # Playwright chromium; tái dùng dev server 3100 đang chạy
pnpm test:integration  # cần DATABASE_URL thật
pnpm db:generate / db:migrate / db:studio
```

## Cấu trúc

- `src/routes/` — TanStack Router file-based: `(home)/` (landing, /play,
  /join/$code, /rules), `lobby/`, `game/`.
- `src/game/` — domain, rules, store (Postgres event-sourced qua Drizzle),
  orchestration, presentation (projections/schema cho UI). Mỗi module có
  `README.md` riêng tại chỗ — giữ nguyên vị trí.
- `src/orpc/` — contracts + routers. UI chỉ gọi qua client, output đi qua
  schema validation.
- `src/components/`, `src/components/ui/` — primitives dùng chung
  (Button, PlayerToken, PlayerGrid, GameShell…).
- `docs/` — mọi tài liệu dự án:
  - `docs/revamp-ui-ux.md` — **NGUỒN SỰ THẬT của UI/UX**: đọc TRƯỚC khi làm
    UI; nguyên tắc cứng + toàn bộ vòng quyết định thiết kế nằm ở đó.
  - `docs/rules/` — spec game 8 phần (scope, luật, vai, flow, sự kiện).
  - `docs/ROADMAP.md`, `docs/TECHNICAL_ASSESSMENT.md`.

## Quy ước code

- `className` động hoặc nhận từ ngoài → `cn()` từ `src/lib/cn.ts`
  (clsx + tailwind-merge, class sau thắng); chuỗi class tĩnh giữ template.
- UI copy 100% tiếng Việt; viết hoa chỉ cho nhãn ngắn.
- UI chỉ render từ projected view — không bao giờ dùng state thô (chống lộ
  vai/mục tiêu qua devtools).
- Commit nhỏ, conventional commits, message tiếng Việt
  (`feat(brand): …`, `fix(game): …`).
- Font chỉ Inter (+ token `--font-sans`); không thêm display font nếu user
  không yêu cầu.

## Bẫy đã từng ngã — đọc trước khi debug

- Gate session (`if (sessionToken) return <Navigate …/>`) phải chạy SAU
  hydration (`useIsHydrated`) — nếu không, reload sẽ đá người dùng về `/`.
- Đổi schema oRPC xong phải **restart dev server** — client/server lệch phiên
  gây "Output validation failed". Trường mới nên thêm dạng `.optional()`.
- e2e full-suite thỉnh thoảng đỏ MỘT test orchestration khác nhau mỗi run
  (timeout ở mutation/lobby view) — đó là server dev lạnh/giật: restart server
  rồi chạy riêng test đó để xác nhận flake, đừng nghi code UI.
- Dynamic arbitrary value Tailwind kiểu `rotate-[${x}deg]` KHÔNG được sinh —
  dùng class literal tĩnh.
- Debug oRPC trực tiếp: `POST /api/rpc/<proc>` với body bọc envelope
  `{"json": <input>}`, response cũng bọc `{json: …}`.
- `<li>` render ngoài `<ul>` sẽ hiện marker disc mặc định — component nhận
  vai trò list item phải tự `list-none`.
- User đôi khi sửa file SONG SONG bằng AI/editor khác — luôn đọc lại file từ
  đĩa trước mỗi đợt sửa.
- Theme: `data-theme` trên `<html>` + CSS var runtime; swatch màu từng theme
  map cứng trong `src/theme/theme.ts` (đồng bộ với block trong `styles.css`).
