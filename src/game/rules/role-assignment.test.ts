import { describe, expect, it } from 'vitest'

import {
  validateRoleComposition,
  resolveRoleComposition,
  getRoleComposition,
  assignRoles,
} from './role-assignment'

describe('role composition', () => {
  it.each([
    [5, ['WEREWOLF', 'SEER', 'VILLAGER', 'VILLAGER', 'VILLAGER']],
    [6, ['WEREWOLF', 'SEER', 'WITCH', 'VILLAGER', 'VILLAGER', 'VILLAGER']],
  ] as const)('returns the fixed MVP roles for %i players', (count, roles) => {
    expect(getRoleComposition(count)).toEqual({ ok: true, value: roles })
  })

  it('rejects unsupported player counts', () => {
    const result = getRoleComposition(16)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('INVALID_PLAYER_COUNT')
  })

  it.each([13, 14, 15])(
    'adds exactly one Alpha Werewolf for %i players',
    (count) => {
      const result = getRoleComposition(count)
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(
          result.value.filter((role) => role === 'ALPHA_WEREWOLF'),
        ).toHaveLength(1)
        expect(result.value).toHaveLength(count)
      }
    },
  )

  it.each([13, 15])('adds exactly one Hybrid Wolf for %i players', (count) => {
    const result = getRoleComposition(count)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(
        result.value.filter((role) => role === 'HYBRID_WOLF'),
      ).toHaveLength(1)
      expect(result.value).toHaveLength(count)
    }
  })

  it('adds one Hunter from eight players onward', () => {
    const result = getRoleComposition(8)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.filter((role) => role === 'HUNTER')).toHaveLength(1)
    }
  })

  it.each([9, 10, 11, 12, 13, 14, 15])(
    'adds exactly one Elder from %i players',
    (count) => {
      const result = getRoleComposition(count)
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.filter((role) => role === 'ELDER')).toHaveLength(1)
        expect(result.value).toHaveLength(count)
      }
    },
  )

  it.each([10, 11, 12, 13, 14, 15])(
    'adds exactly one Fool from %i players',
    (count) => {
      const result = getRoleComposition(count)
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.filter((role) => role === 'FOOL')).toHaveLength(1)
        expect(result.value).toHaveLength(count)
      }
    },
  )

  it.each([11, 12, 13, 14, 15])(
    'adds exactly one Piper from %i players',
    (count) => {
      const result = getRoleComposition(count)
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.filter((role) => role === 'PIPER')).toHaveLength(1)
        expect(result.value).toHaveLength(count)
      }
    },
  )

  it.each([12, 13, 14, 15])(
    'adds exactly one Cupid from %i players',
    (count) => {
      const result = getRoleComposition(count)
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.filter((role) => role === 'CUPID')).toHaveLength(1)
        expect(result.value).toHaveLength(count)
      }
    },
  )

  it.each([13, 14, 15])(
    'adds exactly one Courtesan from %i players',
    (count) => {
      const result = getRoleComposition(count)
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(
          result.value.filter((role) => role === 'COURTESAN'),
        ).toHaveLength(1)
        expect(result.value).toHaveLength(count)
      }
    },
  )

  it('validates role counts regardless of order', () => {
    expect(
      validateRoleComposition([
        'VILLAGER',
        'SEER',
        'VILLAGER',
        'WEREWOLF',
        'VILLAGER',
      ]),
    ).toEqual({ ok: true, value: true })
  })

  it('rejects a composition with the wrong roles', () => {
    const result = validateRoleComposition([
      'SEER',
      'SEER',
      'VILLAGER',
      'VILLAGER',
      'VILLAGER',
    ])
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('INVALID_ROLE_COMPOSITION')
  })

  it('replaces every Villager with a unique special role', () => {
    expect(resolveRoleComposition(5, { mode: 'NO_VILLAGER' })).toEqual({
      ok: true,
      value: ['WEREWOLF', 'SEER', 'WITCH', 'PROTECTOR', 'HUNTER'],
    })
  })

  it('rejects the no-villager preset for 15 players', () => {
    const result = resolveRoleComposition(15, { mode: 'NO_VILLAGER' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('INVALID_ROLE_COMPOSITION')
  })

  it('fills a partial custom selection with default Wolves then Villagers', () => {
    expect(
      resolveRoleComposition(10, {
        mode: 'CUSTOM',
        roles: ['SEER', 'WITCH'],
      }),
    ).toEqual({
      ok: true,
      value: [
        'SEER',
        'WITCH',
        'WEREWOLF',
        'WEREWOLF',
        'WEREWOLF',
        'VILLAGER',
        'VILLAGER',
        'VILLAGER',
        'VILLAGER',
        'VILLAGER',
      ],
    })
  })

  it('preserves a custom Wolf count above the default', () => {
    const result = resolveRoleComposition(5, {
      mode: 'CUSTOM',
      roles: ['WEREWOLF', 'WEREWOLF', 'SEER'],
    })
    expect(result).toEqual({
      ok: true,
      value: ['WEREWOLF', 'WEREWOLF', 'SEER', 'VILLAGER', 'VILLAGER'],
    })
  })

  it('does not force Wolves when the Moderator fills every custom slot', () => {
    expect(
      resolveRoleComposition(5, {
        mode: 'CUSTOM',
        roles: ['SEER', 'WITCH', 'PROTECTOR', 'HUNTER', 'ELDER'],
      }),
    ).toEqual({
      ok: true,
      value: ['SEER', 'WITCH', 'PROTECTOR', 'HUNTER', 'ELDER'],
    })
  })

  it('rejects duplicate special roles and too many selected roles', () => {
    const duplicate = resolveRoleComposition(5, {
      mode: 'CUSTOM',
      roles: ['SEER', 'SEER'],
    })
    expect(duplicate.ok).toBe(false)

    const excessive = resolveRoleComposition(5, {
      mode: 'CUSTOM',
      roles: [
        'WEREWOLF',
        'WEREWOLF',
        'WEREWOLF',
        'WEREWOLF',
        'WEREWOLF',
        'WEREWOLF',
      ],
    })
    expect(excessive.ok).toBe(false)
  })

  it('assigns every role exactly once using an injectable shuffle', () => {
    const result = assignRoles(
      ['a', 'b', 'c', 'd', 'e'],
      { mode: 'DEFAULT' },
      () => 0,
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect([...result.value.keys()]).toEqual(['a', 'b', 'c', 'd', 'e'])
      expect([...result.value.values()].sort()).toEqual(
        ['WEREWOLF', 'SEER', 'VILLAGER', 'VILLAGER', 'VILLAGER'].sort(),
      )
    }
  })
})
