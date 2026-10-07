# Werewolf Moderator Assistant - Delivery Roadmap

## Working principles

- Server is the source of truth.
- Every command is authorized and validated on the server.
- Public and private game views are projected separately.
- State changes and append-only history are written in one transaction.
- Supabase Realtime sends invalidation signals, not hidden game data.
- A phase is complete only when its acceptance criteria and automated tests pass.

## Phase 0 - Foundation

Goal: establish a deployable, typed and testable application base.

- [x] Scaffold TanStack Start with React, TypeScript and Tailwind CSS.
- [x] Configure TanStack Router and Query.
- [x] Mount an oRPC endpoint with a health procedure.
- [x] Configure Drizzle and the Supabase PostgreSQL connection.
- [x] Add initial game, player and event tables.
- [x] Add a lazy Supabase browser client for Realtime.
- [x] Add environment validation and `.env.example`.
- [x] Add Vitest and the first domain rule test.
- [x] Create a Supabase project and populate local environment values.
- [x] Generate and apply the initial database migration.
- [x] Configure CI to run check, test and build.
- [ ] Deploy a preview environment.

Exit criteria:

- Application builds and starts locally.
- oRPC health endpoint responds successfully.
- Tests and static checks pass.
- Initial migration runs against the development database.

## Phase 1 - Domain model and rule engine

Goal: encode deterministic game rules independently from UI and persistence.

- [x] Finalize default MVP settings from the open rule decisions.
- [x] Define game phase and queue-step transition tables.
- [x] Define typed commands, actions, decisions, results and events.
- [x] Implement role composition validation for five through fifteen players.
- [x] Add the Protector role with self-protection and consecutive-night limits.
- [x] Add the Hunter role with a nightly mark and a vote-triggered final shot.
- [x] Add the Elder role with one survival against a lethal Werewolf attack.
- [x] Add the neutral Fool role with a vote-elimination solo victory.
- [x] Add the neutral Piper role with one charm per night and a solo victory.
- [x] Add Cupid, private lovers, heartbreak deaths, and mixed-lover victory.
- [x] Add Courtesan movement and Werewolf-visit resolution rules.
- [x] Add Hybrid Wolf conversion and dynamic Village/Werewolf alignment.
- [x] Add shared Werewolf teammate and target visibility.
- [x] Add Alpha Werewolf for 13–15 players with one enhanced attack per game.
- [x] Implement secure role randomization.
- [x] Implement target validation per role and queue step.
- [x] Implement Witch potion rules and ability consumption.
- [x] Implement night resolution without mutating state during action submission.
- [x] Implement vote resolution and tie behavior.
- [x] Complete win-condition rules.
- [ ] Add table-driven unit tests for every transition and edge case.

Exit criteria:

- Rule engine is pure and does not import UI, database or Supabase code.
- Invalid transitions return typed domain errors.
- Core rule coverage includes every MVP role and documented edge case.

## Phase 2 - Persistence and command API

Goal: expose secure transactional game operations.

- [x] Complete schema for settings, sessions, queue steps and actions.
- [x] Create migration and indexes.
- [x] Implement hashed Moderator and Player session tokens.
- [x] Add oRPC session-token guard middleware and server-side command authorization.
- [x] Implement `createGame`, `joinGame` and `setReady`.
- [x] Implement `assignRoles` (configure and randomize role composition), `startGame` and `rematch`.
- [x] Implement night, vote and hunter-shot commands through the typed `executeGameCommand` endpoint.
- [x] Implement optimistic locking with `games.version`.
- [x] Add idempotency protection for mutations.
- [x] Write current state and history in the same transaction.
- [x] Add integration tests against a test PostgreSQL database.

Exit criteria:

- Clients cannot directly mutate game tables.
- Duplicate and stale commands cannot corrupt game state.
- Every accepted, rejected, skipped or overridden action is auditable.

## Phase 3 - Permission-aware projections

