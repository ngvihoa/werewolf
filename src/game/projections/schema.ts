import z from 'zod'

import { enteredBySchema } from '../orchestration/schema'
import {
  alphaWerewolfResourcesSchema,
  hybridWolfResourcesSchema,
  whiteWolfResourcesSchema,
  elderResourcesSchema,
  witchResourcesSchema,
  gamePhaseSchema,
  queueStepSchema,
  gameModeSchema,
  playerSchema,
  winnerSchema,
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
  // R23: player đã rời game giữa ván (SELF) — hiển thị "đã rời".
  left: z.boolean().optional(),
})

/**
 * Dùng riêng cho danh sách người chơi trong góc nhìn player: khi ván kết
 * thúc (GAME_OVER) projection mở lộ vai trò của mọi người. Optional để client
 * mới đọc được server cũ (trường có thể vắng) và ngược lại.
 */
export const revealedPlayerViewSchema = publicPlayerViewSchema.extend({
  role: roleSchema.nullable().optional(),
})

export const playerPrivateViewSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  ready: z.boolean(),
  alive: z.boolean(),
  role: roleSchema.nullable(),
  // R23 (SELF): chính viewer đã rời ván — UI hiện trạng "đã rời" thay form.
  left: z.boolean().optional(),
  abilityState: z
    .union([
      witchResourcesSchema,
      alphaWerewolfResourcesSchema,
      whiteWolfResourcesSchema,
      elderResourcesSchema,
      hybridWolfResourcesSchema,
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
  z.object({ type: z.literal('PLAYER_LEFT_GAME'), playerId: z.string() }),
  z.object({ type: z.literal('ROLES_ASSIGNED') }),
  z.object({ type: z.literal('GAME_STARTED') }),
  z.object({
    type: z.literal('PHASE_CHANGED'),
    from: gamePhaseSchema,
    to: gamePhaseSchema,
  }),
  z.object({ type: z.literal('PLAYER_DIED'), playerId: z.string() }),
  z.object({ type: z.literal('REVOTE_SKIPPED') }),
  z.object({ type: z.literal('GAME_ENDED'), winner: winnerSchema }),
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
  // Revamp MODERATED (M9): bù trừ khi quản trò hoàn tác — entry riêng của
  // action bị hoàn tác bị xóa khỏi history rồi thay bằng mục này.
  z.object({
    type: z.literal('OWN_NIGHT_ACTION_UNDONE'),
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
  // Revamp MODERATED (M4): nguồn nhập của action — nhãn "do quản trò nhập"
  // trên thiết bị. Optional cho event cũ.
  enteredBy: enteredBySchema.optional(),
  event: privateHistoryEventSchema,
})

export const playerGameViewSchema = z.object({
  viewer: z.literal('PLAYER'),
  gameId: z.string(),
  roomCode: z.string(),
  version: z.number(),
  // Optional để client/server lệch phiên không vỡ output validation
  // (trường mới thêm theo bẫy đã ghi trong AGENTS.md).
  gameMode: gameModeSchema.optional(),
  isHost: z.boolean().optional(),
  phase: z.union([gamePhaseSchema, z.literal('LOBBY')]),
  round: z.number(),
  winner: winnerSchema.nullable(),
  players: z.array(revealedPlayerViewSchema),
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
    charmedPlayerIds: z.array(z.string()),
    lastCourtesanTargetId: z.string().nullable(),
  }),
  isCharmed: z.boolean(),
  lover: publicPlayerViewSchema.nullable(),
  // R20/M6: trạng thái bỏ phiếu trên thiết bị. Optional cho client/server
  // lệch phiên. SELF giữ R20 (chỉ tổng); MODERATED có candidateCounts —
  // counts theo ứng viên ban ngày, KHÔNG bao giờ lộ ai bỏ ai.
  vote: z
    .object({
      canVote: z.boolean(),
      hasVoted: z.boolean(),
      myTargetId: z.string().nullable(),
      votedCount: z.number().int(),
      aliveCount: z.number().int(),
      voteAttempt: z.union([z.literal(1), z.literal(2)]),
      // M6 (MODERATED): ứng viên id → số phiếu. Phiếu trắng = votedCount trừ
      // tổng counts; breakdown từng người bỏ không bao giờ có ở đây.
      candidateCounts: z.record(z.string(), z.number().int()).optional(),
    })
    .optional(),
  // SELF mode (R21): trạng thái consent kết thúc thảo luận ở pha DAY.
  discussion: z
    .object({
      canConsent: z.boolean(),
      hasConsented: z.boolean(),
      consentCount: z.number().int(),
      aliveCount: z.number().int(),
      consentNeeded: z.number().int(),
    })
    .optional(),
  // SELF mode (R22): ngữ cảnh đang chờ + mốc hết giờ (ISO, giờ server).
  // DISCUSSION = mốc thảo luận tối thiểu của pha Day (R21).
  waiting: z
    .object({
      kind: z.enum(['STEP', 'VOTE', 'HUNTER_SHOT', 'DISCUSSION']),
      key: z.string(),
      deadlineAt: z.string(),
    })
    .optional(),
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
  charmedPlayerIds: z.array(z.string()).optional(),
  loverIds: z.tuple([z.string(), z.string()]).nullable().optional(),
  lastCourtesanTargetId: z.string().nullable().optional(),
  lastProtectedTargetId: z.string().nullable().optional(),
  pendingNightResolution: nightResolutionSchema.nullable(),
  voteAttempt: z.union([z.literal(1), z.literal(2)]),
  // Luật hòa biểu quyết (R14) chọn khi tạo phòng — optional cho state cũ.
  voteTie: z.enum(['REVOTE_ONCE', 'NO_REVOTE']).optional(),
  voteSubmissions: z.record(z.string(), z.string().nullable()).optional(),
  voteConsentIds: z.array(z.string()).optional(),
  discussionMinEndsAt: z.string().nullable().optional(),
  waitingKey: z.string().nullable().optional(),
  waitingDeadlineAt: z.string().nullable().optional(),
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
  winner: winnerSchema.nullable(),
})

const localGameSchema = z.object({
  id: z.string(),
  roomCode: z.string(),
  version: z.number(),
  moderatorName: z.string(),
  mode: gameModeSchema.optional(),
  hostPlayerId: z.string().nullable().optional(),
  lobbyPlayers: z.array(
    z.object({
      id: z.string(),
      displayName: z.string(),
      ready: z.boolean(),
      role: roleSchema.nullable(),
      // R23 (SELF): chỉ xuất hiện khi player đã rời — optional chống lệch phiên.
      left: z.boolean().optional(),
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
