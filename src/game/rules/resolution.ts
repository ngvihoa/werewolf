import type {
  eliminationCauseSchema,
  nightResolutionSchema,
  voteResolutionSchema,
} from './schema'
import type { Player } from '../domain'
import type { z } from 'zod'

import { isWerewolfPlayer } from '../domain'

// Resolution được persist trong event payload nên schema runtime là source of truth.
export type EliminationCause = z.infer<typeof eliminationCauseSchema>
export type NightResolution = z.infer<typeof nightResolutionSchema>

type NightResolutionInput = {
  players: readonly Player[]
  werewolfTargetId: string | null
  werewolfAttackEnhanced?: boolean
  witchHealed: boolean
  witchPoisonTargetId: string | null
  protectedTargetId?: string | null
  hunterId?: string | null
  hunterTargetId?: string | null
  courtesanId?: string | null
  courtesanTargetId?: string | null
  whiteWolfTargetId?: string | null
}

export function resolveNight(input: NightResolutionInput): NightResolution {
  const causesByPlayer = new Map<string, EliminationCause[]>()
  const elderSurvivalConsumedPlayerIds: string[] = []
  const convertedHybridPlayerIds: string[] = []
  let werewolfKilledTarget = false

  if (
    input.werewolfTargetId &&
    !input.witchHealed &&
    !(
      input.werewolfTargetId === input.courtesanId && input.courtesanTargetId
    ) &&
    (input.werewolfAttackEnhanced ||
      input.werewolfTargetId !== input.protectedTargetId)
  ) {
    const target = input.players.find(
      (player) => player.id === input.werewolfTargetId,
    )
    if (target?.role === 'HYBRID_WOLF' && !target.abilityState.converted) {
      convertedHybridPlayerIds.push(target.id)
    } else if (
      target?.role === 'ELDER' &&
      target.abilityState.werewolfAttackSurvivalAvailable
    ) {
      elderSurvivalConsumedPlayerIds.push(target.id)
    } else {
      causesByPlayer.set(input.werewolfTargetId, ['WEREWOLF_ATTACK'])
      werewolfKilledTarget = true
    }
  }

  const courtesanTarget = input.players.find(
    (player) => player.id === input.courtesanTargetId,
  )
  if (
    input.courtesanId &&
    (isWerewolfPlayer(courtesanTarget) ||
      (werewolfKilledTarget &&
        input.werewolfTargetId === input.courtesanTargetId))
  ) {
    causesByPlayer.set(input.courtesanId, ['COURTESAN_VISIT'])
  }
  if (input.witchPoisonTargetId) {
    const causes = causesByPlayer.get(input.witchPoisonTargetId) ?? []
    causes.push('WITCH_POISON')
    causesByPlayer.set(input.witchPoisonTargetId, causes)
  }
  if (input.whiteWolfTargetId) {
    const causes = causesByPlayer.get(input.whiteWolfTargetId) ?? []
    causes.push('WHITE_WOLF_KILL')
    causesByPlayer.set(input.whiteWolfTargetId, causes)
  }

  if (
    input.hunterId &&
    input.hunterTargetId &&
    causesByPlayer.has(input.hunterId) &&
    !causesByPlayer.has(input.hunterTargetId)
  ) {
    causesByPlayer.set(input.hunterTargetId, ['HUNTER_SHOT'])
  }

  const deaths = [...causesByPlayer].map(([playerId, causes]) => ({
    playerId,
    causes,
  }))
  const deadIds = new Set(deaths.map((death) => death.playerId))

  return {
    deaths,
    elderSurvivalConsumedPlayerIds,
    convertedHybridPlayerIds,
    survivors: input.players
      .filter((player) => player.alive && !deadIds.has(player.id))
      .map((player) => player.id),
  }
}

export type VoteResolution = z.infer<typeof voteResolutionSchema>

export function resolveVote(
  tied: boolean,
  selectedPlayerId: string | null,
  attempt: 1 | 2,
): VoteResolution {
  if (tied) {
    return attempt === 1
      ? { outcome: 'REVOTE', nextAttempt: 2 }
      : { outcome: 'NO_ELIMINATION' }
  }
  if (!selectedPlayerId) return { outcome: 'NO_ELIMINATION' }
  return { outcome: 'ELIMINATED', playerId: selectedPlayerId }
}
