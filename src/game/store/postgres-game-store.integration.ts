import { randomUUID } from 'node:crypto'

import { afterEach, describe, expect, it } from 'vitest'
import { and, asc, desc, eq, inArray } from 'drizzle-orm'
import { db } from '#/db/client'
import {
  commandReceipts,
  gameQueueSteps,
  gameSessions,
  gameActions,
  gamePlayers,
  gameEvents,
  games,
} from '#/db/schema'

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
    const result = await store.setReady(
      joined.value.playerSessionToken,
      2,
      true,
    )

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
    const result = await store.setReady(
      joined.value.playerSessionToken,
      1,
      true,
    )

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

describe('PostgresGameStore.assignRoles', () => {
  it('persists a valid role composition, event and next version atomically', async () => {
    const roomCode = createTestRoomCode()
    createdRoomCodes.push(roomCode)

    const store = new PostgresGameStore({ createRoomCode: () => roomCode })
    const created = await store.createGame('Test Moderator')
    if (!created.ok) throw new Error('Expected createGame to succeed')

    // Sáu lượt join đưa game từ version 1 lên version 7.
    for (const name of ['An', 'Binh', 'Cuong', 'Dung', 'Hoa', 'Lan']) {
      const joined = await store.joinGame(roomCode, name)
      if (!joined.ok) throw new Error('Expected joinGame to succeed')
    }

    const result = await store.assignRoles(
      created.value.moderatorSessionToken,
      7,
    )

    expect(result).toEqual({
      ok: true,
      value: { gameId: created.value.gameId, version: 8 },
    })

    const storedPlayers = await db
      .select({
        role: gamePlayers.role,
        abilityState: gamePlayers.abilityState,
        isReady: gamePlayers.isReady,
      })
      .from(gamePlayers)
      .where(eq(gamePlayers.gameId, created.value.gameId))

    // Composition phải đúng MVP và chỉ Witch có ability state.
    expect(storedPlayers.map((player) => player.role).sort()).toEqual(
      ['SEER', 'VILLAGER', 'VILLAGER', 'VILLAGER', 'WEREWOLF', 'WITCH'].sort(),
    )
    expect(storedPlayers.every((player) => !player.isReady)).toBe(true)
    expect(
      storedPlayers.find((player) => player.role === 'WITCH')?.abilityState,
    ).toEqual({
      healingPotionAvailable: true,
      poisonPotionAvailable: true,
    })
    expect(
      storedPlayers
        .filter((player) => player.role !== 'WITCH')
        .every((player) => player.abilityState === null),
    ).toBe(true)

    const [latestEvent] = await db
      .select({
        type: gameEvents.type,
        createdBy: gameEvents.createdBy,
        payload: gameEvents.payload,
      })
      .from(gameEvents)
      .where(eq(gameEvents.gameId, created.value.gameId))
      .orderBy(desc(gameEvents.sequence))
      .limit(1)

    expect(latestEvent).toEqual({
      type: 'ROLES_ASSIGNED',
      createdBy: 'MODERATOR',
      payload: {},
    })
  })
})

