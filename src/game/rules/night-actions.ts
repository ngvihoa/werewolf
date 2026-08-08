import type {
  Player,
  QueueStep,
  Result,
  Role,
  Team,
  WitchResources,
} from '../domain'

import { getRoleTeam } from '../domain'

import { STEP_ROLE } from './transitions'

export type SeerAction = {
  type: 'SEER_INSPECT'
  actorId: string
  targetId: string
}

export type WerewolfAction = {
  type: 'WEREWOLF_ATTACK'
  actorId: string
  targetId: string
}

export type WitchAction = {
  type: 'WITCH_ACTION'
  actorId: string
  heal: boolean
  poisonTargetId: string | null
}

export type NightAction = SeerAction | WerewolfAction | WitchAction

type ValidationContext = {
  activeStep: QueueStep
  players: readonly Player[]
  werewolfTargetId?: string
  witchResources?: WitchResources
}

function failure(code: Parameters<typeof makeError>[0], message: string) {
  return { ok: false, error: makeError(code, message) } as const
}

function makeError(
  code:
    | 'ABILITY_UNAVAILABLE'
    | 'ACTOR_DEAD'
    | 'ACTOR_NOT_FOUND'
    | 'INVALID_ACTION'
    | 'INVALID_TARGET'
    | 'OUT_OF_TURN'
    | 'ROLE_MISMATCH',
  message: string,
) {
  return { code, message }
}

export function validateNightAction(
  action: NightAction,
  context: ValidationContext,
): Result<NightAction> {
  if (action.type !== context.activeStep) {
    return failure('OUT_OF_TURN', 'Action does not match the active queue step')
  }

  const actor = context.players.find((player) => player.id === action.actorId)
  if (!actor) return failure('ACTOR_NOT_FOUND', 'Actor does not exist')
  if (!actor.alive) return failure('ACTOR_DEAD', 'Dead players cannot act')
  if (actor.role !== STEP_ROLE[context.activeStep]) {
    return failure('ROLE_MISMATCH', 'Actor role cannot perform this action')
  }

  if (action.type === 'WITCH_ACTION') {
    return validateWitchAction(action, actor, context)
  }

  const target = context.players.find((player) => player.id === action.targetId)
  if (!target?.alive || target.id === actor.id) {
    return failure('INVALID_TARGET', 'Target must be another living player')
  }

  return { ok: true, value: action }
}

function validateWitchAction(
  action: WitchAction,
  actor: Player,
  context: ValidationContext,
): Result<NightAction> {
  const resources = context.witchResources
  if (!resources) {
    return failure('INVALID_ACTION', 'Witch resources are required')
  }
  if (action.heal && !context.werewolfTargetId) {
    return failure('INVALID_ACTION', 'There is no Werewolf target to heal')
  }
  if (action.heal && !resources.healingPotionAvailable) {
    return failure(
      'ABILITY_UNAVAILABLE',
      'Healing Potion has already been used',
    )
  }
  if (action.poisonTargetId && !resources.poisonPotionAvailable) {
    return failure('ABILITY_UNAVAILABLE', 'Poison Potion has already been used')
  }

  if (action.poisonTargetId) {
    const target = context.players.find(
      (player) => player.id === action.poisonTargetId,
    )
    if (!target?.alive || target.id === actor.id) {
      return failure(
        'INVALID_TARGET',
        'Poison target must be another living player',
      )
    }
  }

  return { ok: true, value: action }
}

export function getSeerResult(targetRole: Role): Team {
  return getRoleTeam(targetRole)
}
