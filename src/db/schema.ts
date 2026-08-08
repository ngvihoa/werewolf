import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

export const gameStatus = pgEnum('game_status', [
  'LOBBY',
  'IN_PROGRESS',
  'GAME_OVER',
])

export const gamePhase = pgEnum('game_phase', [
  'SETUP',
  'ROLE_REVEAL',
  'READY_CHECK',
  'NIGHT',
  'NIGHT_RESOLUTION',
  'DAY',
  'VOTE',
  'VOTE_RESOLUTION',
  'GAME_OVER',
])

export const role = pgEnum('role', ['VILLAGER', 'WEREWOLF', 'SEER', 'WITCH'])

export const games = pgTable('games', {
  id: uuid('id').defaultRandom().primaryKey(),
  roomCode: text('room_code').notNull().unique(),
  status: gameStatus('status').notNull().default('LOBBY'),
  phase: gamePhase('phase').notNull().default('SETUP'),
  round: integer('round').notNull().default(0),
  version: integer('version').notNull().default(1),
  settings: jsonb('settings').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const gamePlayers = pgTable('game_players', {
  id: uuid('id').defaultRandom().primaryKey(),
  gameId: uuid('game_id')
    .notNull()
    .references(() => games.id, { onDelete: 'cascade' }),
  displayName: text('display_name').notNull(),
  role: role('role'),
  isModerator: boolean('is_moderator').notNull().default(false),
  isReady: boolean('is_ready').notNull().default(false),
  isAlive: boolean('is_alive').notNull().default(true),
  joinedAt: timestamp('joined_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const gameEvents = pgTable('game_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  gameId: uuid('game_id')
    .notNull()
    .references(() => games.id, { onDelete: 'cascade' }),
  round: integer('round').notNull(),
  phase: gamePhase('phase').notNull(),
  type: text('type').notNull(),
  actorPlayerId: uuid('actor_player_id').references(() => gamePlayers.id),
  targetPlayerId: uuid('target_player_id').references(() => gamePlayers.id),
  payload: jsonb('payload').notNull().default({}),
  createdBy: text('created_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})