describe('PostgresGameStore.startGame', () => {
  it('persists initial state, queue, event and version atomically', async () => {
    const roomCode = createTestRoomCode()
    const now = new Date('2026-08-15T03:00:00.000Z')
    createdRoomCodes.push(roomCode)

    const store = new PostgresGameStore({
      createRoomCode: () => roomCode,
      now: () => now,
    })
    const created = await store.createGame('Test Moderator')
    if (!created.ok) throw new Error('Expected createGame to succeed')

    const playerSeeds = [
      ['An', 'WEREWOLF'],
      ['Binh', 'SEER'],
      ['Cuong', 'VILLAGER'],
      ['Dung', 'VILLAGER'],
      ['Hoa', 'VILLAGER'],
    ] as const

    // Seed một lobby hợp lệ để test riêng transaction startGame.
    await db.insert(gamePlayers).values(
      playerSeeds.map(([displayName, role]) => ({
        gameId: created.value.gameId,
        displayName,
        role,
        abilityState: null,
        isReady: true,
        isAlive: true,
        joinedAt: now,
      })),
    )

    const result = await store.startGame(created.value.moderatorSessionToken, 1)

    expect(result).toEqual({
      ok: true,
      value: { gameId: created.value.gameId, version: 2 },
    })

    const [storedGame] = await db
      .select()
      .from(games)
      .where(eq(games.id, created.value.gameId))
    const storedQueue = await db
      .select({
        position: gameQueueSteps.position,
        step: gameQueueSteps.step,
        status: gameQueueSteps.status,
        activatedAt: gameQueueSteps.activatedAt,
      })
      .from(gameQueueSteps)
      .where(eq(gameQueueSteps.gameId, created.value.gameId))
      .orderBy(asc(gameQueueSteps.position))
    const [latestEvent] = await db
      .select({
        sequence: gameEvents.sequence,
        round: gameEvents.round,
        phase: gameEvents.phase,
        type: gameEvents.type,
        createdBy: gameEvents.createdBy,
      })
      .from(gameEvents)
      .where(eq(gameEvents.gameId, created.value.gameId))
      .orderBy(desc(gameEvents.sequence))
      .limit(1)

    expect(storedGame).toMatchObject({
      status: 'IN_PROGRESS',
      phase: 'NIGHT',
      round: 1,
      version: 2,
      state: {
        phase: 'NIGHT',
        round: 1,
      },
    })
    expect(storedQueue).toEqual([
      {
        position: 1,
        step: 'SEER_INSPECT',
        status: 'ACTIVE',
        activatedAt: now,
      },
      {
        position: 2,
        step: 'WEREWOLF_ATTACK',
        status: 'PENDING',
        activatedAt: null,
      },
    ])
    expect(latestEvent).toEqual({
      sequence: 2,
      round: 1,
      phase: 'NIGHT',
      type: 'GAME_STARTED',
      createdBy: 'MODERATOR',
    })
  })
})

describe('PostgresGameStore.getGameView', () => {
  it('rejects a session token that does not exist', async () => {
    const store = new PostgresGameStore()

    const result = await store.getGameView(`missing-${randomUUID()}`)

    expect(result).toEqual({
      ok: false,
      error: {
        code: 'SESSION_NOT_FOUND',
        message: 'Session does not exist or is no longer active',
      },
    })
  })

  it('projects permission-aware views with chronological history', async () => {
    const roomCode = createTestRoomCode()
    createdRoomCodes.push(roomCode)

    const store = new PostgresGameStore({ createRoomCode: () => roomCode })
    const created = await store.createGame('Test Moderator')
    if (!created.ok) throw new Error('Expected createGame to succeed')

    const firstPlayer = await store.joinGame(roomCode, 'An')
    const secondPlayer = await store.joinGame(roomCode, 'Binh')
    if (!firstPlayer.ok || !secondPlayer.ok) {
      throw new Error('Expected both players to join')
    }

    // Gán hai role khác nhau để chứng minh Player chỉ nhận role của chính mình.
    await db
      .update(gamePlayers)
      .set({ role: 'SEER' })
      .where(eq(gamePlayers.id, firstPlayer.value.playerId))
    await db
      .update(gamePlayers)
      .set({ role: 'WEREWOLF' })
      .where(eq(gamePlayers.id, secondPlayer.value.playerId))

    const playerResult = await store.getGameView(
      firstPlayer.value.playerSessionToken,
    )
    const moderatorResult = await store.getGameView(
      created.value.moderatorSessionToken,
    )

    if (!playerResult.ok || playerResult.value.viewer !== 'PLAYER') {
      throw new Error('Expected a Player game view')
    }
    expect(playerResult.value.me).toMatchObject({
      id: firstPlayer.value.playerId,
      role: 'SEER',
    })

    // Public player list không được chứa role của bất kỳ người chơi nào.
    for (const player of playerResult.value.players) {
      expect(player).not.toHaveProperty('role')
    }
    expect(JSON.stringify(playerResult.value)).not.toContain('WEREWOLF')

    // DESC + LIMIT lấy đúng các event mới nhất, nhưng response vẫn theo timeline.
    expect(
      playerResult.value.publicHistory.map((event) => event.sequence),
    ).toEqual([1, 2, 3])

    if (!moderatorResult.ok || moderatorResult.value.viewer !== 'MODERATOR') {
      throw new Error('Expected a Moderator game view')
    }
    expect(
      moderatorResult.value.game.history.map((event) => event.sequence),
    ).toEqual([1, 2, 3])
    expect(
      moderatorResult.value.game.lobbyPlayers.map((player) => player.role),
    ).toEqual(['SEER', 'WEREWOLF'])
  })
})

