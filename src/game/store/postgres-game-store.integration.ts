import { randomUUID } from 'node:crypto'

import { gameEvents, gamePlayers, games, gameSessions } from '#/db/schema'
import { afterEach, describe, expect, it } from 'vitest'
import { and, asc, desc, eq, inArray } from 'drizzle-orm'
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

describe('PostgresGameStore.joinGame', () => {
  it('assigns consecutive event sequences when two players join concurrently', async () => {
    const roomCode = createTestRoomCode()
    createdRoomCodes.push(roomCode)

    const store = new PostgresGameStore({ createRoomCode: () => roomCode })
    const created = await store.createGame('Test Moderator')
    if (!created.ok) throw new Error('Expected createGame to succeed')

    // Chạy đồng thời để kiểm tra FOR UPDATE thực sự tuần tự hóa mutation của cùng game.
    const [firstJoin, secondJoin] = await Promise.all([
      store.joinGame(roomCode, 'An'),
      store.joinGame(roomCode, 'Binh'),
    ])

    expect(firstJoin.ok).toBe(true)
    expect(secondJoin.ok).toBe(true)

    // Cả hai player và session phải được lưu sau khi hai transaction commit.
    const storedPlayers = await db
      .select({ id: gamePlayers.id })
      .from(gamePlayers)
      .where(eq(gamePlayers.gameId, created.value.gameId))
    const storedPlayerSessions = await db
      .select({ id: gameSessions.id })
      .from(gameSessions)
      .where(
        and(
          eq(gameSessions.gameId, created.value.gameId),
          eq(gameSessions.kind, 'PLAYER'),
        ),
      )
    const [storedGame] = await db
      .select({ version: games.version })
      .from(games)
      .where(eq(games.id, created.value.gameId))
    const storedEvents = await db
      .select({
        sequence: gameEvents.sequence,
        type: gameEvents.type,
        createdBy: gameEvents.createdBy,
        actorPlayerId: gameEvents.actorPlayerId,
      })
      .from(gameEvents)
      .where(eq(gameEvents.gameId, created.value.gameId))
      .orderBy(asc(gameEvents.sequence))

    expect(storedPlayers).toHaveLength(2)
    expect(storedPlayerSessions).toHaveLength(2)
    expect(storedGame?.version).toBe(3)

    // GAME_CREATED dùng sequence 1; hai lần join tiếp theo phải nhận 2 và 3.
    expect(
      storedEvents.map(({ sequence, type, createdBy }) => ({
        sequence,
        type,
        createdBy,
      })),
    ).toEqual([
      { sequence: 1, type: 'GAME_CREATED', createdBy: 'SYSTEM' },
      { sequence: 2, type: 'PLAYER_JOINED', createdBy: 'PLAYER' },
      { sequence: 3, type: 'PLAYER_JOINED', createdBy: 'PLAYER' },
    ])

    // Mỗi event PLAYER_JOINED phải chỉ đúng player đã thực hiện hành động.
    const joinedActorIds = storedEvents
      .filter((event) => event.type === 'PLAYER_JOINED')
      .map((event) => event.actorPlayerId)
    expect(new Set(joinedActorIds)).toEqual(
      new Set(storedPlayers.map((player) => player.id)),
    )
  })

  it('returns GAME_NOT_FOUND when the room code does not exist', async () => {
    const store = new PostgresGameStore()

    const result = await store.joinGame(createTestRoomCode(), 'An')

    expect(result).toEqual({
      ok: false,
      error: {
        code: 'GAME_NOT_FOUND',
        message: 'Room not found',
      },
    })
  })

  it('returns GAME_ALREADY_STARTED when the game is no longer in the lobby', async () => {
    const roomCode = createTestRoomCode()
    createdRoomCodes.push(roomCode)

    const store = new PostgresGameStore({ createRoomCode: () => roomCode })
    const created = await store.createGame('Test Moderator')
    if (!created.ok) throw new Error('Expected createGame to succeed')

    // Mô phỏng game đã bắt đầu trước khi player gửi request join.
    await db
      .update(games)
      .set({ status: 'IN_PROGRESS' })
      .where(eq(games.id, created.value.gameId))

    const result = await store.joinGame(roomCode, 'An')

    expect(result).toEqual({
      ok: false,
      error: {
        code: 'GAME_ALREADY_STARTED',
        message: 'Game already started',
      },
    })

    // Error path không được tạo player ngoài ý muốn.
    const storedPlayers = await db
      .select({ id: gamePlayers.id })
      .from(gamePlayers)
      .where(eq(gamePlayers.gameId, created.value.gameId))
    expect(storedPlayers).toEqual([])
  })

  it('returns a typed error when the display name already exists', async () => {
    const roomCode = createTestRoomCode()
    createdRoomCodes.push(roomCode)

    const store = new PostgresGameStore({ createRoomCode: () => roomCode })
    const created = await store.createGame('Test Moderator')
    if (!created.ok) throw new Error('Expected createGame to succeed')

    // Unique index dùng lower(btrim(display_name)), nên khoảng trắng và hoa thường vẫn trùng.
    await db.insert(gamePlayers).values({
      gameId: created.value.gameId,
      displayName: 'An',
    })

    const duplicate = await store.joinGame(roomCode, '  an  ')

    expect(duplicate).toEqual({
      ok: false,
      error: {
        code: 'DUPLICATE_DISPLAY_NAME',
        message: 'Display name is already in use',
      },
    })

    // Insert lỗi không được tạo thêm player thứ hai.
    const storedPlayers = await db
      .select({ id: gamePlayers.id })
      .from(gamePlayers)
      .where(eq(gamePlayers.gameId, created.value.gameId))
    expect(storedPlayers).toHaveLength(1)
  })
})

