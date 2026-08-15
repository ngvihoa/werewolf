import type {
  gameViewSchema,
  moderatorGameViewSchema,
  playerGameViewSchema,
  playerPrivateViewSchema,
  privateHistoryEntrySchema,
  privateHistoryEventSchema,
  publicHistoryEntrySchema,
  publicHistoryEventSchema,
  publicPlayerViewSchema,
} from './schema'
import type { StoredEvent } from '../store/model'
import type z from 'zod'

export type PublicPlayerView = z.infer<typeof publicPlayerViewSchema>

export type PlayerPrivateView = z.infer<typeof playerPrivateViewSchema>

export type PublicHistoryEvent = z.infer<typeof publicHistoryEventSchema>

export type PublicHistoryEntry = z.infer<typeof publicHistoryEntrySchema>

export type PrivateHistoryEvent = z.infer<typeof privateHistoryEventSchema>

export type PrivateHistoryEntry = z.infer<typeof privateHistoryEntrySchema>

export type PlayerGameView = z.infer<typeof playerGameViewSchema>

export type ModeratorGameView = z.infer<typeof moderatorGameViewSchema>

export type GameView = z.infer<typeof gameViewSchema>

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
