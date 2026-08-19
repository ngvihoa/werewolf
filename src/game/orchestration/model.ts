import type { GamePhase, Player, QueueStep, Winner } from '../domain'
import type { NightResolution, VoteResolution } from '../rules/resolution'
import type { NightAction } from '../rules/night-actions'

export type QueueStepStatus =
  | 'PENDING'
  | 'ACTIVE'
  | 'WAITING_MODERATOR_CONFIRMATION'
  | 'COMPLETED'
  | 'SKIPPED'

export type NightQueueItem = {
  step: QueueStep
  status: QueueStepStatus
  skipReason: string | null
}

export type VoteSubmission = {
  tied: boolean
  selectedPlayerId: string | null
}

export type GameState = {
  phase: GamePhase
  round: number
  players: Player[]
  queue: NightQueueItem[]
  pendingNightAction: NightAction | null
  confirmedNightActions: NightAction[]
  charmedPlayerIds?: string[]
  loverIds?: [string, string] | null
  lastProtectedTargetId?: string | null
  pendingNightResolution: NightResolution | null
  voteAttempt: 1 | 2
  pendingVote: VoteSubmission | null
  pendingVoteResolution: VoteResolution | null
  pendingHunterShot?: {
    hunterId: string
    targetId: string | null
  } | null
  winner: Winner | null
}
