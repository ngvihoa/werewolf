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
  lastCourtesanTargetId?: string | null
  lastProtectedTargetId?: string | null
  pendingNightResolution: NightResolution | null
  voteAttempt: 1 | 2
  pendingVote: VoteSubmission | null
  pendingVoteResolution: VoteResolution | null
  // SELF mode: phiếu bỏ trên thiết bị của attempt hiện tại,
  // map playerId -> targetId (NULL = phiếu trắng). Reset mỗi attempt.
  voteSubmissions?: Record<string, string | null>
  // R21: ai đã bấm "Sẵn sàng bỏ phiếu" trong pha DAY. Reset mỗi ngày.
  voteConsentIds?: string[]
  // R21: mốc thời gian tối thiểu của thảo luận (ISO) — store gắn khi vào DAY,
  // bot chỉ mở vote khi đã qua mốc. Orchestrator giữ NULL, không biết đồng hồ.
  discussionMinEndsAt?: string | null
  // R22: định danh ngữ cảnh đang chờ người chơi (step/vote/hunter shot) và
  // mốc hết giờ (ISO). Store gắn khi ngữ cảnh đổi; bot so với đồng hồ server
  // để skip/abstain. Orchestrator không đọc hai trường này.
  waitingKey?: string | null
  waitingDeadlineAt?: string | null
  pendingHunterShot?: {
    hunterId: string
    targetId: string | null
  } | null
  winner: Winner | null
}
