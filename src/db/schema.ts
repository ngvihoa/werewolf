import type {
  AlphaWerewolfResources,
  ElderResources,
  HybridWolfResources,
  WitchResources,
} from '#/game/domain'
import type { EventActor, PersistedGameEvent } from '#/game/store/model'
import type { MvpSettings } from '#/game/rules/mvp-settings'
import type { GameState } from '#/game/orchestration/model'

import { MVP_SETTINGS } from '#/game/rules/mvp-settings'
import { sql } from 'drizzle-orm'
import {
  uniqueIndex,
  foreignKey,
  timestamp,
  boolean,
  integer,
  pgTable,
  bigint,
  pgEnum,
  unique,
  check,
  index,
  jsonb,
  text,
  uuid,
} from 'drizzle-orm/pg-core'
import {
  GAME_PHASE_VALUES,
  QUEUE_STEP_VALUES,
  ROLE_VALUES,
} from '#/game/schema'

export const gameStatus = pgEnum('game_status', [
  'LOBBY',
  'IN_PROGRESS',
  'GAME_OVER',
])

export const gamePhase = pgEnum('game_phase', GAME_PHASE_VALUES)

export const role = pgEnum('role', ROLE_VALUES)

export const gameSessionKind = pgEnum('game_session_kind', [
  'MODERATOR',
  'PLAYER',
])

export const queueStep = pgEnum('queue_step', QUEUE_STEP_VALUES)

export const queueStepStatus = pgEnum('queue_step_status', [
  'PENDING',
  'ACTIVE',
  'WAITING_MODERATOR_CONFIRMATION',
  'COMPLETED',
  'SKIPPED',
])

export const actionStatus = pgEnum('action_status', [
  'SUBMITTED',
  'CONFIRMED',
  'REJECTED',
  'CANCELLED',
])

export const commandReceiptStatus = pgEnum('command_receipt_status', [
  'ACCEPTED',
  'REJECTED',
])

export const games = pgTable(
  'games',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    roomCode: text('room_code').notNull().unique(),
    moderatorName: text('moderator_name').notNull(),
    status: gameStatus('status').notNull().default('LOBBY'),
    phase: gamePhase('phase').notNull().default('SETUP'),
    round: integer('round').notNull().default(0),
    version: integer('version').notNull().default(1),
    settings: jsonb('settings')
      .$type<MvpSettings>()
      .notNull()
      .default(MVP_SETTINGS),
    state: jsonb('state').$type<GameState>(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      'games_room_code_format_check',
      sql`${table.roomCode} ~ '^[A-Z0-9]{6}$'`,
    ),
    check(
      'games_moderator_name_not_blank_check',
      sql`length(btrim(${table.moderatorName})) > 0`,
    ),
    check('games_round_nonnegative_check', sql`${table.round} >= 0`),
    check('games_version_positive_check', sql`${table.version} > 0`),
    index('games_status_updated_at_idx').on(table.status, table.updatedAt),
  ],
)

export const gamePlayers = pgTable(
  'game_players',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    gameId: uuid('game_id')
      .notNull()
      .references(() => games.id, { onDelete: 'cascade' }),
    displayName: text('display_name').notNull(),
    role: role('role'),
    abilityState: jsonb('ability_state').$type<
      | WitchResources
      | AlphaWerewolfResources
      | ElderResources
      | HybridWolfResources
    >(),
    isModerator: boolean('is_moderator').notNull().default(false),
    isReady: boolean('is_ready').notNull().default(false),
    isAlive: boolean('is_alive').notNull().default(true),
    joinedAt: timestamp('joined_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique('game_players_game_id_id_unique').on(table.gameId, table.id),
    uniqueIndex('game_players_game_display_name_unique_idx').using(
      'btree',
      table.gameId,
      sql`lower(btrim(${table.displayName}))`,
    ),
    index('game_players_game_id_idx').on(table.gameId),
    check(
      'game_players_display_name_not_blank_check',
      sql`length(btrim(${table.displayName})) > 0`,
    ),
    check(
      'game_players_role_ability_check',
      sql`(${table.role} IN ('WITCH', 'ALPHA_WEREWOLF', 'ELDER', 'HYBRID_WOLF') AND ${table.abilityState} IS NOT NULL) OR (${table.role} NOT IN ('WITCH', 'ALPHA_WEREWOLF', 'ELDER', 'HYBRID_WOLF') AND ${table.abilityState} IS NULL) OR (${table.role} IS NULL AND ${table.abilityState} IS NULL)`,
    ),
  ],
)