describe('PostgresGameStore.setReady', () => {
  it('updates player readiness, game version and audit event atomically', async () => {
    const roomCode = createTestRoomCode()
    createdRoomCodes.push(roomCode)

    const store = new PostgresGameStore({ createRoomCode: () => roomCode })
    const created = await store.createGame('Test Moderator')
    if (!created.ok) throw new Error('Expected createGame to succeed')

    const joined = await store.joinGame(roomCode, 'An')
    if (!joined.ok) throw new Error('Expected joinGame to succeed')

    // createGame tạo version 1 và joinGame tăng thành version 2.
    const result = await store.setReady(joined.value.playerSessionToken, 2, true)

    expect(result).toEqual({
      ok: true,
      value: {
        gameId: created.value.gameId,
        version: 3,
      },
    })

    const [storedPlayer] = await db
      .select({ isReady: gamePlayers.isReady })
      .from(gamePlayers)
      .where(eq(gamePlayers.id, joined.value.playerId))
    const [storedGame] = await db
      .select({ version: games.version })
      .from(games)
      .where(eq(games.id, created.value.gameId))
    const [latestEvent] = await db
      .select({
        sequence: gameEvents.sequence,
        type: gameEvents.type,
        payload: gameEvents.payload,
        createdBy: gameEvents.createdBy,
        actorPlayerId: gameEvents.actorPlayerId,
      })
      .from(gameEvents)
      .where(eq(gameEvents.gameId, created.value.gameId))
      .orderBy(desc(gameEvents.sequence))
      .limit(1)

    expect(storedPlayer?.isReady).toBe(true)
    expect(storedGame?.version).toBe(3)
    expect(latestEvent).toEqual({
      sequence: 3,
      type: 'PLAYER_READY_CHANGED',
      payload: {
        playerId: joined.value.playerId,
        ready: true,
      },
      createdBy: 'PLAYER',
      actorPlayerId: joined.value.playerId,
    })
  })

  it('returns STALE_VERSION without changing player state', async () => {
    const roomCode = createTestRoomCode()
    createdRoomCodes.push(roomCode)

    const store = new PostgresGameStore({ createRoomCode: () => roomCode })
    const created = await store.createGame('Test Moderator')
    if (!created.ok) throw new Error('Expected createGame to succeed')

    const joined = await store.joinGame(roomCode, 'An')
    if (!joined.ok) throw new Error('Expected joinGame to succeed')

    // Client gửi version 1 trong khi joinGame đã tăng database lên version 2.
    const result = await store.setReady(joined.value.playerSessionToken, 1, true)

    expect(result).toEqual({
      ok: false,
      error: {
        code: 'STALE_VERSION',
        message: 'Game version is stale',
      },
    })

    const [storedPlayer] = await db
      .select({ isReady: gamePlayers.isReady })
      .from(gamePlayers)
      .where(eq(gamePlayers.id, joined.value.playerId))
    const [storedGame] = await db
      .select({ version: games.version })
      .from(games)
      .where(eq(games.id, created.value.gameId))

    expect(storedPlayer?.isReady).toBe(false)
    expect(storedGame?.version).toBe(2)
  })

  it('returns NOT_AUTHORIZED for a moderator session', async () => {
    const roomCode = createTestRoomCode()
    createdRoomCodes.push(roomCode)

    const store = new PostgresGameStore({ createRoomCode: () => roomCode })
    const created = await store.createGame('Test Moderator')
    if (!created.ok) throw new Error('Expected createGame to succeed')

    const result = await store.setReady(
      created.value.moderatorSessionToken,
      1,
      true,
    )

    expect(result).toEqual({
      ok: false,
      error: {
        code: 'NOT_AUTHORIZED',
        message: 'Only a player can change ready state',
      },
    })
  })
})

function createTestRoomCode(): string {
  // UUID chỉ chứa ký tự hexadecimal; lấy 6 ký tự đầu vẫn khớp DB constraint A-Z0-9.
  return randomUUID().replaceAll('-', '').slice(0, 6).toUpperCase()
}
