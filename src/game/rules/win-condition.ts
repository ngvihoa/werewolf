import type { Player } from '../domain'

import { isWerewolfPlayer } from '../domain'

export type TeamCount = {
  villagers: number
  werewolves: number
}

export type WinningTeam = 'VILLAGE' | 'WEREWOLF' | 'WHITE_WOLF' | null

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
  if (alivePlayers.length === 1 && alivePlayers[0]?.role === 'WHITE_WOLF') {
    return 'WHITE_WOLF'
  }
  const whiteWolves = alivePlayers.filter(
    (player) => player.role === 'WHITE_WOLF',
  ).length
  const werewolves =
    alivePlayers.filter(isWerewolfPlayer).length - whiteWolves

  if (werewolves === 0 && whiteWolves > 0) return null

  return getWinningTeam({
    werewolves,
    villagers: alivePlayers.length - werewolves,
  })
}
