# Werewolf Moderator Assistant - Technical Assessment

## 1. Tong quan

San pham la mot nen tang ho tro choi Ma Soi truc tiep. Moi nguoi van thao luan va vote ngoai doi; dien thoai duoc dung de xem role, thuc hien night action va theo doi trang thai van choi.

He thong khong thay the Quan tro.

Nguyen tac cot loi:

> System dieu phoi. Moderator giam sat. Player hanh dong. History ghi lai moi thay doi quan trong.

Pham vi MVP:

- 1 Moderator.
- 5-6 Player.
- Bon role: Villager, Werewolf, Seer va Witch.
- He thong tu random role.
- Player chi xem duoc thong tin bi mat cua minh.
- Night Action Queue tu dong kich hoat role theo thu tu.
- Moderator confirm, reject, skip hoac override khi can.
- Vote dien ra ngoai doi; Moderator nhap ket qua cuoi cung.
- He thong quan ly current state, win condition va game history.

## 2. Danh gia kha thi

MVP co **tinh kha thi cao** vi pham vi da duoc gioi han tot:

- Chi co mot Werewolf, khong can xu ly wolf voting.
- Night action dien ra tuan tu, khong co nhieu action dong thoi phuc tap.
- Khong co chat, matchmaking, ranking, bot hoac spectator.
- Khong can nhap tung la phieu.
- Moderator la diem kiem soat cuoi cung cho cac edge case.

Uoc luong cho mot developer:

- Prototype: 1-2 tuan.
- MVP co the choi thu day du: 3-5 tuan.
- Ban on dinh hon, co kiem thu edge case, reconnect va bao mat: 6-8 tuan.

## 3. Cac chuc nang chinh

### Setup va lobby

- Moderator tao game.
- He thong sinh room code.
- Player tham gia bang ten hien thi.
- Moderator chon role set va game settings.
- He thong random role.
- Player xem role cua minh.
- Ready check truoc khi bat dau.

### Game loop

```text
SETUP
  -> NIGHT
  -> NIGHT RESOLUTION
  -> DAY
  -> DISCUSSION
  -> VOTE
  -> VOTE RESOLUTION
  -> CHECK WIN
  -> NIGHT / GAME OVER
```

### Night Action Queue

Thu tu mac dinh cho game co Witch:

```text
SEER_INSPECT
  -> WEREWOLF_ATTACK
  -> WITCH_ACTION
  -> NIGHT_RESOLUTION
```

Trang thai cua moi queue step:

```text
PENDING
ACTIVE
WAITING_MODERATOR_CONFIRMATION
COMPLETED
SKIPPED
```

Flow cua mot action:

```text
System activates step
  -> Player submits action
  -> System validates action
  -> Step waits for Moderator
  -> Moderator confirms
  -> System completes step
  -> System activates next step
```

### Day phase

- He thong cong bo ket qua cong khai cua dem.
- Nguoi choi thao luan va vote ngoai doi.
- Moderator nhap player bi loai hoac ket qua khong loai ai.
- He thong cap nhat state.
- He thong kiem tra dieu kien thang.

## 4. Nhung phan can thiet ke can than

### 4.1. Game state machine

Khong nen dieu khien game bang cac boolean roi rac. Server can duy tri state machine ro rang:

```text
LOBBY
ROLE_REVEAL
READY_CHECK
NIGHT
NIGHT_RESOLUTION
DAY
VOTE
VOTE_RESOLUTION
GAME_OVER
```

Moi command phai duoc server validate dua tren:

- Phase hien tai.
- Queue step hien tai.
- Actor va role cua actor.
- Trang thai song/chet.
- Ability hoac potion con lai.
- Target co hop le hay khong.
- Version cua game state.

### 4.2. Bao ve hidden information

Day la rui ro ky thuat quan trong nhat.

Khong duoc gui toan bo game state xuong client roi chi an bang UI. Server phai tao view theo nguoi dang xem:

```ts
getGameView(gameId, viewerId)
```

- Player chi nhan public state va private state cua minh.
- Seer chi nhan investigation result cua minh.
- Witch chi nhan Werewolf target khi rule cho phep va dung luot Witch.
- Moderator nhan toan bo state.

### 4.3. Action khac voi result

Khong cap nhat player thanh dead ngay khi Werewolf chon target.

```text
Werewolf attacks A
Witch saves A
Final result: A survives
```

He thong can tach ro:

- Submitted action.
- Moderator decision.
- Night resolution.
- Final result.

### 4.4. Concurrent command va duplicate request

Player co the submit nhieu lan hoac Moderator co the confirm trong khi request khac dang xu ly.

