import type { GameEvent } from '../orchestration/events'
import type { GameState } from '../orchestration/model'
import type { Role } from '../domain'

export type SessionKind = 'MODERATOR' | 'PLAYER'

export type LocalSession = {
  token: string
  gameId: string
  kind: SessionKind
  playerId: string | null
}

export type LobbyPlayer = {
  id: string
  displayName: string
  ready: boolean
  role: Role | null
}

export type SetupEvent =
  | { type: 'GAME_CREATED' }
  | { type: 'PLAYER_JOINED'; playerId: string; displayName: string }
  | { type: 'PLAYER_READY_CHANGED'; playerId: string; ready: boolean }
  | { type: 'ROLES_ASSIGNED' }
  | { type: 'GAME_STARTED' }

export type StoredEvent = {
  sequence: number
  id: string
  gameId: string
  actor: SessionKind | 'SYSTEM'
  actorPlayerId: string | null
  createdAt: string
  event: SetupEvent | GameEvent
}

export type LocalGame = {
  id: string
  roomCode: string
  version: number
  moderatorName: string
  lobbyPlayers: LobbyPlayer[]
  state: GameState | null
  history: StoredEvent[]
}

export type StoreErrorCode =
  | 'DUPLICATE_DISPLAY_NAME'
  | 'GAME_ALREADY_STARTED'
  | 'GAME_NOT_FOUND'
  | 'INVALID_GAME_STATE'
  | 'NOT_ALL_PLAYERS_READY'
  | 'NOT_AUTHORIZED'
  | 'ROLES_NOT_ASSIGNED'
  | 'SESSION_NOT_FOUND'
  | 'STALE_VERSION'

export type StoreError = {
  code: StoreErrorCode
  message: string
}

export type StoreResult<T> =
  { ok: true; value: T } | { ok: false; error: StoreError }

export type CreatedGame = {
  gameId: string
  roomCode: string
  moderatorSessionToken: string
}

export type JoinedGame = {
  gameId: string
  playerId: string
  playerSessionToken: string
}
