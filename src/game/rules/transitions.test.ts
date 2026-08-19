import { describe, expect, it } from 'vitest'

import { canTransitionPhase, getNightQueue } from './transitions'

describe('phase transitions', () => {
  it.each([
    ['SETUP', 'ROLE_REVEAL', true],
    ['SETUP', 'NIGHT', false],
    ['NIGHT_RESOLUTION', 'DAY', true],
    ['NIGHT_RESOLUTION', 'GAME_OVER', true],
    ['VOTE_RESOLUTION', 'HUNTER_SHOT', true],
    ['HUNTER_SHOT', 'NIGHT', true],
    ['GAME_OVER', 'NIGHT', false],
  ] as const)('%s -> %s is %s', (from, to, expected) => {
    expect(canTransitionPhase(from, to)).toBe(expected)
  })

  it('omits the Witch step from a five-player game', () => {
    expect(
      getNightQueue(['WEREWOLF', 'SEER', 'VILLAGER', 'VILLAGER', 'VILLAGER']),
    ).toEqual(['SEER_INSPECT', 'WEREWOLF_ATTACK'])
  })

  it('includes the Witch step after the Werewolf step', () => {
    expect(getNightQueue(['WEREWOLF', 'SEER', 'WITCH'])).toEqual([
      'SEER_INSPECT',
      'WEREWOLF_ATTACK',
      'WITCH_ACTION',
    ])
  })

  it('runs the Hunter mark before the other night roles', () => {
    expect(getNightQueue(['WEREWOLF', 'HUNTER', 'PROTECTOR'])).toEqual([
      'HUNTER_MARK',
      'PROTECTOR_PROTECT',
      'SEER_INSPECT',
      'WEREWOLF_ATTACK',
    ])
  })

  it('runs the Piper charm after the other night roles', () => {
    expect(getNightQueue(['WEREWOLF', 'SEER', 'WITCH', 'PIPER'])).toEqual([
      'SEER_INSPECT',
      'WEREWOLF_ATTACK',
      'WITCH_ACTION',
      'PIPER_CHARM',
    ])
  })

  it('runs Cupid first only on the first night', () => {
    expect(getNightQueue(['CUPID', 'WEREWOLF', 'SEER'], 1)).toEqual([
      'CUPID_LINK',
      'SEER_INSPECT',
      'WEREWOLF_ATTACK',
    ])
    expect(getNightQueue(['CUPID', 'WEREWOLF', 'SEER'], 2)).toEqual([
      'SEER_INSPECT',
      'WEREWOLF_ATTACK',
    ])
  })
})
