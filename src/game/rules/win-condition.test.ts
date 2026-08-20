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

  it('counts Hybrid Wolf on its current effective team', () => {
    const village = {
      id: 'a',
      role: 'VILLAGER' as const,
      alive: true,
      abilityState: null,
    }
    expect(
      getWinningTeamFromPlayers([
        village,
        {
          id: 'hybrid',
          role: 'HYBRID_WOLF',
          alive: true,
          abilityState: { converted: false },
        },
      ]),
    ).toBe('VILLAGE')
    expect(
      getWinningTeamFromPlayers([
        village,
        {
          id: 'hybrid',
          role: 'HYBRID_WOLF',
          alive: true,
          abilityState: { converted: true },
        },
      ]),
    ).toBe('WEREWOLF')
  })

  it('gives White Wolf only a sole-survivor victory', () => {
    const whiteWolf = {
      id: 'white',
      role: 'WHITE_WOLF' as const,
      alive: true,
      abilityState: { killAvailable: false },
    }
    expect(getWinningTeamFromPlayers([whiteWolf])).toBe('WHITE_WOLF')
    expect(
      getWinningTeamFromPlayers([
        whiteWolf,
        { id: 'villager', role: 'VILLAGER', alive: true, abilityState: null },
      ]),
    ).toBeNull()
    expect(
      getWinningTeamFromPlayers([
        whiteWolf,
        { id: 'wolf', role: 'WEREWOLF', alive: true, abilityState: null },
        { id: 'villager', role: 'VILLAGER', alive: true, abilityState: null },
      ]),
    ).toBeNull()
  })
})
