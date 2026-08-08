import type { GamePhase, QueueStep, Role } from '../domain'

export const PHASE_TRANSITIONS = {
  SETUP: ['ROLE_REVEAL'],
  ROLE_REVEAL: ['READY_CHECK'],
  READY_CHECK: ['NIGHT'],
  NIGHT: ['NIGHT_RESOLUTION'],
  NIGHT_RESOLUTION: ['DAY', 'GAME_OVER'],
  DAY: ['VOTE'],
  VOTE: ['VOTE_RESOLUTION'],
  VOTE_RESOLUTION: ['VOTE', 'NIGHT', 'GAME_OVER'],
  GAME_OVER: [],
} as const satisfies Record<GamePhase, readonly GamePhase[]>

export const STEP_ROLE = {
  SEER_INSPECT: 'SEER',
  WEREWOLF_ATTACK: 'WEREWOLF',
  WITCH_ACTION: 'WITCH',
} as const satisfies Record<QueueStep, Role>

export function canTransitionPhase(from: GamePhase, to: GamePhase): boolean {
  return (PHASE_TRANSITIONS[from] as readonly GamePhase[]).includes(to)
}

export function getNightQueue(roles: readonly Role[]): QueueStep[] {
  const queue: QueueStep[] = ['SEER_INSPECT', 'WEREWOLF_ATTACK']
  if (roles.includes('WITCH')) queue.push('WITCH_ACTION')
  return queue
}
