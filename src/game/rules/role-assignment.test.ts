import { describe, expect, it } from 'vitest'

import {
  validateRoleComposition,
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
    const result = getRoleComposition(13)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('INVALID_PLAYER_COUNT')
  })

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
      'WEREWOLF',
      'SEER',
      'WITCH',
      'VILLAGER',
      'VILLAGER',
    ])
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('INVALID_ROLE_COMPOSITION')
  })

  it('assigns every role exactly once using an injectable shuffle', () => {
    const result = assignRoles(['a', 'b', 'c', 'd', 'e'], () => 0)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect([...result.value.keys()]).toEqual(['a', 'b', 'c', 'd', 'e'])
      expect([...result.value.values()].sort()).toEqual(
        ['WEREWOLF', 'SEER', 'VILLAGER', 'VILLAGER', 'VILLAGER'].sort(),
      )
    }
  })
})
