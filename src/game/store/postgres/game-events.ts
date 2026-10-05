import type { PersistedGameEvent, SessionKind } from '../model'
import type { DatabaseTransaction, GameRow } from './shared'
import type { GameEvent } from '../../orchestration/events'

import { gameEvents } from '#/db/schema'
import { desc, eq } from 'drizzle-orm'

import { serializeGameEvent } from '../event-persistence'

export function getEventTargetPlayerId(event: GameEvent): string | null {
  switch (event.type) {
    case 'NIGHT_ACTION_SUBMITTED':
    case 'NIGHT_ACTION_CONFIRMED':
    case 'NIGHT_ACTION_REJECTED':
      return event.action.type === 'WITCH_ACTION'
        ? event.action.poisonTargetId
        : event.action.type === 'CUPID_LINK'
          ? null
          : event.action.targetId
    case 'SEER_RESULT_RECORDED':
      return event.targetPlayerId
    case 'PLAYER_DIED':
      return event.playerId
    case 'VOTE_SUBMITTED':
      return event.selectedPlayerId
    // Revamp MODERATED (M9/M10): audit hoàn tác/override trỏ về chủ role và
    // người bị đánh dấu để truy vấn theo người.
    case 'STEP_UNDONE':
      return event.action.actorId
    case 'PLAYER_OVERRIDE_APPLIED':
      return event.playerId
    default:
      return null
  }
}

export async function appendGameEvent(
  transaction: DatabaseTransaction,
  input: {
    game: Pick<GameRow, 'id' | 'round' | 'phase'>
    event: PersistedGameEvent
    createdBy: SessionKind | 'SYSTEM'
    actorPlayerId: string | null
    targetPlayerId?: string | null
    createdAt: Date
  },
): Promise<number> {
  // Game row đã được lock trước khi gọi nên sequence này an toàn khi có concurrency.
  const [latestEvent] = await transaction
    .select({ sequence: gameEvents.sequence })
    .from(gameEvents)
    .where(eq(gameEvents.gameId, input.game.id))
    .orderBy(desc(gameEvents.sequence))
    .limit(1)

  const nextSequence = (latestEvent?.sequence ?? 0) + 1
  const event = serializeGameEvent(input.event)

  await transaction.insert(gameEvents).values({
    gameId: input.game.id,
    round: input.game.round,
    phase: input.game.phase,
    sequence: nextSequence,
    type: event.type,
    payload: event.payload,
    createdAt: input.createdAt,
    createdBy: input.createdBy,
    actorPlayerId: input.actorPlayerId,
    targetPlayerId: input.targetPlayerId ?? null,
  })

  return nextSequence
}
