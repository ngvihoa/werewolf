import type {
  EliminationCause,
  NightResolution,
  VoteResolution,
} from '../rules/resolution'
import type { GamePhase, QueueStep, Team } from '../domain'
import type { NightAction } from '../rules/night-actions'

export type GameEvent =
  | { type: 'PHASE_CHANGED'; from: GamePhase; to: GamePhase }
  | { type: 'QUEUE_STEP_ACTIVATED'; step: QueueStep }
  | { type: 'NIGHT_ACTION_SUBMITTED'; action: NightAction }
  | { type: 'NIGHT_ACTION_CONFIRMED'; action: NightAction }
  | { type: 'NIGHT_ACTION_REJECTED'; action: NightAction; reason: string }
  | { type: 'QUEUE_STEP_SKIPPED'; step: QueueStep; reason: string }
  | { type: 'NIGHT_RESOLUTION_PREPARED'; resolution: NightResolution }
  | {
      type: 'PLAYER_DIED'
      playerId: string
      causes: EliminationCause[]
    }
  | { type: 'VOTE_SUBMITTED'; tied: boolean; selectedPlayerId: string | null }
  | { type: 'VOTE_RESOLVED'; resolution: VoteResolution }
  | { type: 'GAME_ENDED'; winner: Team }
