import type {
  createdGameSchema,
  eventActorSchema,
  gameMutationResultSchema,
  joinedGameSchema,
  persistedGameEventSchema,
  setupEventSchema,
  storeErrorCodeSchema,
  storeErrorSchema,
} from './schema'
import type { GameState } from '../orchestration/model'
import type { Role } from '../domain'
import type { z } from 'zod'

// Type được infer từ runtime schema để validation và TypeScript luôn đồng bộ.
export type EventActor = z.infer<typeof eventActorSchema>

// Session không thể thuộc SYSTEM, nên tái sử dụng EventActor thay vì lặp enum.
export type SessionKind = Exclude<EventActor, 'SYSTEM'>

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

export type SetupEvent = z.infer<typeof setupEventSchema>
export type PersistedGameEvent = z.infer<typeof persistedGameEventSchema>

export type StoredEvent = {
  sequence: number
  id: string
  gameId: string
  actor: EventActor
  actorPlayerId: string | null
  createdAt: string
  event: PersistedGameEvent
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