Goal: guarantee that hidden information never reaches an unauthorized client.

- [x] Define public Player view.
- [x] Define private owner view.
- [x] Define complete Moderator view.
- [x] Define Seer investigation-result visibility.
- [x] Define Witch context visibility.
- [x] Implement `getGameView` based on the current session.
- [ ] Implement filtered Moderator history queries.
- [x] Add negative tests proving that roles and actions do not leak.

Exit criteria:

- Player responses contain no hidden state belonging to another player.
- Dead-player visibility follows game settings.
- Moderator can inspect the complete state and history.

## Phase 4 - Lobby and setup UI

Goal: allow a group to create and start a game from mobile devices.

- [x] Build create-game screen for Moderator.
- [x] Build room-code join flow for Player.
- [x] Build Moderator lobby and participant list.
- [ ] Build role-set and settings form.
- [x] Build private role reveal screen.
- [x] Build ready check.
- [x] Add loading, error, empty and reconnect states.
- [ ] Verify mobile, tablet and desktop layouts.

Exit criteria:

- Six players can join one room and receive private roles.
- Moderator can start only a valid and ready game.
- Refreshing a browser restores the correct session and view.

## Phase 5 - Core game UI

Goal: complete the playable night/day loop.

- [x] Build Player status and public player list.
- [x] Build waiting-for-turn state.
- [x] Build Seer target selection and private result.
- [x] Build Werewolf target selection.
- [x] Build shared multi-Werewolf action context.
- [x] Build Protector target selection.
- [x] Build Hunter mark, final-shot selection and Moderator confirmation.
- [x] Build Witch heal, poison and skip controls.
- [x] Build Moderator queue control panel.
- [x] Build confirm, reject, redo and skip flows.
- [x] Build night-resolution confirmation.
- [x] Build day discussion and vote-result input.
- [x] Build game-over view.
- [x] Prevent dead players from acting.

Exit criteria:

- A five-through-fifteen-player game can run from lobby to game over.
- UI always reflects the active phase and current player's permissions.
- No player needs to refresh manually to advance the game.

## Phase 6 - Realtime and recovery

Goal: keep all devices synchronized without exposing private data.

Implementation plan:

1. Define the Realtime boundary.
   - [x] Add a closed schema for an invalidation payload containing only
         `{ gameId, version }`.
   - [x] Use one channel per opaque game ID; never publish room codes, roles,
         targets, actions, ability state, sessions or projected game views.
   - [x] Do not subscribe clients directly to `games`, `game_events` or other
         PostgreSQL tables because the application uses its own session tokens
         rather than Supabase Auth and those rows contain hidden information.

2. Publish invalidations after successful commits.
   - [x] Add one server-side publisher shared by every accepted mutation.
   - [x] Publish only after the state, events and idempotency receipt commit.
   - [x] Treat publication as best-effort: a Realtime failure must not roll back
         or report failure for an already committed game command.
   - [x] Log publication failures without including private payloads or session
         tokens.

3. Subscribe and refetch on the client.
   - [x] Subscribe each lobby and game client to its current game channel.
   - [x] Validate every incoming payload and ignore a version that is not newer
         than the currently rendered version.
   - [x] Invalidate the existing `getGameView` TanStack Query key instead of
         applying Realtime data directly to the cache.
   - [x] Keep `getGameView(sessionToken)` as the only source of the
         permission-aware Moderator or Player projection.
   - [x] Unsubscribe when leaving a room, changing game or unmounting the view.

4. Preserve recovery without Realtime.
   - [x] Refetch immediately after the local client completes a mutation.
   - [x] Retain fallback polling at 3–5 seconds while waiting for an active step
         and 10–15 seconds while the game is stable.
   - [x] Pause polling for hidden tabs and refetch immediately when a tab becomes
         visible again.
   - [x] On socket reconnect, refetch the current view rather than replaying
         missed events.
   - [x] Continue using stale-version handling and the original idempotency key
         when a mutation is retried.

