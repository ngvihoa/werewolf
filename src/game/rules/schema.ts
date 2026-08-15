import { z } from 'zod'

// NightAction là dữ liệu đi qua command và event, vì vậy cần schema dùng chung
// để hai boundary không tự định nghĩa lại cùng một cấu trúc.
export const nightActionSchema = z.discriminatedUnion('type', [
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
])

export const eliminationCauseSchema = z.enum([
  'WEREWOLF_ATTACK',
  'WITCH_POISON',
  'VOTE',
  'MODERATOR_OVERRIDE',
])

export const nightResolutionSchema = z.object({
  deaths: z.array(
    z.object({
      playerId: z.string().min(1),
      causes: z.array(eliminationCauseSchema),
    }),
  ),
  survivors: z.array(z.string().min(1)),
})

export const voteResolutionSchema = z.discriminatedUnion('outcome', [
  z.object({
    outcome: z.literal('ELIMINATED'),
    playerId: z.string().min(1),
  }),
  z.object({ outcome: z.literal('REVOTE'), nextAttempt: z.literal(2) }),
  z.object({ outcome: z.literal('NO_ELIMINATION') }),
])