export const gameSessions = pgTable(
  'game_sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    gameId: uuid('game_id')
      .notNull()
      .references(() => games.id, { onDelete: 'cascade' }),
    playerId: uuid('player_id'),
    kind: gameSessionKind('kind').notNull(),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique('game_sessions_game_id_id_unique').on(table.gameId, table.id),
    uniqueIndex('game_sessions_token_hash_unique_idx').on(table.tokenHash),
    index('game_sessions_game_id_idx').on(table.gameId),
    index('game_sessions_active_expiry_idx')
      .on(table.expiresAt)
      .where(sql`${table.revokedAt} IS NULL`),
    foreignKey({
      name: 'game_sessions_game_player_fk',
      columns: [table.gameId, table.playerId],
      foreignColumns: [gamePlayers.gameId, gamePlayers.id],
    }).onDelete('cascade'),
    check(
      'game_sessions_kind_player_check',
      sql`(${table.kind} = 'MODERATOR' AND ${table.playerId} IS NULL) OR (${table.kind} = 'PLAYER' AND ${table.playerId} IS NOT NULL)`,
    ),
    check(
      'game_sessions_token_hash_format_check',
      sql`${table.tokenHash} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      'game_sessions_expiry_check',
      sql`${table.expiresAt} > ${table.createdAt}`,
    ),
  ],
)

export const gameQueueSteps = pgTable(
  'game_queue_steps',
  {
    id: bigint('id', { mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    gameId: uuid('game_id')
      .notNull()
      .references(() => games.id, { onDelete: 'cascade' }),
    round: integer('round').notNull(),
    position: integer('position').notNull(),
    step: queueStep('step').notNull(),
    status: queueStepStatus('status').notNull().default('PENDING'),
    skipReason: text('skip_reason'),
    activatedAt: timestamp('activated_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique('game_queue_steps_game_id_id_unique').on(table.gameId, table.id),
    unique('game_queue_steps_game_id_id_step_unique').on(
      table.gameId,
      table.id,
      table.step,
    ),
    unique('game_queue_steps_game_round_position_unique').on(
      table.gameId,
      table.round,
      table.position,
    ),
    unique('game_queue_steps_game_round_step_unique').on(
      table.gameId,
      table.round,
      table.step,
    ),
    index('game_queue_steps_game_status_idx').on(table.gameId, table.status),
    check('game_queue_steps_round_positive_check', sql`${table.round} > 0`),
    check(
      'game_queue_steps_position_positive_check',
      sql`${table.position} > 0`,
    ),
    check(
      'game_queue_steps_skip_reason_check',
      sql`(${table.status} = 'SKIPPED' AND length(btrim(${table.skipReason})) > 0) OR (${table.status} <> 'SKIPPED' AND ${table.skipReason} IS NULL)`,
    ),
    check(
      'game_queue_steps_lifecycle_check',
      sql`(${table.status} = 'PENDING' AND ${table.activatedAt} IS NULL AND ${table.completedAt} IS NULL) OR (${table.status} IN ('ACTIVE', 'WAITING_MODERATOR_CONFIRMATION') AND ${table.activatedAt} IS NOT NULL AND ${table.completedAt} IS NULL) OR (${table.status} IN ('COMPLETED', 'SKIPPED') AND ${table.activatedAt} IS NOT NULL AND ${table.completedAt} IS NOT NULL)`,
    ),
  ],
)

export const gameActions = pgTable(
  'game_actions',
  {
    id: bigint('id', { mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    gameId: uuid('game_id')
      .notNull()
      .references(() => games.id, { onDelete: 'cascade' }),
    queueStepId: bigint('queue_step_id', { mode: 'number' }).notNull(),
    actorPlayerId: uuid('actor_player_id').notNull(),
    attempt: integer('attempt').notNull(),
    type: queueStep('type').notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
    status: actionStatus('status').notNull().default('SUBMITTED'),
    rejectionReason: text('rejection_reason'),
    decidedBySessionId: uuid('decided_by_session_id'),
    submittedAt: timestamp('submitted_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    decidedAt: timestamp('decided_at', { withTimezone: true }),
  },
  (table) => [
    unique('game_actions_queue_step_attempt_unique').on(
      table.queueStepId,
      table.attempt,
    ),
    uniqueIndex('game_actions_one_open_per_queue_step_idx')
      .on(table.queueStepId)
      .where(sql`${table.status} IN ('SUBMITTED', 'CONFIRMED')`),
    index('game_actions_game_queue_attempt_idx').on(
      table.gameId,
      table.queueStepId,
      table.attempt,
    ),
    index('game_actions_actor_player_id_idx').on(table.actorPlayerId),
    index('game_actions_decided_by_session_id_idx').on(
      table.decidedBySessionId,
    ),
    foreignKey({
      name: 'game_actions_game_queue_step_fk',
      columns: [table.gameId, table.queueStepId, table.type],
      foreignColumns: [
        gameQueueSteps.gameId,
        gameQueueSteps.id,
        gameQueueSteps.step,
      ],
    }).onDelete('cascade'),
    foreignKey({
      name: 'game_actions_game_actor_player_fk',
      columns: [table.gameId, table.actorPlayerId],
      foreignColumns: [gamePlayers.gameId, gamePlayers.id],
    }),
    foreignKey({
      name: 'game_actions_game_decider_session_fk',
      columns: [table.gameId, table.decidedBySessionId],
      foreignColumns: [gameSessions.gameId, gameSessions.id],
    }),
    check('game_actions_attempt_positive_check', sql`${table.attempt} > 0`),
    check(
      'game_actions_decision_check',
      sql`(${table.status} = 'SUBMITTED' AND ${table.decidedAt} IS NULL AND ${table.decidedBySessionId} IS NULL AND ${table.rejectionReason} IS NULL) OR (${table.status} = 'CONFIRMED' AND ${table.decidedAt} IS NOT NULL AND ${table.decidedBySessionId} IS NOT NULL AND ${table.rejectionReason} IS NULL) OR (${table.status} IN ('REJECTED', 'CANCELLED') AND ${table.decidedAt} IS NOT NULL AND ${table.decidedBySessionId} IS NOT NULL AND length(btrim(${table.rejectionReason})) > 0)`,
    ),
  ],
)

export const commandReceipts = pgTable(
  'command_receipts',
  {
    id: bigint('id', { mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    gameId: uuid('game_id')
      .notNull()
      .references(() => games.id, { onDelete: 'cascade' }),
    sessionId: uuid('session_id').notNull(),
    idempotencyKey: text('idempotency_key').notNull(),
    requestHash: text('request_hash').notNull(),
    commandType: text('command_type').notNull(),
    expectedVersion: integer('expected_version').notNull(),
    resultingVersion: integer('resulting_version').notNull(),
    status: commandReceiptStatus('status').notNull(),
    response: jsonb('response').$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique('command_receipts_session_idempotency_key_unique').on(
      table.sessionId,
      table.idempotencyKey,
    ),
    index('command_receipts_game_created_at_idx').on(
      table.gameId,
      table.createdAt,
    ),
    foreignKey({
      name: 'command_receipts_game_session_fk',
      columns: [table.gameId, table.sessionId],
      foreignColumns: [gameSessions.gameId, gameSessions.id],
    }).onDelete('cascade'),
    check(
      'command_receipts_idempotency_key_not_blank_check',
      sql`length(btrim(${table.idempotencyKey})) > 0`,
    ),
    check(
      'command_receipts_request_hash_format_check',
      sql`${table.requestHash} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      'command_receipts_expected_version_positive_check',
      sql`${table.expectedVersion} > 0`,
    ),
    check(
      'command_receipts_resulting_version_positive_check',
      sql`${table.resultingVersion} > 0`,
    ),
  ],
)