describe('PostgresGameStore.execute', () => {
  it('persists an authorized command and its confirmation atomically', async () => {
    const roomCode = createTestRoomCode()
    createdRoomCodes.push(roomCode)

    const store = new PostgresGameStore({ createRoomCode: () => roomCode })
    const created = await store.createGame('Test Moderator')
    if (!created.ok) throw new Error('Expected createGame to succeed')

    const joinedPlayers: Array<{
      playerId: string
      playerSessionToken: string
    }> = []
    for (const displayName of ['Seer', 'Wolf', 'An', 'Binh', 'Cuong']) {
      const joined = await store.joinGame(roomCode, displayName)
      if (!joined.ok) throw new Error('Expected player to join')
      joinedPlayers.push(joined.value)
    }

    const roles = [
      'SEER',
      'WEREWOLF',
      'VILLAGER',
      'VILLAGER',
      'VILLAGER',
    ] as const

    // Seed role và ready để fixture tập trung kiểm tra execute, không kiểm tra
    // lại assignRoles/setReady đã có integration tests riêng.
    for (const [index, player] of joinedPlayers.entries()) {
      await db
        .update(gamePlayers)
        .set({ role: roles[index], isReady: true })
        .where(eq(gamePlayers.id, player.playerId))
    }

    const [lobbyGame] = await db
      .select({ version: games.version })
      .from(games)
      .where(eq(games.id, created.value.gameId))
    if (!lobbyGame) throw new Error('Expected game to exist')

    const started = await store.startGame(
      created.value.moderatorSessionToken,
      lobbyGame.version,
    )
    if (!started.ok) throw new Error('Expected game to start')

    const seer = joinedPlayers[0]
    const wolf = joinedPlayers[1]
    if (!seer || !wolf) throw new Error('Expected Seer and Werewolf fixtures')

    const command = {
      type: 'SUBMIT_NIGHT_ACTION' as const,
      action: {
        type: 'SEER_INSPECT' as const,
        actorId: seer.playerId,
        targetId: wolf.playerId,
      },
    }

    // Moderator không thể giả danh Player dù command payload chứa actor hợp lệ.
    const unauthorized = await store.execute({
      gameId: created.value.gameId,
      sessionToken: created.value.moderatorSessionToken,
      idempotencyKey: 'unauthorized-seer-action',
      expectedVersion: started.value.version,
      command,
    })
    expect(unauthorized).toMatchObject({
      ok: false,
      error: { code: 'NOT_AUTHORIZED' },
    })

    const submitted = await store.execute({
      gameId: created.value.gameId,
      sessionToken: seer.playerSessionToken,
      idempotencyKey: 'submit-seer-action',
      expectedVersion: started.value.version,
      command,
    })
    expect(submitted).toEqual({
      ok: true,
      value: {
        gameId: created.value.gameId,
        version: started.value.version + 1,
      },
    })
    if (!submitted.ok) throw new Error('Expected action submission to succeed')

    const retried = await store.execute({
      gameId: created.value.gameId,
      sessionToken: seer.playerSessionToken,
      idempotencyKey: 'submit-seer-action',
      expectedVersion: started.value.version,
      command,
    })
    expect(retried).toEqual(submitted)

    const receipts = await db
      .select()
      .from(commandReceipts)
      .where(eq(commandReceipts.gameId, created.value.gameId))
    expect(receipts).toHaveLength(1)

    // Cùng expectedVersion cũ phải bị từ chối trước khi rule engine chạy lại.
    const stale = await store.execute({
      gameId: created.value.gameId,
      sessionToken: seer.playerSessionToken,
      idempotencyKey: 'stale-seer-action',
      expectedVersion: started.value.version,
      command,
    })
    expect(stale).toMatchObject({
      ok: false,
      error: { code: 'STALE_VERSION' },
    })

    const rejected = await store.execute({
      gameId: created.value.gameId,
      sessionToken: created.value.moderatorSessionToken,
      idempotencyKey: 'reject-seer-action',
      expectedVersion: submitted.value.version,
      command: { type: 'REJECT_STEP', reason: 'Please choose again' },
    })
    if (!rejected.ok) throw new Error('Expected rejection to succeed')

    // Rejected action không còn giữ partial unique slot, nên cùng queue step
    // có thể nhận attempt tiếp theo.
    const resubmitted = await store.execute({
      gameId: created.value.gameId,
      sessionToken: seer.playerSessionToken,
      idempotencyKey: 'resubmit-seer-action',
      expectedVersion: rejected.value.version,
      command,
    })
    if (!resubmitted.ok) throw new Error('Expected resubmission to succeed')

    const confirmed = await store.execute({
      gameId: created.value.gameId,
      sessionToken: created.value.moderatorSessionToken,
      idempotencyKey: 'confirm-seer-action',
      expectedVersion: resubmitted.value.version,
      command: { type: 'CONFIRM_STEP' },
    })
    expect(confirmed).toEqual({
      ok: true,
      value: {
        gameId: created.value.gameId,
        version: resubmitted.value.version + 1,
      },
    })

    const [storedGame] = await db
      .select({ state: games.state, version: games.version })
      .from(games)
      .where(eq(games.id, created.value.gameId))
    const storedSteps = await db
      .select({ step: gameQueueSteps.step, status: gameQueueSteps.status })
      .from(gameQueueSteps)
      .where(eq(gameQueueSteps.gameId, created.value.gameId))
      .orderBy(asc(gameQueueSteps.position))
    const storedActions = await db
      .select()
      .from(gameActions)
      .where(eq(gameActions.gameId, created.value.gameId))
      .orderBy(asc(gameActions.attempt))
    const commandEvents = await db
      .select({ type: gameEvents.type, createdBy: gameEvents.createdBy })
      .from(gameEvents)
      .where(eq(gameEvents.gameId, created.value.gameId))
      .orderBy(asc(gameEvents.sequence))

    expect(storedGame).toMatchObject({
      version: started.value.version + 4,
      state: { pendingNightAction: null },
    })
    expect(storedSteps).toEqual([
      { step: 'SEER_INSPECT', status: 'COMPLETED' },
      { step: 'WEREWOLF_ATTACK', status: 'ACTIVE' },
    ])
    expect(storedActions).toMatchObject([
      {
        actorPlayerId: seer.playerId,
        attempt: 1,
        type: 'SEER_INSPECT',
        status: 'REJECTED',
        rejectionReason: 'Please choose again',
      },
      {
        actorPlayerId: seer.playerId,
        attempt: 2,
        type: 'SEER_INSPECT',
        payload: { actorId: seer.playerId, targetId: wolf.playerId },
        status: 'CONFIRMED',
      },
    ])
    expect(commandEvents.slice(-6)).toEqual([
      { type: 'NIGHT_ACTION_SUBMITTED', createdBy: 'PLAYER' },
      { type: 'NIGHT_ACTION_REJECTED', createdBy: 'MODERATOR' },
      { type: 'NIGHT_ACTION_SUBMITTED', createdBy: 'PLAYER' },
      { type: 'NIGHT_ACTION_CONFIRMED', createdBy: 'MODERATOR' },
      { type: 'SEER_RESULT_RECORDED', createdBy: 'MODERATOR' },
      { type: 'QUEUE_STEP_ACTIVATED', createdBy: 'MODERATOR' },
    ])
  })
})

function createTestRoomCode(): string {
  // UUID chỉ chứa ký tự hexadecimal; lấy 6 ký tự đầu vẫn khớp DB constraint A-Z0-9.
  return randomUUID().replaceAll('-', '').slice(0, 6).toUpperCase()
}
