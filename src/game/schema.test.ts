import { describe, expect, it } from 'vitest'

import {
  domainErrorSchema,
  gamePhaseSchema,
  queueStepSchema,
  playerSchema,
  roleSchema,
  teamSchema,
} from './schema'

describe('game domain schemas', () => {
  it('validates the documented enum values at runtime', () => {
    expect(roleSchema.safeParse('WITCH').success).toBe(true)
    expect(teamSchema.safeParse('VILLAGE').success).toBe(true)
    expect(gamePhaseSchema.safeParse('NIGHT').success).toBe(true)
    expect(queueStepSchema.safeParse('SEER_INSPECT').success).toBe(true)

    expect(roleSchema.safeParse('HUNTER').success).toBe(true)
    expect(roleSchema.safeParse('ALPHA_WEREWOLF').success).toBe(true)
    expect(roleSchema.safeParse('ELDER').success).toBe(true)
    expect(roleSchema.safeParse('FOOL').success).toBe(true)
    expect(roleSchema.safeParse('PIPER').success).toBe(true)
    expect(gamePhaseSchema.safeParse('LOBBY').success).toBe(false)
  })

  it('requires ability state for Witch players', () => {
    const witch = playerSchema.safeParse({
      id: 'witch-1',
      role: 'WITCH',
      alive: true,
      abilityState: {
        healingPotionAvailable: true,
        poisonPotionAvailable: false,
      },
    })

    const invalidWitch = playerSchema.safeParse({
      id: 'witch-1',
      role: 'WITCH',
      alive: true,
      abilityState: null,
    })

    expect(witch.success).toBe(true)
    expect(invalidWitch.success).toBe(false)
  })

  it('rejects ability state for non-Witch players', () => {
    const result = playerSchema.safeParse({
      id: 'seer-1',
      role: 'SEER',
      alive: true,
      abilityState: {
        healingPotionAvailable: true,
        poisonPotionAvailable: true,
      },
    })

    expect(result.success).toBe(false)
  })

  it('requires enhanced attack state for Alpha Werewolf players', () => {
    expect(
      playerSchema.safeParse({
        id: 'alpha-1',
        role: 'ALPHA_WEREWOLF',
        alive: true,
        abilityState: { enhancedAttackAvailable: true },
      }).success,
    ).toBe(true)

    expect(
      playerSchema.safeParse({
        id: 'alpha-1',
        role: 'ALPHA_WEREWOLF',
        alive: true,
        abilityState: null,
      }).success,
    ).toBe(false)
  })

  it('requires survival state for Elder players', () => {
    expect(
      playerSchema.safeParse({
        id: 'elder-1',
        role: 'ELDER',
        alive: true,
        abilityState: { werewolfAttackSurvivalAvailable: true },
      }).success,
    ).toBe(true)

    expect(
      playerSchema.safeParse({
        id: 'elder-1',
        role: 'ELDER',
        alive: true,
        abilityState: null,
      }).success,
    ).toBe(false)
  })

  it('validates domain errors', () => {
    expect(
      domainErrorSchema.safeParse({
        code: 'OUT_OF_TURN',
        message: 'Player cannot act during this step',
      }).success,
    ).toBe(true)
  })
})
