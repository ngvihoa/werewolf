import type { Player, QueueStep, Result, Role, Team } from '../domain'
import type { nightActionSchema } from './schema'
import type { z } from 'zod'

import { getRoleTeam, isWerewolfRole } from '../domain'

import { STEP_ROLE } from './transitions'

// Rule types được infer từ runtime schema để command và event luôn đồng bộ.
export type NightAction = z.infer<typeof nightActionSchema>
export type SeerAction = Extract<NightAction, { type: 'SEER_INSPECT' }>
export type WerewolfAction = Extract<NightAction, { type: 'WEREWOLF_ATTACK' }>
export type WitchAction = Extract<NightAction, { type: 'WITCH_ACTION' }>
export type ProtectorAction = Extract<
  NightAction,
  { type: 'PROTECTOR_PROTECT' }
>

type ValidationContext = {
  activeStep: QueueStep
  players: readonly Player[]
  werewolfTargetId?: string
  lastProtectedTargetId?: string | null
  charmedPlayerIds?: readonly string[]
  round?: number
  loverIds?: readonly string[] | null
  lastCourtesanTargetId?: string | null
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
  const actorCanPerformStep =
    context.activeStep === 'WEREWOLF_ATTACK'
      ? isWerewolfRole(actor.role)
      : actor.role === STEP_ROLE[context.activeStep]
  if (!actorCanPerformStep) {
    return failure('ROLE_MISMATCH', 'Actor role cannot perform this action')
  }

  if (action.type === 'WITCH_ACTION') {
    return validateWitchAction(action, actor, context)
  }

  if (action.type === 'CUPID_LINK') {
    if (context.round !== 1 || context.loverIds?.length) {
      return failure(
        'ABILITY_UNAVAILABLE',
        'Cupid acts only once on first night',
      )
    }
    const [firstId, secondId] = action.targetIds
    if (firstId === secondId || firstId === actor.id || secondId === actor.id) {
      return failure(
        'INVALID_TARGET',
        'Cupid must choose two different players other than Cupid',
      )
    }
    const targets = action.targetIds.map((targetId) =>
      context.players.find((player) => player.id === targetId),
    )
    if (targets.some((target) => !target?.alive)) {
      return failure('INVALID_TARGET', 'Both lovers must be living players')
    }
    return { ok: true, value: action }
  }

  const target = context.players.find((player) => player.id === action.targetId)
  if (!target?.alive) {
    return failure('INVALID_TARGET', 'Target must be a living player')
  }
  if (action.type === 'PROTECTOR_PROTECT') {
    if (target.id === context.lastProtectedTargetId) {
      return failure(
        'INVALID_TARGET',
        'Protector cannot protect the same player on consecutive nights',
      )
    }
    return { ok: true, value: action }
  }
  if (
    action.type === 'PIPER_CHARM' &&
    context.charmedPlayerIds?.includes(target.id)
  ) {
    return failure('INVALID_TARGET', 'Piper must charm a new target')
  }
  if (
    action.type === 'COURTESAN_VISIT' &&
    action.targetId === context.lastCourtesanTargetId
  ) {
    return failure(
      'INVALID_TARGET',
      'Courtesan cannot visit the same player on consecutive nights',
    )
  }
  if (target.id === actor.id) {
    return failure('INVALID_TARGET', 'Target must be another living player')
  }
  if (action.type === 'WEREWOLF_ATTACK') {
    if (isWerewolfRole(target.role)) {
      return failure('INVALID_TARGET', 'Werewolves cannot attack a teammate')
    }
    if (action.enhanced) {
      if (actor.role !== 'ALPHA_WEREWOLF') {
        return failure(
          'ROLE_MISMATCH',
          'Only the Alpha Werewolf can enhance the shared attack',
        )
      }
      if (!actor.abilityState.enhancedAttackAvailable) {
        return failure(
          'ABILITY_UNAVAILABLE',
          'Enhanced Werewolf attack has already been used',
        )
      }
    }
  }

  return { ok: true, value: action }
}

function validateWitchAction(
  action: WitchAction,
  actor: Player,
  context: ValidationContext,
): Result<NightAction> {
  if (actor.role !== 'WITCH') {
    return failure('ROLE_MISMATCH', 'Actor is not the Witch')
  }
  const resources = actor.abilityState
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
