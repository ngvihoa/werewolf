import { gameEvents, gamePlayers, games } from '#/db/schema'
import { afterEach, describe, expect, it } from 'vitest'
import { eq, inArray } from 'drizzle-orm'
import { db } from '#/db/client'

import {
  createSessionExpiry,
  createSessionToken,
  hashSessionToken,
} from '../auth/session-token'

import { PostgresGameStore } from './postgres-game-store'
import { purgeStaleGames } from './postgres/maintenance'

const createdRoomCodes: string[] = []
const DAY_MS = 24 * 60 * 60 * 1000

function makeDeps() {
  return {
    database: db,
    createRoomCode: () => {
      throw new Error('not used in purge tests')
    },
    createSessionToken,
    hashSessionToken,
    createSessionExpiry,
    now: () => new Date(),
  }
}

async function insertGame(input: {
  roomCode: string
  status: 'LOBBY' | 'IN_PROGRESS' | 'GAME_OVER'
  ageMs: number
}) {
  const roomCode = input.roomCode
  createdRoomCodes.push(roomCode)
  const [row] = await db
    .insert(games)
    .values({
      roomCode,
      moderatorName: 'Purge Test',
      status: input.status,
    })
    .returning({ id: games.id })
  // Lão hóa trực tiếp updated_at vì hook createGame không cho phép đụng độ này.
  await db
    .update(games)
    .set({ updatedAt: new Date(Date.now() - input.ageMs) })
    .where(eq(games.id, row.id))
  return row.id
}

afterEach(async () => {
  if (createdRoomCodes.length === 0) return
  await db.delete(games).where(inArray(games.roomCode, createdRoomCodes))
  createdRoomCodes.length = 0
})

describe('purgeStaleGames', () => {
  it('xóa ván GAME_OVER quá hạn và cascade toàn bộ dữ liệu con', async () => {
    const agedGameId = await insertGame({
      roomCode: 'PGE1AA',
      status: 'GAME_OVER',
      ageMs: 5 * DAY_MS,
    })
    await db.insert(gamePlayers).values({
      gameId: agedGameId,
      displayName: 'Người chơi còn sót',
    })
    await db.insert(gameEvents).values({
      gameId: agedGameId,
      sequence: 1,
      round: 1,
      phase: 'NIGHT',
      type: 'GAME_CREATED',
      createdBy: 'SYSTEM',
    })

    const freshGameId = await insertGame({
      roomCode: 'PGE1BB',
      status: 'GAME_OVER',
      ageMs: DAY_MS,
    })

    const purged = await purgeStaleGames(makeDeps())
    expect(purged).toBeGreaterThanOrEqual(1)

    const agedRows = await db
      .select({ id: games.id })
      .from(games)
      .where(eq(games.id, agedGameId))
    expect(agedRows).toHaveLength(0)
    const agedPlayers = await db
      .select({ id: gamePlayers.id })
      .from(gamePlayers)
      .where(eq(gamePlayers.gameId, agedGameId))
    expect(agedPlayers).toHaveLength(0)
    const agedEvents = await db
      .select({ id: gameEvents.id })
      .from(gameEvents)
      .where(eq(gameEvents.gameId, agedGameId))
    expect(agedEvents).toHaveLength(0)

    const freshRows = await db
      .select({ id: games.id })
      .from(games)
      .where(eq(games.id, freshGameId))
    expect(freshRows).toHaveLength(1)
  })

  it('dọn sảnh bỏ hoang và ván IN_PROGRESS bỏ bê theo đúng ngưỡng', async () => {
    const abandonedLobbyId = await insertGame({
      roomCode: 'PGE2AA',
      status: 'LOBBY',
      ageMs: 30 * 60 * 60 * 1000, // 30 giờ > 24 giờ
    })
    const stalledGameId = await insertGame({
      roomCode: 'PGE2BB',
      status: 'IN_PROGRESS',
      ageMs: 10 * DAY_MS, // 10 ngày > 7 ngày
    })
    const activeLobbyId = await insertGame({
      roomCode: 'PGE2CC',
      status: 'LOBBY',
      ageMs: 2 * 60 * 60 * 1000, // 2 giờ, phải sống sót
    })

    const purged = await purgeStaleGames(makeDeps())
    expect(purged).toBeGreaterThanOrEqual(2)

    for (const id of [abandonedLobbyId, stalledGameId]) {
      const rows = await db
        .select({ id: games.id })
        .from(games)
        .where(eq(games.id, id))
      expect(rows).toHaveLength(0)
    }
    const surviving = await db
      .select({ id: games.id })
      .from(games)
      .where(eq(games.id, activeLobbyId))
    expect(surviving).toHaveLength(1)
  })

  it('createGame vẫn thành công kể cả khi purge lỗi', async () => {
    const roomCode = 'PGE3AA'
    createdRoomCodes.push(roomCode)
    // Stub chỉ có execute (purge dùng) + transaction thật cho createGame;
    // cast vì type của deps là typeof db đầy đủ.
    const sabotagedDatabase = {
      execute: () => Promise.reject(new Error('purge exploded')),
      transaction: db.transaction.bind(db),
    } as unknown as typeof db
    const store = new PostgresGameStore({
      createRoomCode: () => roomCode,
      createSessionToken: () => `purge-test-${roomCode}`,
      database: sabotagedDatabase,
      now: () => new Date(),
    })

    const result = await store.createGame('Quản trò Purge')
    expect(result.ok).toBe(true)
  })
})
