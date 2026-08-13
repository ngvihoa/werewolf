import { z } from 'zod'

// Đây là runtime representation của mọi command mà orchestration hỗ trợ.
// oRPC dùng schema để validate request trước khi command vào rule engine.
export const gameCommandSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('SUBMIT_NIGHT_ACTION'),
    action: z.discriminatedUnion('type', [
      z.object({
        type: z.literal('SEER_INSPECT'),
        actorId: z.string().min(1),
        targetId: z.string().min(1),
      }),
      z.object({
        type: z.literal('WEREWOLF_ATTACK'),
        actorId: z.string().min(1),
        targetId: z.string().min(1),
      }),
      z.object({
        type: z.literal('WITCH_ACTION'),
        actorId: z.string().min(1),
        heal: z.boolean(),
        poisonTargetId: z.string().min(1).nullable(),
      }),
    ]),
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
])
