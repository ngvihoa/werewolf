import { randomUUID } from 'node:crypto'

import { gameEvents, games, gameSessions } from '#/db/schema'
import { afterEach, describe, expect, it } from 'vitest'
import { eq, inArray } from 'drizzle-orm'
import { db } from '#/db/client'

import { createSessionExpiry, hashSessionToken } from '../auth/session-token'

import { PostgresGameStore } from './postgres-game-store'

const createdRoomCodes: string[] = []

afterEach(async () => {
  if (createdRoomCodes.length === 0) return

  // Xóa game là đủ vì session và event dùng foreign key ON DELETE CASCADE.
  await db.delete(games).where(inArray(games.roomCode, createdRoomCodes))
  createdRoomCodes.length = 0
})

describe('PostgresGameStore.createGame', () => {
  it('persists the game, moderator session and initial event atomically', async () => {
    const roomCode = createTestRoomCode()
    const rawSessionToken = `integration-test-${randomUUID()}`
    const now = new Date('2026-08-14T03:00:00.000Z')
    createdRoomCodes.push(roomCode)

    const store = new PostgresGameStore({
      createRoomCode: () => roomCode,
      createSessionToken: () => rawSessionToken,
      now: () => now,
    })

    const result = await store.createGame('  Test Moderator  ')

    expect(result).toMatchObject({
      ok: true,
      value: {
        roomCode,
        moderatorSessionToken: rawSessionToken,
      },
    })

    if (!result.ok) {
      throw new Error('Expected createGame to succeed')
    }
    expect(typeof result.value.gameId).toBe('string')

    // Đọc lại database để kiểm tra các giá trị mặc định và tên đã được trim.
    const [storedGame] = await db
      .select()
      .from(games)
      .where(eq(games.id, result.value.gameId))

    expect(storedGame).toMatchObject({
      id: result.value.gameId,
      roomCode,
      moderatorName: 'Test Moderator',
      status: 'LOBBY',
      phase: 'SETUP',
      round: 0,
      version: 1,
    })

    // Database chỉ được giữ hash; raw token chỉ xuất hiện trong response trả về client.
    const [storedSession] = await db
      .select()
      .from(gameSessions)
      .where(eq(gameSessions.gameId, result.value.gameId))

    expect(storedSession).toMatchObject({
      gameId: result.value.gameId,
      playerId: null,
      kind: 'MODERATOR',
      tokenHash: hashSessionToken(rawSessionToken),
      expiresAt: createSessionExpiry(now),
      createdAt: now,
      lastSeenAt: now,
    })
    expect(storedSession?.tokenHash).not.toBe(rawSessionToken)

    // Event đầu tiên tạo audit trail cho toàn bộ vòng đời game.
    const [storedEvent] = await db
      .select()
      .from(gameEvents)
      .where(eq(gameEvents.gameId, result.value.gameId))

    expect(storedEvent).toMatchObject({
      gameId: result.value.gameId,
      sequence: 1,
      round: 0,
      phase: 'SETUP',
      type: 'GAME_CREATED',
      payload: {},
      createdBy: 'SYSTEM',
      actorPlayerId: null,
      targetPlayerId: null,
      createdAt: now,
    })
  })

  it('rolls back the game when creating its session fails', async () => {
    const roomCode = createTestRoomCode()
    createdRoomCodes.push(roomCode)

    const store = new PostgresGameStore({
      createRoomCode: () => roomCode,

      // Hash sai format làm check constraint của game_sessions từ chối insert.
      hashSessionToken: () => 'invalid-hash',
    })

    await expect(store.createGame('Test Moderator')).rejects.toMatchObject({
      // Drizzle bọc PostgresError trong thuộc tính cause.
      cause: { code: '23514' },
    })

    // Nếu transaction hoạt động đúng, game insert trước session cũng bị rollback.
    const storedGames = await db
      .select({ id: games.id })
      .from(games)
      .where(eq(games.roomCode, roomCode))

    expect(storedGames).toEqual([])
  })

  it('retries with another room code after a unique constraint collision', async () => {
    const occupiedRoomCode = createTestRoomCode()
    const availableRoomCode = createTestRoomCode()
    createdRoomCodes.push(occupiedRoomCode, availableRoomCode)

    // Seed một game để lần insert đầu tiên đụng unique constraint room_code.
    await db.insert(games).values({
      roomCode: occupiedRoomCode,
      moderatorName: 'Existing Moderator',
    })

    let roomCodeAttempt = 0
    const store = new PostgresGameStore({
      createRoomCode: () => {
        roomCodeAttempt += 1
        return roomCodeAttempt === 1 ? occupiedRoomCode : availableRoomCode
      },
    })

    const result = await store.createGame('New Moderator')

    expect(result).toMatchObject({
      ok: true,
      value: { roomCode: availableRoomCode },
    })
    expect(roomCodeAttempt).toBe(2)
  })
})

function createTestRoomCode(): string {
  // UUID chỉ chứa ký tự hexadecimal; lấy 6 ký tự đầu vẫn khớp DB constraint A-Z0-9.
  return randomUUID().replaceAll('-', '').slice(0, 6).toUpperCase()
}
