import z from 'zod'

// NightAction là dữ liệu đi qua command và event, vì vậy cần schema dùng chung
// để hai boundary không tự định nghĩa lại cùng một cấu trúc.
export const nightActionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('HUNTER_MARK'),
    actorId: z.string().min(1),
    targetId: z.string().min(1),
  }),
  z.object({
    type: z.literal('PROTECTOR_PROTECT'),
    actorId: z.string().min(1),
    targetId: z.string().min(1),
  }),
  z.object({
    type: z.literal('SEER_INSPECT'),
    actorId: z.string().min(1),
    targetId: z.string().min(1),
  }),
  z.object({
    type: z.literal('WEREWOLF_ATTACK'),
    actorId: z.string().min(1),
    targetId: z.string().min(1),
    enhanced: z.boolean().optional(),
  }),
  z.object({
    type: z.literal('WITCH_ACTION'),
    actorId: z.string().min(1),
    heal: z.boolean(),
    poisonTargetId: z.string().min(1).nullable(),
  }),
  z.object({
    type: z.literal('PIPER_CHARM'),
    actorId: z.string().min(1),
    targetId: z.string().min(1),
  }),
  z.object({
    type: z.literal('CUPID_LINK'),
    actorId: z.string().min(1),
    targetIds: z.tuple([z.string().min(1), z.string().min(1)]),
  }),
  z.object({
    type: z.literal('COURTESAN_VISIT'),
    actorId: z.string().min(1),
    targetId: z.string().min(1),
  }),
])

export const eliminationCauseSchema = z.enum([
  'WEREWOLF_ATTACK',
  'WITCH_POISON',
  'VOTE',
  'MODERATOR_OVERRIDE',
  'HUNTER_SHOT',
  'HEARTBREAK',
  'COURTESAN_VISIT',
])

export const nightResolutionSchema = z.object({
  deaths: z.array(
    z.object({
      playerId: z.string().min(1),
      causes: z.array(eliminationCauseSchema),
    }),
  ),
  survivors: z.array(z.string().min(1)),
  elderSurvivalConsumedPlayerIds: z.array(z.string().min(1)).default([]),
})

export const voteResolutionSchema = z.discriminatedUnion('outcome', [
  z.object({
    outcome: z.literal('ELIMINATED'),
    playerId: z.string().min(1),
  }),
  z.object({ outcome: z.literal('REVOTE'), nextAttempt: z.literal(2) }),
  z.object({ outcome: z.literal('NO_ELIMINATION') }),
])
