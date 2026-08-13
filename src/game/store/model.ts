import type {
  createdGameSchema,
  gameMutationResultSchema,
  joinedGameSchema,
  storeErrorCodeSchema,
  storeErrorSchema,
} from './schema'
import type { GameEvent } from '../orchestration/events'
import type { GameState } from '../orchestration/model'
import type { Role } from '../domain'
import type { z } from 'zod'

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

// Các public boundary types được infer từ Zod schema để runtime validation
// và TypeScript không thể lệch nhau khi có thay đổi sau này.
export type StoreErrorCode = z.infer<typeof storeErrorCodeSchema>
export type StoreError = z.infer<typeof storeErrorSchema>

export type StoreResult<T> =
  { ok: true; value: T } | { ok: false; error: StoreError }

export type CreatedGame = z.infer<typeof createdGameSchema>
export type JoinedGame = z.infer<typeof joinedGameSchema>
export type GameMutationResult = z.infer<typeof gameMutationResultSchema>
