import z from 'zod'

// Các mảng literal là nguồn giá trị duy nhất cho Zod và PostgreSQL enums.
// `as const` giữ từng phần tử thành literal type thay vì string chung chung.
export const ROLE_VALUES = [
  'VILLAGER',
  'WEREWOLF',
  'ALPHA_WEREWOLF',
  'HYBRID_WOLF',
  'SEER',
  'WITCH',
  'PROTECTOR',
  'HUNTER',
  'ELDER',
  'FOOL',
  'PIPER',
  'CUPID',
  'COURTESAN',
] as const

export const TEAM_VALUES = ['VILLAGE', 'WEREWOLF'] as const
export const WINNER_VALUES = [
  ...TEAM_VALUES,
  'FOOL',
  'PIPER',
  'LOVERS',
] as const

export const GAME_PHASE_VALUES = [
  'SETUP',
  'ROLE_REVEAL',
  'READY_CHECK',
  'NIGHT',
  'NIGHT_RESOLUTION',
  'DAY',
  'VOTE',
  'VOTE_RESOLUTION',
  'HUNTER_SHOT',
  'GAME_OVER',
] as const

export const QUEUE_STEP_VALUES = [
  'HUNTER_MARK',
  'PROTECTOR_PROTECT',
  'SEER_INSPECT',
  'WEREWOLF_ATTACK',
  'WITCH_ACTION',
  'PIPER_CHARM',
  'CUPID_LINK',
  'COURTESAN_VISIT',
] as const

export const DOMAIN_ERROR_CODE_VALUES = [
  'ABILITY_UNAVAILABLE',
  'ACTOR_DEAD',
  'ACTOR_NOT_FOUND',
  'INVALID_ACTION',
  'INVALID_PLAYER_COUNT',
  'INVALID_ROLE_COMPOSITION',
  'INVALID_TARGET',
  'OUT_OF_TURN',
  'ROLE_MISMATCH',
] as const

// Các schema này tồn tại ở runtime, nên có thể kiểm tra dữ liệu từ API,
// database hoặc bất kỳ nguồn nào không được TypeScript bảo đảm.
export const roleSchema = z.enum(ROLE_VALUES)
export const roleCompositionSelectionSchema = z
  .discriminatedUnion('mode', [
    z.object({ mode: z.literal('DEFAULT') }),
    z.object({ mode: z.literal('NO_VILLAGER') }),
    z.object({
      mode: z.literal('CUSTOM'),
      roles: z.array(roleSchema).max(15),
    }),
  ])
  .default({ mode: 'DEFAULT' })
export const teamSchema = z.enum(TEAM_VALUES)
export const winnerSchema = z.enum(WINNER_VALUES)
export const gamePhaseSchema = z.enum(GAME_PHASE_VALUES)
export const queueStepSchema = z.enum(QUEUE_STEP_VALUES)
export const domainErrorCodeSchema = z.enum(DOMAIN_ERROR_CODE_VALUES)

export const witchResourcesSchema = z.object({
  healingPotionAvailable: z.boolean(),
  poisonPotionAvailable: z.boolean(),
})

export const alphaWerewolfResourcesSchema = z.object({
  enhancedAttackAvailable: z.boolean(),
})

export const elderResourcesSchema = z.object({
  werewolfAttackSurvivalAvailable: z.boolean(),
})

export const hybridWolfResourcesSchema = z.object({
  converted: z.boolean(),
})

const basePlayerFields = {
  id: z.string(),
  alive: z.boolean(),
}

// Discriminated union giữ invariant quan trọng của domain: chỉ các role có tài
// nguyên dùng một lần mới có ability state.
export const playerSchema = z.discriminatedUnion('role', [
  z.object({
    ...basePlayerFields,
    role: z.literal('WITCH'),
    abilityState: witchResourcesSchema,
  }),
  z.object({
    ...basePlayerFields,
    role: z.literal('VILLAGER'),
    abilityState: z.null(),
  }),
  z.object({
    ...basePlayerFields,
    role: z.literal('WEREWOLF'),
    abilityState: z.null(),
  }),
  z.object({
    ...basePlayerFields,
    role: z.literal('ALPHA_WEREWOLF'),
    abilityState: alphaWerewolfResourcesSchema,
  }),
  z.object({
    ...basePlayerFields,
    role: z.literal('HYBRID_WOLF'),
    abilityState: hybridWolfResourcesSchema,
  }),
  z.object({
    ...basePlayerFields,
    role: z.literal('SEER'),
    abilityState: z.null(),
  }),
  z.object({
    ...basePlayerFields,
    role: z.literal('PROTECTOR'),
    abilityState: z.null(),
  }),
  z.object({
    ...basePlayerFields,
    role: z.literal('HUNTER'),
    abilityState: z.null(),
  }),
  z.object({
    ...basePlayerFields,
    role: z.literal('ELDER'),
    abilityState: elderResourcesSchema,
  }),
  z.object({
    ...basePlayerFields,
    role: z.literal('FOOL'),
    abilityState: z.null(),
  }),
  z.object({
    ...basePlayerFields,
    role: z.literal('PIPER'),
    abilityState: z.null(),
  }),
  z.object({
    ...basePlayerFields,
    role: z.literal('CUPID'),
    abilityState: z.null(),
  }),
  z.object({
    ...basePlayerFields,
    role: z.literal('COURTESAN'),
    abilityState: z.null(),
  }),
])

export const domainErrorSchema = z.object({
  code: domainErrorCodeSchema,
  message: z.string(),
})
