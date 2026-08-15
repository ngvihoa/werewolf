import type { PersistedGameEvent } from './model'

import { persistedGameEventSchema } from './schema'

export type SerializedGameEvent = {
  type: PersistedGameEvent['type']
  payload: Record<string, unknown>
}

export function serializeGameEvent(
  input: PersistedGameEvent,
): SerializedGameEvent {
  // Parse trước khi ghi để database không nhận một type với payload không tương ứng.
  const event = persistedGameEventSchema.parse(input)
  const { type, ...payload } = event

  return { type, payload }
}

export function deserializeGameEvent(
  type: string,
  payload: unknown,
): PersistedGameEvent {
  // JSONB phải là object vì các field của event được trải cùng discriminator type.
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return persistedGameEventSchema.parse({ type })
  }

  // Parse sau khi đọc giúp phát hiện dữ liệu cũ hoặc dữ liệu ghi ngoài application.
  // Cột type được trải cuối để JSONB không thể ghi đè discriminator của row.
  return persistedGameEventSchema.parse({ ...payload, type })
}
