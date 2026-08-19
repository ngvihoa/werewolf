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
- [ ] Configure CI to run check, test and build.
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
- [ ] Implement hashed Moderator and Player session tokens.
- [ ] Add oRPC authentication and authorization middleware.
- [ ] Implement `createGame`, `joinGame` and `setReady`.
- [ ] Implement `configureGame`, `randomizeRoles` and `startGame`.
- [ ] Implement `submitNightAction`, `confirmStep`, `rejectStep` and `skipStep`.
- [ ] Implement `submitVoteResult` and game-over commands.
- [ ] Implement optimistic locking with `games.version`.
- [ ] Add idempotency protection for mutations.
- [ ] Write current state and history in the same transaction.
- [ ] Add integration tests against a test PostgreSQL database.

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

- [ ] Subscribe each client to its game channel.
- [ ] Broadcast only game ID and state version invalidations.
- [ ] Invalidate the appropriate oRPC/TanStack Query keys.
- [ ] Detect stale versions and refetch before retrying.
- [ ] Handle offline, reconnect and duplicate events.
- [ ] Add heartbeat or presence only if playtesting proves it necessary.
- [ ] Test backgrounding and restoring mobile browsers.

Exit criteria:

- State changes appear on all connected devices promptly.
- Reconnect restores current state without replaying a mutation.
- Realtime payloads contain no role, target or ability information.

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