Can co:

- Database transaction.
- Optimistic locking bang `game.version`.
- Idempotency key cho command quan trong.
- Unique constraint de moi queue step chi co mot accepted action.

### 4.5. Reconnect

Player co the refresh, khoa man hinh hoac mat mang. Server phai la source of truth. Khi reconnect, client chi can tai lai view hien tai dung theo quyen.

### 4.6. State va history

Nen luu dong thoi:

- Current state de render nhanh.
- Append-only events de audit va hien thi timeline.

Khong can full event sourcing cho MVP. Cach nay se lam tang do phuc tap ma chua mang lai loi ich tuong xung.

Neu Moderator override state, he thong khong duoc xoa event cu. Thay vao do, tao `MANUAL_OVERRIDE` event voi before state, after state, reason, timestamp va Moderator.

## 5. Cac luat can chot truoc khi code

Tai lieu hien tai con cac quyet dinh mo:

1. Witch co duoc tu cuu khong?
2. Witch co duoc dung ca hai potion trong cung mot dem khong?
3. Witch co duoc poison chinh minh hoac player da chet khong?
4. Witch co duoc biet chinh xac target cua Werewolf khong?
5. Neu Witch bi tan cong trong dem, Witch co con duoc hanh dong khong?
6. Seer va Werewolf co duoc chon chinh minh khong?
7. Role cua nguoi chet co duoc cong khai khong?
8. Vote hoa se khong loai ai, vote lai hay de Moderator quyet dinh?
9. Player roi game co con duoc tinh trong win condition khong?
10. Action bi reject se duoc ghi vao history o muc chi tiet nao?
11. Moderator co duoc sua role sau khi game bat dau khong?
12. Manual override co tu dong chay lai win condition khong?

Default de xuat cho MVP:

```text
Reveal role on death: Yes
Dead player visibility: Public information only
Witch self-heal: Allowed
Use both potions in one night: Not allowed
Vote tie: No elimination
Werewolf win: wolves >= villagers
Manual override: Re-run win condition
Dead role owner: Skip action
```

Data model nen cho phep chuyen cac default nay thanh game settings trong tuong lai.

## 6. Tech stack de xuat

### Application

- TanStack Start.
- TanStack Router.
- TanStack Query.
- React.
- TypeScript.
- PWA, mobile-first.

Mot codebase co the phuc vu Player UI, Moderator UI va backend command API. TanStack Router cung cap typed routing; TanStack Query quan ly query, mutation, invalidation va reconnect. MVP khong can native mobile app.

TanStack Start hien o giai doan v1 Release Candidate: API duoc xem la feature-complete va stable, nhung he sinh thai va muc do battle-tested van chua bang cac framework da on dinh lau nam. Du an chap nhan trade-off nay de co kien truc phu hop hon voi application co nhieu realtime mutation va client state.

### UI

- Tailwind CSS.
- Radix UI hoac shadcn/ui.
- React Hook Form.
- Zod.

### Database

- Supabase PostgreSQL.
- Drizzle ORM.

Supabase duoc dung cho ca luu tru data va Realtime. Supabase Realtime khong phai mot database rieng; no la lop phat su kien dua tren thay doi cua Supabase PostgreSQL. Vi da chon Supabase Realtime, MVP khong can ket hop them Neon.

Drizzle duoc dung tren server de khai bao schema, migration, typed query va transaction. Supabase JS client khong thay the rule engine hoac transactional command handler.

### API

- oRPC.
- Zod cho input/output schema.
- TanStack Query voi `@orpc/tanstack-query`.

oRPC phu hop lam lop API type-safe giua React client va TanStack Start server:

- End-to-end type safety cho command va query.
- Ho tro middleware va typed context de resolve player/moderator session.
- Typed error cho cac loi nhu `UNAUTHORIZED`, `STALE_GAME_VERSION` hoac `INVALID_TARGET`.
- Mount RPC fetch handler trong server route cua TanStack Start.
- Co the sinh OpenAPI neu sau nay can mobile app hoac client ngoai TypeScript.

oRPC khong thay the Supabase Realtime. Hai cong cu co vai tro khac nhau:

```text
oRPC                  = request/response, command, query, validation
Supabase PostgreSQL   = source of truth va persistent storage
Supabase Realtime     = thong bao game da thay doi
```

Moi mutation oRPC van phai goi domain command handler va chay transaction tren server. Client khong duoc update truc tiep cac bang game state.

### Realtime

De xuat dung Supabase Realtime cho MVP.

Flow:

