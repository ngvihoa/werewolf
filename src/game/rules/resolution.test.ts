import type { Player } from '../domain'

import { describe, expect, it } from 'vitest'

import { resolveNight, resolveVote } from './resolution'

const players: Player[] = [
  { id: 'a', role: 'VILLAGER', alive: true },
  { id: 'b', role: 'VILLAGER', alive: true },
  { id: 'wolf', role: 'WEREWOLF', alive: true },
]

describe('night resolution', () => {
  it('keeps a healed Werewolf target alive', () => {
    expect(
      resolveNight({
        players,
        werewolfTargetId: 'a',
        witchHealed: true,
        witchPoisonTargetId: null,
      }),
    ).toEqual({ deaths: [], survivors: ['a', 'b', 'wolf'] })
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
