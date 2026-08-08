import type { Player } from '../domain'

export type DeathCause = 'WEREWOLF_ATTACK' | 'WITCH_POISON'

export type NightResolution = {
  deaths: { playerId: string; causes: DeathCause[] }[]
  survivors: string[]
}

type NightResolutionInput = {
  players: readonly Player[]
  werewolfTargetId: string | null
  witchHealed: boolean
  witchPoisonTargetId: string | null
}

export function resolveNight(input: NightResolutionInput): NightResolution {
  const causesByPlayer = new Map<string, DeathCause[]>()

  if (input.werewolfTargetId && !input.witchHealed) {
    causesByPlayer.set(input.werewolfTargetId, ['WEREWOLF_ATTACK'])
  }
  if (input.witchPoisonTargetId) {
    const causes = causesByPlayer.get(input.witchPoisonTargetId) ?? []
    causes.push('WITCH_POISON')
    causesByPlayer.set(input.witchPoisonTargetId, causes)
  }

  const deaths = [...causesByPlayer].map(([playerId, causes]) => ({
    playerId,
    causes,
  }))
  const deadIds = new Set(deaths.map((death) => death.playerId))

  return {
    deaths,
    survivors: input.players
      .filter((player) => player.alive && !deadIds.has(player.id))
      .map((player) => player.id),
  }
}

export type VoteResolution =
  | { outcome: 'ELIMINATED'; playerId: string }
  | { outcome: 'REVOTE'; nextAttempt: 2 }
  | { outcome: 'NO_ELIMINATION' }

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
