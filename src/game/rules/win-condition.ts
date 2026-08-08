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
