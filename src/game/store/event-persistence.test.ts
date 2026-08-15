import { describe, expect, it } from 'vitest'

import { deserializeGameEvent, serializeGameEvent } from './event-persistence'

describe('game event persistence boundary', () => {
  it('separates a validated event into type and JSONB payload', () => {
    const serialized = serializeGameEvent({
      type: 'PLAYER_READY_CHANGED',
      playerId: 'player-1',
      ready: true,
    })

    // PostgreSQL lưu discriminator và dữ liệu còn lại ở hai cột riêng.
    expect(serialized).toEqual({
      type: 'PLAYER_READY_CHANGED',
      payload: { playerId: 'player-1', ready: true },
    })
  })

  it('reconstructs and validates an event read from PostgreSQL', () => {
    const event = deserializeGameEvent('PLAYER_JOINED', {
      playerId: 'player-1',
      displayName: 'An',
    })

    expect(event).toEqual({
      type: 'PLAYER_JOINED',
      playerId: 'player-1',
      displayName: 'An',
    })
  })

  it('rejects a payload that does not match its event type', () => {
    // PLAYER_READY_CHANGED bắt buộc có cả playerId và ready.
    expect(() => {
      deserializeGameEvent('PLAYER_READY_CHANGED', {
        playerId: 'player-1',
      })
    }).toThrow()
  })

  it('treats the database type column as the discriminator source', () => {
    // Dữ liệu type lẫn trong JSONB không được phép ghi đè cột type thực tế.
    const event = deserializeGameEvent('PLAYER_JOINED', {
      type: 'GAME_CREATED',
      playerId: 'player-1',
      displayName: 'An',
    })

    expect(event.type).toBe('PLAYER_JOINED')
  })
})
