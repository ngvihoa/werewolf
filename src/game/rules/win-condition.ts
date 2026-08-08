import type { Player } from '../domain'

import { getRoleTeam } from '../domain'

export type TeamCount = {
  villagers: number
  werewolves: number
}

export type WinningTeam = 'VILLAGE' | 'WEREWOLF' | null

export function getWinningTeam({
  villagers,
  werewolves,
}: TeamCount): WinningTeam {
  if (werewolves === 0) return 'VILLAGE'
  if (werewolves >= villagers) return 'WEREWOLF'
  return null
}

export function getWinningTeamFromPlayers(
  players: readonly Player[],
): WinningTeam {
  const alivePlayers = players.filter((player) => player.alive)
  const werewolves = alivePlayers.filter(
    (player) => getRoleTeam(player.role) === 'WEREWOLF',
  ).length

  return getWinningTeam({
    werewolves,
    villagers: alivePlayers.length - werewolves,
  })
}
