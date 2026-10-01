import type { Role, Winner } from '../domain'

import { getRoleTeam } from '../domain'

export type PlayerResultInput = {
  role: Role
  winner: Winner
  /** Sói Lai đã bị cắn chuyển phe thì tính theo phe Sói. */
  hybridConverted?: boolean
  /** Người chơi có phải một trong hai Tình nhân không (winner LOVERS). */
  isLover?: boolean
}

const NEUTRAL_WINNERS: Winner[] = ['FOOL', 'PIPER', 'WHITE_WOLF']

export function didPlayerWin({
  role,
  winner,
  hybridConverted = false,
  isLover = false,
}: PlayerResultInput): boolean {
  if (winner === 'LOVERS') return isLover
  if (NEUTRAL_WINNERS.includes(winner)) return role === winner
  const playerTeam =
    role === 'HYBRID_WOLF' && hybridConverted ? 'WEREWOLF' : getRoleTeam(role)
  return playerTeam === winner
}

const WINNER_NAMES: Record<Winner, string> = {
  FOOL: 'Thằng ngốc',
  PIPER: 'Người thổi sáo',
  WHITE_WOLF: 'Sói Trắng',
  LOVERS: 'Cặp tình nhân',
  WEREWOLF: 'Phe Ma sói',
  VILLAGE: 'Phe Dân làng',
}

export function winnerDisplayName(winner: Winner): string {
  return WINNER_NAMES[winner]
}
