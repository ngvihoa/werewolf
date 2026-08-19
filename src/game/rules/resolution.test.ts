import type { Player } from '../domain'

import { describe, expect, it } from 'vitest'

import { resolveNight, resolveVote } from './resolution'

const players: Player[] = [
  { id: 'a', role: 'VILLAGER', alive: true, abilityState: null },
  { id: 'b', role: 'VILLAGER', alive: true, abilityState: null },
  { id: 'wolf', role: 'WEREWOLF', alive: true, abilityState: null },
]

describe('night resolution', () => {
  it('triggers the confirmed Hunter mark only when the Hunter dies', () => {
    expect(
      resolveNight({
        players,
        werewolfTargetId: 'wolf',
        witchHealed: false,
        witchPoisonTargetId: null,
        hunterId: 'wolf',
        hunterTargetId: 'a',
      }).deaths,
    ).toEqual([
      { playerId: 'wolf', causes: ['WEREWOLF_ATTACK'] },
      { playerId: 'a', causes: ['HUNTER_SHOT'] },
    ])

    expect(
      resolveNight({
        players,
        werewolfTargetId: 'a',
        witchHealed: false,
        witchPoisonTargetId: null,
        hunterId: 'wolf',
        hunterTargetId: 'b',
      }).deaths,
    ).toEqual([{ playerId: 'a', causes: ['WEREWOLF_ATTACK'] }])
  })

  it('blocks the Werewolf attack when the target is protected', () => {
    expect(
      resolveNight({
        players,
        werewolfTargetId: 'a',
        protectedTargetId: 'a',
        witchHealed: false,
        witchPoisonTargetId: null,
      }).deaths,
    ).toEqual([])
  })

  it('lets an enhanced attack bypass protection', () => {
    expect(
      resolveNight({
        players,
        werewolfTargetId: 'a',
        werewolfAttackEnhanced: true,
        protectedTargetId: 'a',
        witchHealed: false,
        witchPoisonTargetId: null,
      }).deaths,
    ).toEqual([{ playerId: 'a', causes: ['WEREWOLF_ATTACK'] }])
  })

  it('lets Witch heal a target hit by an enhanced attack', () => {
    expect(
      resolveNight({
        players,
        werewolfTargetId: 'a',
        werewolfAttackEnhanced: true,
        protectedTargetId: 'a',
        witchHealed: true,
        witchPoisonTargetId: null,
      }).deaths,
    ).toEqual([])
  })

  it('keeps a healed Werewolf target alive', () => {
    expect(
      resolveNight({
        players,
        werewolfTargetId: 'a',
        witchHealed: true,
        witchPoisonTargetId: null,
      }),
    ).toEqual({
      deaths: [],
      survivors: ['a', 'b', 'wolf'],
      elderSurvivalConsumedPlayerIds: [],
    })
  })

  it('lets the Elder survive only the first unprevented Werewolf attack', () => {
    const elder: Player = {
      id: 'elder',
      role: 'ELDER',
      alive: true,
      abilityState: { werewolfAttackSurvivalAvailable: true },
    }
    const firstAttack = resolveNight({
      players: [...players, elder],
      werewolfTargetId: 'elder',
      witchHealed: false,
      witchPoisonTargetId: null,
    })

    expect(firstAttack.deaths).toEqual([])
    expect(firstAttack.elderSurvivalConsumedPlayerIds).toEqual(['elder'])

    elder.abilityState.werewolfAttackSurvivalAvailable = false
    expect(
      resolveNight({
        players: [...players, elder],
        werewolfTargetId: 'elder',
        witchHealed: false,
        witchPoisonTargetId: null,
      }).deaths,
    ).toEqual([{ playerId: 'elder', causes: ['WEREWOLF_ATTACK'] }])
  })

  it('does not consume the Elder survival when healing or protection blocks the attack', () => {
    const elder: Player = {
      id: 'elder',
      role: 'ELDER',
      alive: true,
      abilityState: { werewolfAttackSurvivalAvailable: true },
    }

    for (const prevention of [
      { witchHealed: true },
      { witchHealed: false, protectedTargetId: 'elder' },
    ]) {
      const result = resolveNight({
        players: [...players, elder],
        werewolfTargetId: 'elder',
        witchPoisonTargetId: null,
        ...prevention,
      })
      expect(result.deaths).toEqual([])
      expect(result.elderSurvivalConsumedPlayerIds).toEqual([])
    }
  })

  it('consumes the Elder survival when an enhanced attack bypasses protection', () => {
    const elder: Player = {
      id: 'elder',
      role: 'ELDER',
      alive: true,
      abilityState: { werewolfAttackSurvivalAvailable: true },
    }
    const result = resolveNight({
      players: [...players, elder],
      werewolfTargetId: 'elder',
      werewolfAttackEnhanced: true,
      protectedTargetId: 'elder',
      witchHealed: false,
      witchPoisonTargetId: null,
    })

    expect(result.deaths).toEqual([])
    expect(result.elderSurvivalConsumedPlayerIds).toEqual(['elder'])
  })

  it('resolves attack and poison simultaneously', () => {
    expect(
      resolveNight({
        players,
        werewolfTargetId: 'a',
        witchHealed: false,
        witchPoisonTargetId: 'b',
      }).deaths,
    ).toEqual([
      { playerId: 'a', causes: ['WEREWOLF_ATTACK'] },
      { playerId: 'b', causes: ['WITCH_POISON'] },
    ])
  })

  it('emits one death with both causes for the same target', () => {
    expect(
      resolveNight({
        players,
        werewolfTargetId: 'a',
        witchHealed: false,
        witchPoisonTargetId: 'a',
      }).deaths,
    ).toEqual([{ playerId: 'a', causes: ['WEREWOLF_ATTACK', 'WITCH_POISON'] }])
  })
})

describe('vote resolution', () => {
  it('requests one revote after the first tie', () => {
    expect(resolveVote(true, null, 1)).toEqual({
      outcome: 'REVOTE',
      nextAttempt: 2,
    })
  })

  it('eliminates nobody after the second tie', () => {
    expect(resolveVote(true, null, 2)).toEqual({ outcome: 'NO_ELIMINATION' })
  })

  it('returns the selected player when the vote is not tied', () => {
    expect(resolveVote(false, 'a', 1)).toEqual({
      outcome: 'ELIMINATED',
      playerId: 'a',
    })
  })
})