export const gameEvents = pgTable(
  'game_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    gameId: uuid('game_id')
      .notNull()
      .references(() => games.id, { onDelete: 'cascade' }),
    sequence: integer('sequence').notNull(),
    round: integer('round').notNull(),
    phase: gamePhase('phase').notNull(),
    // `$type` chỉ tăng type-safety cho Drizzle; Zod vẫn validate type + payload runtime.
    type: text('type').$type<PersistedGameEvent['type']>().notNull(),
    actorPlayerId: uuid('actor_player_id'),
    targetPlayerId: uuid('target_player_id'),
    payload: jsonb('payload')
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    // Database dùng text + CHECK; `$type` chỉ giúp Drizzle giữ đúng domain type.
    createdBy: text('created_by').$type<EventActor>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique('game_events_game_sequence_unique').on(table.gameId, table.sequence),
    index('game_events_game_created_at_idx').on(table.gameId, table.createdAt),
    index('game_events_game_round_phase_idx').on(
      table.gameId,
      table.round,
      table.phase,
    ),
    index('game_events_actor_player_id_idx').on(table.actorPlayerId),
    index('game_events_target_player_id_idx').on(table.targetPlayerId),
    index('game_events_game_type_idx').on(table.gameId, table.type),
    foreignKey({
      name: 'game_events_game_actor_player_fk',
      columns: [table.gameId, table.actorPlayerId],
      foreignColumns: [gamePlayers.gameId, gamePlayers.id],
    }),
    foreignKey({
      name: 'game_events_game_target_player_fk',
      columns: [table.gameId, table.targetPlayerId],
      foreignColumns: [gamePlayers.gameId, gamePlayers.id],
    }),
    check('game_events_sequence_positive_check', sql`${table.sequence} > 0`),
    check('game_events_round_nonnegative_check', sql`${table.round} >= 0`),
    check(
      'game_events_created_by_check',
      sql`${table.createdBy} IN ('SYSTEM', 'MODERATOR', 'PLAYER')`,
    ),
  ],
)