1. Player gui command qua oRPC den TanStack Start server.
2. Server authorize, validate va cap nhat PostgreSQL trong transaction.
3. Realtime gui thong bao game da thay doi.
4. Client invalidate oRPC/TanStack Query va tai lai view dung theo quyen cua minh.

Khong broadcast raw database row chua role hoac hidden action. Realtime chi nen gui invalidation event:

```json
{
  "gameId": "game_123",
  "version": 18,
  "type": "GAME_UPDATED"
}
```

### Authentication

MVP khong can email va password.

- Moderator nhan `moderatorToken` khi tao game.
- Player join bang room code va nhan `playerSessionToken`.
- Token luu trong secure, HTTP-only cookie.
- Database chi luu token hash.

Co the them Supabase Auth hoac Better Auth neu san pham can tai khoan that trong tuong lai.

### Testing

- Vitest cho rule engine va state transitions.
- Playwright cho end-to-end flow voi nhieu browser context.
- Testing Library cho cac component quan trong.

Nhung scenario can duoc kiem thu ky:

- Werewolf attack va Witch heal.
- Werewolf attack va Witch poison.
- Role owner da chet.
- Potion da su dung.
- Moderator reject va redo.
- Skip step.
- Manual override.
- Win condition sau night resolution.
- Win condition sau vote resolution.
- Duplicate submit va concurrent confirm.
- Refresh hoac reconnect giua queue step.

### Deployment va monitoring

- Vercel qua deployment adapter cua TanStack Start/Nitro cho MVP.
- Supabase cho PostgreSQL va Realtime.
- Sentry cho error tracking.
- Axiom hoac OpenTelemetry chi them khi can observability sau hon.

TanStack Start cung cho phep chuyen sang Node.js, Docker, Cloudflare hoac Netlify ve sau ma khong can thay doi domain layer. Ket noi Supabase PostgreSQL tu serverless runtime phai dung connection pooling phu hop.

## 7. Kien truc de xuat

```text
Mobile Browser
    -> oRPC Command / Query
TanStack Start oRPC Handler
    -> Authorization + Rule Validation
    -> Drizzle Transaction
       -> Supabase PostgreSQL
       - Update Current State
       - Append Game Events
    -> Supabase Realtime Invalidation
    -> Clients refetch permission-aware Game View via oRPC
```

Cau truc module goi y:

```text
src/
  game/
    commands/
    rules/
    resolution/
    queue/
    projections/
    permissions/
  app/
    moderator/
    player/
    api/
  db/
    schema/
    queries/
```

Nen trien khai theo modular monolith. MVP khong can microservices, Redis, Kafka hoac mot message broker rieng.

## 8. Data model toi thieu

```text
games
game_players
player_private_states
game_settings
night_queue_steps
game_actions
game_events
player_sessions
```

Mot so yeu cau quan trong:

- `games.version` dung cho optimistic locking.
- `game_events` la append-only.
- `game_actions.status` gom `SUBMITTED`, `CONFIRMED`, `REJECTED`, `CANCELLED`.
- `night_queue_steps.status` phan anh state cua tung step.
- JSONB chi dung cho payload linh hoat.
- Phase, role, team va status nen la cac cot typed ro rang.
- Private state khong duoc truy van chung voi public player list tren player endpoint.

## 9. Thu tu trien khai de xuat

### Giai doan 1: Domain va rule engine

- Chot game settings mac dinh.
- Dinh nghia state machine.
- Dinh nghia command, action va event.
- Viet night resolution va win condition.
- Unit test cac rule quan trong.

### Giai doan 2: Persistence va API

- Tao database schema.
- Tao room va player session.
- Implement transactional command handler.
- Implement permission-aware game view.
- Implement history timeline.

### Giai doan 3: Player va Moderator UI

- Lobby va ready check.
- Role reveal.
- Player action screen.
- Moderator control panel.
- Day vote result.
- Game over va history.

### Giai doan 4: Realtime va hardening

- Realtime invalidation.
- Reconnect va stale state handling.
- Duplicate request protection.
- Multi-client Playwright tests.
- Error tracking va deployment.

## 10. Ket luan

Tech stack phu hop nhat cho MVP:

```text
TanStack Start + TanStack Router + React + TypeScript
Tailwind CSS + Radix UI/shadcn
oRPC + Zod + TanStack Query
Supabase PostgreSQL + Drizzle
Supabase Realtime
Vitest + Playwright
Vercel + Supabase
```

Giai phap nen la mot modular monolith voi transactional command handler, permission-aware projections va append-only history. Kien truc nay du don gian de phat trien MVP nhanh, nhung van dam bao hidden information, auditability va kha nang mo rong them role sau nay.