5. Verify privacy and multi-device behavior.
   - [x] Unit-test payload validation, duplicate/old-version suppression and
         query invalidation.
   - [ ] Add multi-context Playwright coverage proving one Moderator mutation
         refreshes all Player views without manual reload.
   - [ ] Verify that reconnecting, backgrounding a mobile browser and receiving
         duplicate or out-of-order events converge on the latest version.
   - [x] Verify that Realtime payloads never contain private role/action fields,
         including Seer, Witch, Lovers, Hybrid Wolf and White Wolf state. The
         publisher only sends data parsed by the closed `{ gameId, version }`
         schema, and unit tests prove extra fields are refused.
   - [ ] Simulate Realtime being unavailable and confirm fallback polling still
         completes a game.

Deferred until playtesting demonstrates a need:

- [ ] Add heartbeat or presence indicators.
- [ ] Replace the invalidation-only channel with authenticated private channels
      or minted Realtime JWTs. The initial implementation must not introduce
      Supabase Auth solely for Realtime.

Exit criteria:

- State changes appear on all connected devices promptly.
- Reconnect restores current state without replaying a mutation.
- Realtime payloads contain no role, target or ability information.
- A Realtime outage degrades to polling without blocking mutations or gameplay.
- One committed version causes at most one immediate refetch per connected
  client, excluding the slower fallback poll.

## Phase 7 - Moderator overrides and history

Goal: make exceptional decisions explicit and auditable.

- [ ] Build timeline grouped by round and phase.
- [ ] Add filters for player and event type.
- [ ] Implement alive/dead override.
- [ ] Implement ability restore/consume override.
- [ ] Implement target correction and action cancellation.
- [ ] Implement repeat-step and manual game-end controls.
- [ ] Require and persist an override reason.
- [ ] Re-run win condition after relevant overrides.

Exit criteria:

- Moderator can recover from every documented MVP edge case.
- Overrides never silently rewrite or delete history.

## Phase 8 - Quality and release

Goal: make the MVP reliable enough for repeated real-world playtests.

- [ ] Add Playwright multi-context tests for Moderator and Players.
- [ ] Cover five-player and six-player complete games.
- [ ] Test malicious and unauthorized requests.
- [ ] Add structured server logs and Sentry.
- [ ] Add database backup and migration procedure.
- [ ] Add rate limits for room creation, joining and mutation endpoints.
- [ ] Add room/session expiry cleanup.
- [ ] Audit accessibility and mobile interaction sizes.
- [ ] Run moderated playtests and record rule ambiguities.
- [ ] Freeze MVP defaults and publish release notes.

Exit criteria:

- CI passes static checks, unit tests, integration tests and E2E tests.
- No known hidden-information leak exists.
- At least three complete playtests finish without manual database repair.

## Phase 9 - Bot moderator mode (chế độ không quản trò)

Goal: let a group play without a human moderator — the system automates every
moderator confirmation and players vote on their own devices. Detailed plan:
`docs/bot-moderator-mode.md`. Before coding, finalize decisions R20–R24 in
`docs/rules/08-mvp-rule-decisions.md`.

Can start after Phase 6; independent of Phase 7 (moderator overrides do not
apply to the new `SELF` mode).

- [x] T1 Domain + SELF game mode in creation flow (creator becomes a player)
- [x] T2 Bot actor: auto-confirm night loop via existing command surface
- [x] T3 In-device voting with bot tally (R14 tie behavior)
- [x] T4 Discussion consent + minimum timer to open the vote
- [x] T5 Lazy timers + `game.tick` (AFK auto-skip / abstain)
- [x] T6 Player leaving mid-game in SELF mode
- [x] T7 Game over + rematch in SELF mode
- [x] T8 Sync rule docs (02/03/04/05/07), 08 decisions, revamp-ui-ux.md
- [x] T9 Multi-context e2e for a full SELF game + MODERATED regression

Exit criteria:

