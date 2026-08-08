import { describe, expect, it } from 'vitest'

import { getWinningTeam } from './win-condition'

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
})
