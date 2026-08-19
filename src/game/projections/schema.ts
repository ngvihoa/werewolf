import z from 'zod'

import {
  alphaWerewolfResourcesSchema,
  elderResourcesSchema,
  witchResourcesSchema,
  gamePhaseSchema,
  queueStepSchema,
  playerSchema,
  roleSchema,
  teamSchema,
} from '../schema'
import {
  nightResolutionSchema,
  voteResolutionSchema,
  nightActionSchema,
} from '../rules/schema'
import {
  persistedGameEventSchema,
  storeResultSchema,
  eventActorSchema,
} from '../store/schema'

const queueStepStatusSchema = z.enum([
  'PENDING',
  'ACTIVE',
  'WAITING_MODERATOR_CONFIRMATION',
  'COMPLETED',
  'SKIPPED',
])

export const publicPlayerViewSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  alive: z.boolean(),
  ready: z.boolean(),
})

export const playerPrivateViewSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  ready: z.boolean(),
  alive: z.boolean(),
  role: roleSchema.nullable(),
  abilityState: z
    .union([
      witchResourcesSchema,
      alphaWerewolfResourcesSchema,
      elderResourcesSchema,
    ])
    .nullable(),
})

export const publicHistoryEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('GAME_CREATED') }),
  z.object({
    type: z.literal('PLAYER_JOINED'),
    playerId: z.string(),
    displayName: z.string(),
  }),
  z.object({
    type: z.literal('PLAYER_READY_CHANGED'),
    playerId: z.string(),
    ready: z.boolean(),
  }),
  z.object({ type: z.literal('ROLES_ASSIGNED') }),
  z.object({ type: z.literal('GAME_STARTED') }),
  z.object({
    type: z.literal('PHASE_CHANGED'),
    from: gamePhaseSchema,
    to: gamePhaseSchema,
  }),
  z.object({ type: z.literal('PLAYER_DIED'), playerId: z.string() }),
  z.object({ type: z.literal('REVOTE_SKIPPED') }),
  z.object({ type: z.literal('GAME_ENDED'), winner: teamSchema }),
])

export const publicHistoryEntrySchema = z.object({
  sequence: z.number(),
  createdAt: z.string().datetime(),
  event: publicHistoryEventSchema,
})

export const privateHistoryEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('OWN_NIGHT_ACTION_SUBMITTED'),
    action: nightActionSchema,
  }),
  z.object({
    type: z.literal('OWN_NIGHT_ACTION_CONFIRMED'),
    action: nightActionSchema,
    healedTargetId: z.string().nullable(),
  }),
  z.object({
    type: z.literal('OWN_NIGHT_ACTION_REJECTED'),
    action: nightActionSchema,
    reason: z.string(),
  }),
  z.object({
    type: z.literal('SEER_RESULT_RECORDED'),
    targetPlayerId: z.string(),
    result: teamSchema,
  }),
])

export const privateHistoryEntrySchema = z.object({
  sequence: z.number(),
  createdAt: z.string().datetime(),
  event: privateHistoryEventSchema,
})

export const playerGameViewSchema = z.object({
  viewer: z.literal('PLAYER'),
  gameId: z.string(),
  roomCode: z.string(),
  version: z.number(),
  phase: z.union([gamePhaseSchema, z.literal('LOBBY')]),
  round: z.number(),
  winner: teamSchema.nullable(),
  players: z.array(publicPlayerViewSchema),
  me: playerPrivateViewSchema,
  queue: z.array(
    z.object({
      step: queueStepSchema,
      status: queueStepStatusSchema,
    }),
  ),
  turn: z.object({
    canAct: z.boolean(),
    activeStep: queueStepSchema.nullable(),
    werewolfTargetId: z.string().nullable(),
    werewolfAttackEnhanced: z.boolean().nullable(),
    enhancedAttackAvailable: z.boolean().nullable(),
    werewolfTeammates: z.array(publicPlayerViewSchema),
    lastProtectedTargetId: z.string().nullable(),
    hunterShotTargetId: z.string().nullable(),
  }),
  publicHistory: z.array(publicHistoryEntrySchema),
  privateHistory: z.array(privateHistoryEntrySchema),
})

const gameStateSchema = z.object({
  phase: gamePhaseSchema,
  round: z.number(),
  players: z.array(playerSchema),
  queue: z.array(
    z.object({
      step: queueStepSchema,
      status: queueStepStatusSchema,
      skipReason: z.string().nullable(),
    }),
  ),
  pendingNightAction: nightActionSchema.nullable(),
  confirmedNightActions: z.array(nightActionSchema),
  lastProtectedTargetId: z.string().nullable().optional(),
  pendingNightResolution: nightResolutionSchema.nullable(),
  voteAttempt: z.union([z.literal(1), z.literal(2)]),
  pendingVote: z
    .object({
      tied: z.boolean(),
      selectedPlayerId: z.string().nullable(),
    })
    .nullable(),
  pendingVoteResolution: voteResolutionSchema.nullable(),
  pendingHunterShot: z
    .object({
      hunterId: z.string(),
      targetId: z.string().nullable(),
    })
    .nullable()
    .optional(),
  winner: teamSchema.nullable(),
})

const localGameSchema = z.object({
  id: z.string(),
  roomCode: z.string(),
  version: z.number(),
  moderatorName: z.string(),
  lobbyPlayers: z.array(
    z.object({
      id: z.string(),
      displayName: z.string(),
      ready: z.boolean(),
      role: roleSchema.nullable(),
    }),
  ),
  state: gameStateSchema.nullable(),
  history: z.array(
    z.object({
      sequence: z.number(),
      id: z.string(),
      gameId: z.string(),
      actor: eventActorSchema,
      actorPlayerId: z.string().nullable(),
      createdAt: z.string().datetime(),
      event: persistedGameEventSchema,
    }),
  ),
})

export const moderatorGameViewSchema = z.object({
  viewer: z.literal('MODERATOR'),
  game: localGameSchema,
})

export const gameViewSchema = z.discriminatedUnion('viewer', [
  playerGameViewSchema,
  moderatorGameViewSchema,
])

export const getGameViewResultSchema = storeResultSchema(gameViewSchema)