- A five-to-six-player SELF game runs from lobby to game over with zero
  moderator actions.
- An AFK player never deadlocks the game (timeout skip/abstain per R22).
- MODERATED mode behavior is unchanged (regression suite green).
- No new hidden-information leak; existing negative tests stay green.

## Phase 10 - Revamp MODERATED: quản trò điều phối (moderator table)

Goal: on a physical table, the moderator runs the whole night from their own
screen while players only see their secret role on their devices. Detailed
plan: `docs/revamp-moderator-mode.md` (decisions M1–M13, merged into
R25–R31 in `docs/rules/08-mvp-rule-decisions.md`); task list:
`docs/tasks-2026-10-04.md`. SELF mode must stay untouched.

- [x] T1 Command `UNDO_STEP` + undo handler restoring consumed resources (R27)
- [x] T2 Command `MODERATOR_OVERRIDE_MARK_DEAD` (R28)
- [x] T3 `enteredBy` audit on night actions and hunter shot (R25)
- [x] T4 Authorization per mode: proxy input as the main path, player blocked from night actions (R25)
- [x] T5 Bot allowlist per mode: auto-confirm + tally, human gates at announcement milestones (R26)
- [x] T6 Private-history parity + `enteredBy` labels (R30)
- [x] T7 Minimal player view + vote candidate counts + moderator monitor (R29, R30)
- [x] T8 Moderator night-action proxy form + night relay (R25)
- [x] T9 Undo + override UI with reason dialogs (R27, R28)
- [x] T10 Vote: start button, live monitor, alert-only timeout, manual-tally fallback (R29, R31)
- [x] T11 New route `/table` + two-way guards (R30)
- [x] T12 `/table` player screen: static night, private notebook (R30)
- [x] T13 Dedicated e2e scenario `e2e/moderator-table.spec.ts` + multiplayer migration to proxy night
- [x] T14 Dedicated capture run → `captures/` (per conventions in `captures/README.md`)
- [x] T15 Merge decisions into rule docs (04/05/07/08 R25–R31) + this roadmap

Exit criteria:

- An 8-player MODERATED game runs from lobby to night 2 with proxy input,
  undo, override, device voting and manual-tally fallback (e2e green).
- Night screens of players never reveal queue progress or pacing (M13).
- SELF mode behavior unchanged (regression suite green).

## Phase 11 - Sói họp chọn nạn nhân (wolf pack vote)

Goal: let living wolves agree on ONE victim per night instead of
first-submit-wins (SELF) hoặc một lựa chọn đơn của quản trò (MODERATED).

Hiện trạng (đã check 2026-10-07): `WEREWOLF_ATTACK` là single-target,
single-actor. MODERATED có picker "Ai cắn đêm nay?" nhưng chỉ định danh
người cắn (attribution), quản trò vẫn chọn MỘT mục tiêu cho cả đàn. SELF:
mọi Sói sống đều thấy form, ai submit trước người đó thắng (bot confirm
ngay) — không có thảo luận, không xem trước lựa chọn của đồng đội, không
bỏ phiếu.

- [ ] Chốt thiết kế: per-wolf submission (analog `voteSubmissions`), quy tắc
      đồng thuận (unanimous / majority / first-locked), hiển thị trạng thái
      ballot cho đồng đội, quy tắc xử lý hòa.
- [ ] Model + orchestrator: `pendingNightAction` đa-submission, step hoàn
      tất khi đàn đạt đồng thuận, tương thích UNDO_STEP (R27).
- [ ] Projections: trạng thái ballot của đàn (ai đã chọn, còn thiếu) — vẫn
      không lộ mục tiêu cho người ngoài phòng.
- [ ] UI SELF: `NightActionForm` hiện phiếu của đàn, khóa sau khi chốt.
- [ ] UI MODERATED: proxy form tổng hợp phiếu từng Sói (proxy vẫn là đường
      chính theo R25).
