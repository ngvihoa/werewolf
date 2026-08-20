import type { Player } from '../domain'

import { describe, expect, it } from 'vitest'

import { resolveNight, resolveVote } from './resolution'

const players: Player[] = [
  { id: 'a', role: 'VILLAGER', alive: true, abilityState: null },
  { id: 'b', role: 'VILLAGER', alive: true, abilityState: null },
  { id: 'wolf', role: 'WEREWOLF', alive: true, abilityState: null },
]

describe('night resolution', () => {
  const courtesan: Player = {
    id: 'courtesan',
    role: 'COURTESAN',
    alive: true,
    abilityState: null,
  }

  it('applies the White Wolf private kill independently', () => {
    expect(
      resolveNight({
        players,
        werewolfTargetId: null,
        witchHealed: false,
        witchPoisonTargetId: null,
        whiteWolfTargetId: 'wolf',
      }).deaths,
    ).toEqual([{ playerId: 'wolf', causes: ['WHITE_WOLF_KILL'] }])
  })

  it('kills Courtesan when visiting a Werewolf', () => {
    expect(
      resolveNight({
        players: [...players, courtesan],
        werewolfTargetId: 'a',
        witchHealed: false,
        witchPoisonTargetId: null,
        courtesanId: 'courtesan',
        courtesanTargetId: 'wolf',
      }).deaths,
    ).toEqual([
      { playerId: 'a', causes: ['WEREWOLF_ATTACK'] },
      { playerId: 'courtesan', causes: ['COURTESAN_VISIT'] },
    ])
  })

  it('makes an attack on Courtesan miss while she is visiting', () => {
    expect(
      resolveNight({
        players: [...players, courtesan],
        werewolfTargetId: 'courtesan',
        witchHealed: false,
        witchPoisonTargetId: null,
        courtesanId: 'courtesan',
        courtesanTargetId: 'a',
      }).deaths,
    ).toEqual([])
  })

  it('kills Courtesan only when the attack kills the visited player', () => {
    const baseInput = {
      players: [...players, courtesan],
      werewolfTargetId: 'a',
      witchPoisonTargetId: null,
      courtesanId: 'courtesan',
      courtesanTargetId: 'a',
    }
    expect(resolveNight({ ...baseInput, witchHealed: false }).deaths).toEqual([
      { playerId: 'a', causes: ['WEREWOLF_ATTACK'] },
      { playerId: 'courtesan', causes: ['COURTESAN_VISIT'] },
    ])
    expect(resolveNight({ ...baseInput, witchHealed: true }).deaths).toEqual([])
    expect(
      resolveNight({
        ...baseInput,
        witchHealed: false,
        protectedTargetId: 'a',
      }).deaths,
    ).toEqual([])
  })

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
      convertedHybridPlayerIds: [],
    })
  })

  it('converts an unprotected and unhealed Hybrid Wolf instead of killing them', () => {
    const hybrid: Player = {
      id: 'hybrid',
      role: 'HYBRID_WOLF',
      alive: true,
      abilityState: { converted: false },
    }
    const result = resolveNight({
      players: [...players, hybrid],
      werewolfTargetId: 'hybrid',
      witchHealed: false,
      witchPoisonTargetId: null,
    })

    expect(result.deaths).toEqual([])
    expect(result.convertedHybridPlayerIds).toEqual(['hybrid'])
  })

  it('does not convert a Hybrid Wolf when healing or protection prevents the attack', () => {
    const hybrid: Player = {
      id: 'hybrid',
      role: 'HYBRID_WOLF',
      alive: true,
      abilityState: { converted: false },
    }
    for (const prevention of [
      { witchHealed: true },
      { witchHealed: false, protectedTargetId: 'hybrid' },
    ]) {
      expect(
        resolveNight({
          players: [...players, hybrid],
          werewolfTargetId: 'hybrid',
          witchPoisonTargetId: null,
          ...prevention,
        }).convertedHybridPlayerIds,
      ).toEqual([])
    }
  })

  it('converts a protected Hybrid Wolf after an enhanced attack', () => {
    const hybrid: Player = {
      id: 'hybrid',
      role: 'HYBRID_WOLF',
      alive: true,
      abilityState: { converted: false },
    }
    expect(
      resolveNight({
        players: [...players, hybrid],
        werewolfTargetId: 'hybrid',
        werewolfAttackEnhanced: true,
        protectedTargetId: 'hybrid',
        witchHealed: false,
        witchPoisonTargetId: null,
      }).convertedHybridPlayerIds,
    ).toEqual(['hybrid'])
  })

  it('kills Courtesan only when visiting an already converted Hybrid Wolf', () => {
    const hybrid: Player = {
      id: 'hybrid',
      role: 'HYBRID_WOLF',
      alive: true,
      abilityState: { converted: false },
    }
    const input = {
      players: [...players, hybrid],
      werewolfTargetId: null,
      witchHealed: false,
      witchPoisonTargetId: null,
      courtesanId: 'courtesan',
      courtesanTargetId: 'hybrid',
    }

    expect(resolveNight(input).deaths).toEqual([])
    hybrid.abilityState.converted = true
    expect(resolveNight(input).deaths).toEqual([
      { playerId: 'courtesan', causes: ['COURTESAN_VISIT'] },
    ])
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
