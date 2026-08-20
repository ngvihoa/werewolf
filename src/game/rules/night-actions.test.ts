import type { Player } from '../domain'

import { describe, expect, it } from 'vitest'

import { getSeerResult, validateNightAction } from './night-actions'

const players: Player[] = [
  { id: 'seer', role: 'SEER', alive: true, abilityState: null },
  { id: 'wolf', role: 'WEREWOLF', alive: true, abilityState: null },
  {
    id: 'alpha',
    role: 'ALPHA_WEREWOLF',
    alive: true,
    abilityState: { enhancedAttackAvailable: true },
  },
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
  it('prevents Courtesan from visiting the same player consecutively', () => {
    const courtesanPlayers: Player[] = [
      { id: 'courtesan', role: 'COURTESAN', alive: true, abilityState: null },
      { id: 'villager', role: 'VILLAGER', alive: true, abilityState: null },
    ]

    const result = validateNightAction(
      {
        type: 'COURTESAN_VISIT',
        actorId: 'courtesan',
        targetId: 'villager',
      },
      {
        activeStep: 'COURTESAN_VISIT',
        players: courtesanPlayers,
        lastCourtesanTargetId: 'villager',
      },
    )

    expect(result).toMatchObject({
      ok: false,
      error: { code: 'INVALID_TARGET' },
    })
  })

  it('allows Cupid to link two other living players only on first night', () => {
    const cupidPlayers: Player[] = [
      { id: 'cupid', role: 'CUPID', alive: true, abilityState: null },
      { id: 'wolf', role: 'WEREWOLF', alive: true, abilityState: null },
      { id: 'villager', role: 'VILLAGER', alive: true, abilityState: null },
    ]
    const action = {
      type: 'CUPID_LINK' as const,
      actorId: 'cupid',
      targetIds: ['wolf', 'villager'] as [string, string],
    }

    expect(
      validateNightAction(action, {
        activeStep: 'CUPID_LINK',
        players: cupidPlayers,
        round: 1,
        loverIds: null,
      }),
    ).toEqual({ ok: true, value: action })
    expect(
      validateNightAction(action, {
        activeStep: 'CUPID_LINK',
        players: cupidPlayers,
        round: 2,
        loverIds: null,
      }),
    ).toMatchObject({ ok: false, error: { code: 'ABILITY_UNAVAILABLE' } })
  })

  it('prevents Piper from charming an already charmed player', () => {
    const players: Player[] = [
      { id: 'piper', role: 'PIPER', alive: true, abilityState: null },
      { id: 'villager', role: 'VILLAGER', alive: true, abilityState: null },
    ]

    const result = validateNightAction(
      { type: 'PIPER_CHARM', actorId: 'piper', targetId: 'villager' },
      {
        activeStep: 'PIPER_CHARM',
        players,
        charmedPlayerIds: ['villager'],
      },
    )

    expect(result).toMatchObject({
      ok: false,
      error: { code: 'INVALID_TARGET' },
    })
  })

  it('allows self-protection but rejects the previous night target', () => {
    const protector: Player = {
      id: 'protector',
      role: 'PROTECTOR',
      alive: true,
      abilityState: null,
    }
    const contextPlayers = [...players, protector]

    expect(
      validateNightAction(
        {
          type: 'PROTECTOR_PROTECT',
          actorId: protector.id,
          targetId: protector.id,
        },
        { activeStep: 'PROTECTOR_PROTECT', players: contextPlayers },
      ).ok,
    ).toBe(true)
    expect(
      validateNightAction(
        {
          type: 'PROTECTOR_PROTECT',
          actorId: protector.id,
          targetId: 'villager',
        },
        {
          activeStep: 'PROTECTOR_PROTECT',
          players: contextPlayers,
          lastProtectedTargetId: 'villager',
        },
      ),
    ).toMatchObject({ ok: false, error: { code: 'INVALID_TARGET' } })
  })

  it('prevents a Werewolf from attacking a teammate', () => {
    const teammate: Player = {
      id: 'wolf-2',
      role: 'WEREWOLF',
      alive: true,
      abilityState: null,
    }

    expect(
      validateNightAction(
        {
          type: 'WEREWOLF_ATTACK',
          actorId: 'wolf',
          targetId: teammate.id,
        },
        { activeStep: 'WEREWOLF_ATTACK', players: [...players, teammate] },
      ),
    ).toMatchObject({ ok: false, error: { code: 'INVALID_TARGET' } })
  })

  it('allows only an available Alpha Werewolf to enhance the attack', () => {
    expect(
      validateNightAction(
        {
          type: 'WEREWOLF_ATTACK',
          actorId: 'alpha',
          targetId: 'villager',
          enhanced: true,
        },
        { activeStep: 'WEREWOLF_ATTACK', players },
      ).ok,
    ).toBe(true)

    expect(
      validateNightAction(
        {
          type: 'WEREWOLF_ATTACK',
          actorId: 'wolf',
          targetId: 'villager',
          enhanced: true,
        },
        { activeStep: 'WEREWOLF_ATTACK', players },
      ),
    ).toMatchObject({ ok: false, error: { code: 'ROLE_MISMATCH' } })

    const consumedPlayers = players.map((player) =>
      player.role === 'ALPHA_WEREWOLF'
        ? {
            ...player,
            abilityState: { enhancedAttackAvailable: false },
          }
        : player,
    )
    expect(
      validateNightAction(
        {
          type: 'WEREWOLF_ATTACK',
          actorId: 'alpha',
          targetId: 'villager',
          enhanced: true,
        },
        { activeStep: 'WEREWOLF_ATTACK', players: consumedPlayers },
      ),
    ).toMatchObject({ ok: false, error: { code: 'ABILITY_UNAVAILABLE' } })
  })

  it('prevents Werewolves from attacking an Alpha teammate', () => {
    expect(
      validateNightAction(
        { type: 'WEREWOLF_ATTACK', actorId: 'wolf', targetId: 'alpha' },
        { activeStep: 'WEREWOLF_ATTACK', players },
      ),
    ).toMatchObject({ ok: false, error: { code: 'INVALID_TARGET' } })
  })

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
    ['ALPHA_WEREWOLF', 'WEREWOLF'],
    ['SEER', 'VILLAGE'],
    ['WITCH', 'VILLAGE'],
    ['VILLAGER', 'VILLAGE'],
  ] as const)('returns team alignment for %s', (role, team) => {
    expect(getSeerResult(role)).toBe(team)
  })
})
