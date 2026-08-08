import { describe, expect, it } from 'vitest'

import { getWinningTeam, getWinningTeamFromPlayers } from './win-condition'

describe('getWinningTeam', () => {
  it('returns village when no werewolf remains', () => {
    expect(getWinningTeam({ villagers: 3, werewolves: 0 })).toBe('VILLAGE')
  })

  it('returns werewolf at parity', () => {
    expect(getWinningTeam({ villagers: 1, werewolves: 1 })).toBe('WEREWOLF')
  })

  it('keeps the game running otherwise', () => {
    expect(getWinningTeam({ villagers: 3, werewolves: 1 })).toBeNull()
  })

  it('counts only living players from domain state', () => {
    expect(
      getWinningTeamFromPlayers([
        { id: 'wolf', role: 'WEREWOLF', alive: true, abilityState: null },
        { id: 'seer', role: 'SEER', alive: true, abilityState: null },
        { id: 'dead', role: 'VILLAGER', alive: false, abilityState: null },
      ]),
    ).toBe('WEREWOLF')
  })
})