- [ ] Bot: auto-confirm khi đàn đạt đồng thuận, timeout theo R22 (thiếu
      phiếu tính theo chính sách đã chốt).
- [ ] e2e: kịch bản đàn 2 Sói lựa chọn khác nhau → đạt đồng thuận qua ballot.

Exit criteria:

- Đàn nhiều Sói không thể tự động cắn sai mục tiêu vì ai đó bấm nhanh.
- Người ngoài phòng vẫn không thấy bất kỳ thông tin ballot nào.
- MODERATED và SELF cùng hành xử theo một cơ chế đã chốt.

## Phase 12 - Realtime v2: private channel + sync không reload

Goal: giảm phụ thuộc polling và đưa kênh realtime sang mô hình xác thực;
thiết bị cập nhật mà không cần reload.

Hiện trạng (đã check 2026-10-07): có realtime qua **Supabase Realtime
broadcast (WebSocket của Supabase)** nhưng CHỈ mang tín hiệu invalidation
`{ gameId, version }`; client refetch toàn bộ view qua oRPC, kèm polling
dự phòng 4s/12s. Không có custom WebSocket server và không push state —
đây là quyết định bảo mật có chủ đích (không dữ liệu ẩn trên kênh public).

- [ ] Private/authenticated channel hoặc Realtime JWT minted per session,
      thay kênh public hiện tại (gói deferred của Phase 6).
- [ ] e2e multi-context: mutation của Quản trò cập nhật màn mọi Player mà
      KHÔNG reload (điều kiện chấp nhận Phase 6 còn bỏ trống).
- [ ] Kiểm chứng mobile background/reconnect/duplicate events hội tụ về
      version mới nhất.
- [ ] Mô phỏng Realtime unavailable → polling fallback hoàn thành một ván.
- [ ] Đánh giá push state an toàn theo viewer sau khi có kênh private; nếu
      không đáng làm thì giữ invalidation-only và ghi quyết định lại.

Exit criteria:

- Không còn polling định kỳ khi kênh realtime khỏe (chỉ refetch khi có
  invalidation hoặc tương tác).
- Một mutation duy nhất khiến mọi thiết bị đồng bộ trong dưới 1 giây.
- Kênh không thể nghe lén bởi client không có session trong phòng.

## Phase 13 - SEO và định vị lại Moonveil

Goal: định vị Moonveil là nền tảng chơi Ma sói trọn vẹn — chơi tại bàn có
quản trò HOẶC tự chơi online không quản trò — và dựng nền SEO còn thiếu
gần như toàn bộ.

Hiện trạng (đã check 2026-10-07): chỉ `/rules` có `head()`; landing không
có head, H1 "Điều phối Ma Sói mà không đánh mất cuộc chơi", copy định vị
"Trợ lý quản trò" (không nhắc chế độ tự chơi online). Thiếu: meta
description, OG/Twitter card + ảnh OG, canonical, robots.txt, sitemap.xml,
JSON-LD, `html lang`, title theo route. Game/app routes chưa noindex.

- [ ] Chốt bản copy định vị mới (2 chế độ chơi) — cập nhật H1/tagline/
      feature list landing + title/description gốc.
- [ ] `head()` đầy đủ cho landing, `/rules`, 404; noindex cho `/play`,
      `/join/$code`, `/game`, `/lobby`, `/table`.
- [ ] `html lang="vi"`, meta description, canonical URL.
- [ ] Open Graph + Twitter card + ảnh OG 1200×630.
- [ ] robots.txt + sitemap.xml cho các route public tĩnh.
- [ ] JSON-LD: WebApplication/Game + FAQ (từ trang luật chơi).
- [ ] Kiểm tra Lighthouse SEO ≥ 90 trên landing.

Exit criteria:

- Landing nói đúng 2 chế độ chơi của sản phẩm.
- Chia sẻ link social hiện đầy đủ card + ảnh.
- Lighthouse SEO ≥ 90 và không có cảnh báo missing meta.
