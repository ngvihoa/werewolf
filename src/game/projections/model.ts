import type {
  GamePhase,
  QueueStep,
  Role,
  Team,
  WitchResources,
} from '../domain'
import type { LocalGame, StoredEvent } from '../store/model'
import type { NightAction } from '../rules/night-actions'

export type PublicPlayerView = {
  id: string
  displayName: string
  alive: boolean
}

export type PlayerPrivateView = {
  id: string
  displayName: string
  ready: boolean
  alive: boolean
  role: Role | null
  abilityState: WitchResources | null
}

export type PublicHistoryEvent =
  | { type: 'GAME_CREATED' }
  | { type: 'PLAYER_JOINED'; playerId: string; displayName: string }
  | { type: 'PLAYER_READY_CHANGED'; playerId: string; ready: boolean }
  | { type: 'ROLES_ASSIGNED' }
  | { type: 'GAME_STARTED' }
  | { type: 'PHASE_CHANGED'; from: GamePhase; to: GamePhase }
  | { type: 'PLAYER_DIED'; playerId: string }
  | { type: 'GAME_ENDED'; winner: Team }

export type PublicHistoryEntry = {
  sequence: number
  createdAt: string
  event: PublicHistoryEvent
}

export type PrivateHistoryEvent =
  | { type: 'OWN_NIGHT_ACTION_SUBMITTED'; action: NightAction }
  | { type: 'OWN_NIGHT_ACTION_CONFIRMED'; action: NightAction }
  | { type: 'OWN_NIGHT_ACTION_REJECTED'; action: NightAction; reason: string }
  | {
    type: 'SEER_RESULT_RECORDED'
    targetPlayerId: string
    result: Team
  }

export type PrivateHistoryEntry = {
  sequence: number
  createdAt: string
  event: PrivateHistoryEvent
}

export type PlayerGameView = {
  viewer: 'PLAYER'
  gameId: string
  roomCode: string
  version: number
  phase: GamePhase | 'LOBBY'
  round: number
  winner: Team | null
  players: PublicPlayerView[]
  me: PlayerPrivateView
  queue: { step: QueueStep; status: string }[]
  turn: {
    canAct: boolean
    activeStep: QueueStep | null
    werewolfTargetId: string | null
  }
  publicHistory: PublicHistoryEntry[]
  privateHistory: PrivateHistoryEntry[]
}

export type ModeratorGameView = {
  viewer: 'MODERATOR'
  game: LocalGame
}

export type GameView = PlayerGameView | ModeratorGameView

export type ProjectionViewer =
  { kind: 'MODERATOR'; playerId: null } | { kind: 'PLAYER'; playerId: string }

export type EventProjection = {
  publicEntry: PublicHistoryEntry | null
  privateEntry: PrivateHistoryEntry | null
}

export type StoredEventInput = Pick<
  StoredEvent,
  'sequence' | 'createdAt' | 'event'
>
