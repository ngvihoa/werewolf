import z from 'zod'

// Các mảng literal là nguồn giá trị duy nhất cho Zod và PostgreSQL enums.
// `as const` giữ từng phần tử thành literal type thay vì string chung chung.
export const ROLE_VALUES = [
  'VILLAGER',
  'WEREWOLF',
  'SEER',
  'WITCH',
  'PROTECTOR',
] as const

export const TEAM_VALUES = ['VILLAGE', 'WEREWOLF'] as const

export const GAME_PHASE_VALUES = [
  'SETUP',
  'ROLE_REVEAL',
  'READY_CHECK',
  'NIGHT',
  'NIGHT_RESOLUTION',
  'DAY',
  'VOTE',
  'VOTE_RESOLUTION',
  'GAME_OVER',
] as const

export const QUEUE_STEP_VALUES = [
  'PROTECTOR_PROTECT',
  'SEER_INSPECT',
  'WEREWOLF_ATTACK',
  'WITCH_ACTION',
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
export const teamSchema = z.enum(TEAM_VALUES)
export const gamePhaseSchema = z.enum(GAME_PHASE_VALUES)
export const queueStepSchema = z.enum(QUEUE_STEP_VALUES)
export const domainErrorCodeSchema = z.enum(DOMAIN_ERROR_CODE_VALUES)

export const witchResourcesSchema = z.object({
  healingPotionAvailable: z.boolean(),
  poisonPotionAvailable: z.boolean(),
})

const basePlayerFields = {
  id: z.string(),
  alive: z.boolean(),
}

// Discriminated union giữ invariant quan trọng của domain:
// chỉ Witch có ability state, mọi role khác bắt buộc có abilityState = null.
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
    role: z.literal('SEER'),
    abilityState: z.null(),
  }),
  z.object({
    ...basePlayerFields,
    role: z.literal('PROTECTOR'),
    abilityState: z.null(),
  }),
])

export const domainErrorSchema = z.object({
  code: domainErrorCodeSchema,
  message: z.string(),
})
