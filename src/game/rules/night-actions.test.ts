import type { Player } from '../domain'

import { describe, expect, it } from 'vitest'

import { getSeerResult, validateNightAction } from './night-actions'

const players: Player[] = [
  { id: 'seer', role: 'SEER', alive: true, abilityState: null },
  { id: 'wolf', role: 'WEREWOLF', alive: true, abilityState: null },
  {
    id: 'witch',
    role: 'WITCH',
    alive: true,
    abilityState: {
      healingPotionAvailable: true,
      poisonPotionAvailable: true,
    },
  },
  { id: 'villager', role: 'VILLAGER', alive: true, abilityState: null },
  { id: 'dead', role: 'VILLAGER', alive: false, abilityState: null },
]

describe('night action validation', () => {
  it('accepts a Seer inspecting another living player', () => {
    expect(
      validateNightAction(
        { type: 'SEER_INSPECT', actorId: 'seer', targetId: 'wolf' },
        { activeStep: 'SEER_INSPECT', players },
      ).ok,
    ).toBe(true)
  })

  it.each([
    ['seer', 'INVALID_TARGET'],
    ['dead', 'INVALID_TARGET'],
    ['missing', 'INVALID_TARGET'],
  ])('rejects Seer target %s with %s', (targetId, errorCode) => {
    const result = validateNightAction(
      { type: 'SEER_INSPECT', actorId: 'seer', targetId },
      { activeStep: 'SEER_INSPECT', players },
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe(errorCode)
  })

  it('rejects actions submitted outside their active step', () => {
    const result = validateNightAction(
      { type: 'WEREWOLF_ATTACK', actorId: 'wolf', targetId: 'villager' },
      { activeStep: 'SEER_INSPECT', players },
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('OUT_OF_TURN')
  })

  it('allows Witch to heal herself and poison another player together', () => {
    expect(
      validateNightAction(
        {
          type: 'WITCH_ACTION',
          actorId: 'witch',
          heal: true,
          poisonTargetId: 'villager',
        },
        {
          activeStep: 'WITCH_ACTION',
          players,
          werewolfTargetId: 'witch',
        },
      ).ok,
    ).toBe(true)
  })

  it('rejects Witch self-poison', () => {
    const result = validateNightAction(
      {
        type: 'WITCH_ACTION',
        actorId: 'witch',
        heal: false,
        poisonTargetId: 'witch',
      },
      {
        activeStep: 'WITCH_ACTION',
        players,
        werewolfTargetId: 'villager',
      },
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('INVALID_TARGET')
  })

  it('rejects a consumed potion', () => {
    const result = validateNightAction(
      {
        type: 'WITCH_ACTION',
        actorId: 'witch',
        heal: true,
        poisonTargetId: null,
      },
      {
        activeStep: 'WITCH_ACTION',
        werewolfTargetId: 'villager',
        players: players.map((player) =>
          player.role === 'WITCH'
            ? {
                ...player,
                abilityState: {
                  ...player.abilityState,
                  healingPotionAvailable: false,
                },
              }
            : player,
        ),
      },
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('ABILITY_UNAVAILABLE')
  })

  it.each([
    ['WEREWOLF', 'WEREWOLF'],
    ['SEER', 'VILLAGE'],
    ['WITCH', 'VILLAGE'],
    ['VILLAGER', 'VILLAGE'],
  ] as const)('returns team alignment for %s', (role, team) => {
    expect(getSeerResult(role)).toBe(team)
  })
})
