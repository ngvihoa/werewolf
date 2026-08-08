export type Role = 'VILLAGER' | 'WEREWOLF' | 'SEER' | 'WITCH'
export type Team = 'VILLAGE' | 'WEREWOLF'

export type GamePhase =
  | 'SETUP'
  | 'ROLE_REVEAL'
  | 'READY_CHECK'
  | 'NIGHT'
  | 'NIGHT_RESOLUTION'
  | 'DAY'
  | 'VOTE'
  | 'VOTE_RESOLUTION'
  | 'GAME_OVER'

export type QueueStep = 'SEER_INSPECT' | 'WEREWOLF_ATTACK' | 'WITCH_ACTION'

type BasePlayer = {
  id: string
  alive: boolean
}

export type WitchResources = {
  healingPotionAvailable: boolean
  poisonPotionAvailable: boolean
}

export type Player = BasePlayer &
  ({
    role: 'WITCH'
    abilityState: WitchResources
  } |
  {
    role: Exclude<Role, 'WITCH'>
    abilityState: null
  })

export type DomainErrorCode =
  | 'ABILITY_UNAVAILABLE'
  | 'ACTOR_DEAD'
  | 'ACTOR_NOT_FOUND'
  | 'INVALID_ACTION'
  | 'INVALID_PLAYER_COUNT'
  | 'INVALID_ROLE_COMPOSITION'
  | 'INVALID_TARGET'
  | 'OUT_OF_TURN'
  | 'ROLE_MISMATCH'

export type DomainError = {
  code: DomainErrorCode
  message: string
}

export type Result<T> =
  { ok: true; value: T } | { ok: false; error: DomainError }

export function getRoleTeam(role: Role): Team {
  return role === 'WEREWOLF' ? 'WEREWOLF' : 'VILLAGE'
}
