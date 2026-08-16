import z from 'zod'

import { gamePhaseSchema, queueStepSchema, teamSchema } from '../schema'
import {
  eliminationCauseSchema,
  nightResolutionSchema,
  voteResolutionSchema,
  nightActionSchema,
} from '../rules/schema'

// Đây là runtime representation của mọi command mà orchestration hỗ trợ.
// oRPC dùng schema để validate request trước khi command vào rule engine.
export const gameCommandSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('SUBMIT_NIGHT_ACTION'),
    action: nightActionSchema,
  }),
  z.object({ type: z.literal('CONFIRM_STEP') }),
  z.object({ type: z.literal('REJECT_STEP'), reason: z.string().min(1) }),
  z.object({ type: z.literal('SKIP_STEP'), reason: z.string().min(1) }),
  z.object({ type: z.literal('CONFIRM_NIGHT_RESOLUTION') }),
  z.object({ type: z.literal('START_VOTE') }),
  z.object({
    type: z.literal('SUBMIT_VOTE_RESULT'),
    tied: z.boolean(),
    selectedPlayerId: z.string().min(1).nullable(),
  }),
  z.object({ type: z.literal('CONFIRM_VOTE_RESULT') }),
  z.object({ type: z.literal('SKIP_REVOTE') }),
])

// Event cũng là một IO boundary vì được lưu vào PostgreSQL dưới dạng type + JSONB.
// Discriminated union bảo đảm mỗi type chỉ đi cùng payload tương ứng.
export const gameEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('PHASE_CHANGED'),
    from: gamePhaseSchema,
    to: gamePhaseSchema,
  }),
  z.object({
    type: z.literal('QUEUE_STEP_ACTIVATED'),
    step: queueStepSchema,
  }),
  z.object({
    type: z.literal('NIGHT_ACTION_SUBMITTED'),
    action: nightActionSchema,
  }),
  z.object({
    type: z.literal('NIGHT_ACTION_CONFIRMED'),
    action: nightActionSchema,
  }),
  z.object({
    type: z.literal('SEER_RESULT_RECORDED'),
    seerPlayerId: z.string().min(1),
    targetPlayerId: z.string().min(1),
    result: teamSchema,
  }),
  z.object({
    type: z.literal('NIGHT_ACTION_REJECTED'),
    action: nightActionSchema,
    reason: z.string().min(1),
  }),
  z.object({
    type: z.literal('QUEUE_STEP_SKIPPED'),
    step: queueStepSchema,
    reason: z.string().min(1),
  }),
  z.object({
    type: z.literal('NIGHT_RESOLUTION_PREPARED'),
    resolution: nightResolutionSchema,
  }),
  z.object({
    type: z.literal('PLAYER_DIED'),
    playerId: z.string().min(1),
    causes: z.array(eliminationCauseSchema),
  }),
  z.object({
    type: z.literal('VOTE_SUBMITTED'),
    tied: z.boolean(),
    selectedPlayerId: z.string().min(1).nullable(),
  }),
  z.object({
    type: z.literal('VOTE_RESOLVED'),
    resolution: voteResolutionSchema,
  }),
  z.object({
    type: z.literal('REVOTE_SKIPPED'),
  }),
  z.object({ type: z.literal('GAME_ENDED'), winner: teamSchema }),
])
