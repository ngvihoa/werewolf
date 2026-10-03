import type {
  CreatedGame,
  GameMutationResult,
  JoinedGame,
  StoreResult,
} from '../model'
import type { RoleCompositionSelection } from '../../domain'
import type { PostgresStoreDeps } from './shared'
import type { CreateGameInput } from '../game-store'

import { and, desc, eq } from 'drizzle-orm'
import {
  gameQueueSteps,
  gameSessions,
  gamePlayers,
  gameEvents,
  games,
} from '#/db/schema'

import { createFirstNightState } from '../../orchestration/game-orchestrator'
import { storeErrorCodeSchema } from '../schema'
import { serializeGameEvent } from '../event-persistence'
import { playerSchema } from '../../schema'
import {
  assignRoles as assignRolesToPlayers,
  validateRoleComposition,
} from '../../rules/role-assignment'

import { isDuplicateDisplayNameCollision, isRoomCodeCollision } from './errors'
import { appendGameEvent } from './game-events'
import { failure } from './shared'
import {
  updateGameAndIncrementVersion,
  validateLobbyMutation,
  findActiveSession,
  isGameController,
  lockGame,
} from './sessions'
import {
  replayCommandReceipt,
  hashMutationRequest,
  saveCommandReceipt,
} from './command-receipts'

// Runtime schema là source of truth cho mọi error code được trả qua StoreResult.
const STORE_ERROR_CODE = storeErrorCodeSchema.enum

const MAX_ROOM_CODE_ATTEMPTS = 20

export async function createGame(
  deps: PostgresStoreDeps,
  input: CreateGameInput,
): Promise<StoreResult<CreatedGame>> {
  const { database } = deps

  // tạo session token
  const now = deps.now()

  const rawSessionToken = deps.createSessionToken()
  const hashedSessionToken = deps.hashSessionToken(rawSessionToken)
  const expiresAt = deps.createSessionExpiry(now)
  const mode = input.mode
  const ownerName = (
    mode === 'MODERATED' ? input.moderatorName : input.creatorName
  ).trim()

  // Tạo room code
  let roomCode: string
  for (let attempt = 0; attempt < MAX_ROOM_CODE_ATTEMPTS; attempt += 1) {
    roomCode = deps.createRoomCode()
    try {
      // Kiểm tra room code đã tồn tại chưa khi tạo room
      // Nếu tạo failed tức room code đã tồn tại
      const createRoomResult = await database.transaction(
        async (transaction) => {
          // Tạo game mới
          const [game] = await transaction
            .insert(games)
            .values({
              roomCode,
              moderatorName: ownerName,
              mode,
            })
            .returning({
              id: games.id,
              roomCode: games.roomCode,
              version: games.version,
            })

          if (!game) {
            // Đây là lỗi invariant của persistence layer, không phải lỗi transport oRPC.
            throw new Error('Database did not return the created game')
          }

          if (mode === 'MODERATED') {
            // Tạo session token
            await transaction.insert(gameSessions).values({
              gameId: game.id,
              playerId: null,
              kind: 'MODERATOR',
              tokenHash: hashedSessionToken,
              expiresAt,
              createdAt: now,
              lastSeenAt: now,
            })

            // Validate event trước khi tách thành type và JSONB payload.
            const createdEvent = serializeGameEvent({
              type: 'GAME_CREATED',
            })

            // Tạo event đầu tiên
            await transaction.insert(gameEvents).values({
              gameId: game.id,
              round: 0,
              phase: 'SETUP',
              sequence: 1,
              type: createdEvent.type,
              payload: createdEvent.payload,
              createdAt: now,
              createdBy: 'SYSTEM',
              targetPlayerId: null,
              actorPlayerId: null,
            })

            return {
              // Giữ `true` ở dạng literal để khớp nhánh thành công của StoreResult.
              ok: true as const,
              value: {
                mode,
                gameId: game.id,
                roomCode: game.roomCode,
                moderatorSessionToken: rawSessionToken,
                version: game.version,
              } satisfies CreatedGame,
            }
          }

          // SELF: chủ phòng là một player thường, được đánh dấu is_host.
          const [creator] = await transaction
            .insert(gamePlayers)
            .values({
              gameId: game.id,
              displayName: ownerName,
              isModerator: false,
              isHost: true,
              isReady: false,
              isAlive: true,
              joinedAt: now,
            })
            .returning({
              id: gamePlayers.id,
              displayName: gamePlayers.displayName,
            })

          if (!creator) {
            throw new Error(
              'Database did not return the created creator player',
            )
          }

          await transaction.insert(gameSessions).values({
            gameId: game.id,
            playerId: creator.id,
            kind: 'PLAYER',
            tokenHash: hashedSessionToken,
            expiresAt,
            createdAt: now,
            lastSeenAt: now,
          })

          const createdEvent = serializeGameEvent({ type: 'GAME_CREATED' })
          const joinedEvent = serializeGameEvent({
            type: 'PLAYER_JOINED',
            playerId: creator.id,
            displayName: creator.displayName,
          })
          await transaction.insert(gameEvents).values([
            {
              gameId: game.id,
              round: 0,
              phase: 'SETUP',
              sequence: 1,
              type: createdEvent.type,
              payload: createdEvent.payload,
              createdAt: now,
              createdBy: 'SYSTEM',
              targetPlayerId: null,
              actorPlayerId: null,
            },
            {
              gameId: game.id,
              round: 0,
              phase: 'SETUP',
              sequence: 2,
              type: joinedEvent.type,
              payload: joinedEvent.payload,
              createdAt: now,
              createdBy: 'PLAYER',
              targetPlayerId: null,
              actorPlayerId: creator.id,
            },
          ])

          return {
            ok: true as const,
            value: {
              mode,
              gameId: game.id,
              roomCode: game.roomCode,
              playerId: creator.id,
              playerSessionToken: rawSessionToken,
              version: game.version,
            } satisfies CreatedGame,
          }
        },
      )

      return createRoomResult
    } catch (error) {
      if (isRoomCodeCollision(error)) {
        continue
      }

      throw error
    }
  }

  throw new Error(
    `Could not create a unique room code after ${MAX_ROOM_CODE_ATTEMPTS} attempts`,
  )
}

export async function joinGame(
  deps: PostgresStoreDeps,
  _roomCode: string,
  _displayName: string,
): Promise<StoreResult<JoinedGame>> {
  const { database } = deps
  const roomCode = _roomCode.trim().toUpperCase()
  const displayName = _displayName.trim()

  // Chuẩn bị token bên ngoài để transaction chỉ chứa thao tác database.
  const now = deps.now()
  const rawSessionToken = deps.createSessionToken()
  const hashedSessionToken = deps.hashSessionToken(rawSessionToken)
  const expiresAt = deps.createSessionExpiry(now)

  try {
    // Player, session, event và version phải cùng thành công hoặc cùng rollback.
    return await database.transaction(async (transaction) => {
      // Tìm game bằng room code.
      const [game] = await transaction
        .select()
        .from(games)
        .where(eq(games.roomCode, roomCode))
        .orderBy(desc(games.createdAt))
        .limit(1)
        .for('update')

      if (!game) {
        return failure(STORE_ERROR_CODE.GAME_NOT_FOUND, 'Room not found')
      }

      if (game.status !== 'LOBBY') {
        return failure(
          STORE_ERROR_CODE.GAME_ALREADY_STARTED,
          'Game already started',
        )
      }

      // Tạo player mới và lấy id do PostgreSQL sinh ra.
      const [player] = await transaction
        .insert(gamePlayers)
        .values({
          gameId: game.id,
          displayName,
          isModerator: false,
          isReady: false,
          isAlive: true,
          joinedAt: now,
        })
        .returning({
          id: gamePlayers.id,
          displayName: gamePlayers.displayName,
        })

      if (!player) {
        throw new Error('Database did not return the created player')
      }

      // Lưu session của player trong cùng transaction.
      await transaction.insert(gameSessions).values({
        gameId: game.id,
        playerId: player.id,
        kind: 'PLAYER',
        tokenHash: hashedSessionToken,
        expiresAt,
        createdAt: now,
        lastSeenAt: now,
      })

      await appendGameEvent(transaction, {
        game,
        createdBy: 'PLAYER',
        actorPlayerId: player.id,
        createdAt: now,
        event: {
          type: 'PLAYER_JOINED',
          playerId: player.id,
          displayName: player.displayName,
        },
      })

      // Cập nhật version của game trong cùng transaction.
      const version = await updateGameAndIncrementVersion(
        transaction,
        game,
        now,
      )

      return {
        ok: true as const,
        value: {
          gameId: game.id,
          playerId: player.id,
          playerSessionToken: rawSessionToken,
          version,
        },
      }
    })
  } catch (error) {
    if (isDuplicateDisplayNameCollision(error)) {
      return failure(
        STORE_ERROR_CODE.DUPLICATE_DISPLAY_NAME,
        'Display name is already in use',
      )
    }

    throw error
  }
}

export async function setReady(
  deps: PostgresStoreDeps,
  sessionToken: string,
  expectedVersion: number,
  ready: boolean,
  idempotencyKey: string,
): Promise<StoreResult<GameMutationResult>> {
  const { database } = deps
  const sessionTokenHash = deps.hashSessionToken(sessionToken)
  const now = deps.now()

  return database.transaction(async (transaction) => {
    const session = await findActiveSession(transaction, sessionTokenHash, now)

    if (!session) {
      return failure(
        STORE_ERROR_CODE.SESSION_NOT_FOUND,
        'Session does not exist or is no longer active',
      )
    }

    if (session.kind !== 'PLAYER' || !session.playerId) {
      return failure(
        STORE_ERROR_CODE.NOT_AUTHORIZED,
        'Only a player can change ready state',
      )
    }

    const lockedGame = await lockGame(transaction, session.gameId)
    const requestHash = hashMutationRequest({
      type: 'SET_READY',
      expectedVersion,
      ready,
    })
    const replay = await replayCommandReceipt(
      transaction,
      session.id,
      idempotencyKey,
      requestHash,
    )
    if (replay) return replay

    const gameResult = validateLobbyMutation(lockedGame, expectedVersion)
    if (!gameResult.ok) return gameResult

    const game = gameResult.value

    const [player] = await transaction
      .select()
      .from(gamePlayers)
      .where(
        and(
          eq(gamePlayers.gameId, game.id),
          eq(gamePlayers.id, session.playerId),
        ),
      )
      .limit(1)

    if (!player) {
      return failure(
        STORE_ERROR_CODE.INVALID_GAME_STATE,
        'Session player is missing',
      )
    }

    if (player.isModerator) {
      return failure(
        STORE_ERROR_CODE.NOT_AUTHORIZED,
        'Only a player can change ready state',
      )
    }

    await transaction
      .update(gamePlayers)
      .set({ isReady: ready })
      .where(
        and(eq(gamePlayers.gameId, game.id), eq(gamePlayers.id, player.id)),
      )

    await appendGameEvent(transaction, {
      game,
      createdBy: 'PLAYER',
      actorPlayerId: player.id,
      createdAt: now,
      event: {
        type: 'PLAYER_READY_CHANGED',
        playerId: player.id,
        ready,
      },
    })

    const nextVersion = await updateGameAndIncrementVersion(
      transaction,
      game,
      now,
    )

    const result = {
      gameId: game.id,
      version: nextVersion,
    }
    await saveCommandReceipt(transaction, {
      gameId: game.id,
      sessionId: session.id,
      idempotencyKey,
      requestHash,
      commandType: 'SET_READY',
      expectedVersion,
      result,
    })

    return {
      ok: true as const,
      value: result,
    }
  })
}

export async function assignRoles(
  deps: PostgresStoreDeps,
  sessionToken: string,
  expectedVersion: number,
  idempotencyKey: string,
  composition: RoleCompositionSelection = { mode: 'DEFAULT' },
): Promise<StoreResult<GameMutationResult>> {
  const { database } = deps
  const sessionTokenHash = deps.hashSessionToken(sessionToken)
  const now = deps.now()

  return database.transaction(async (transaction) => {
    const session = await findActiveSession(transaction, sessionTokenHash, now)

    if (!session) {
      return failure(
        STORE_ERROR_CODE.SESSION_NOT_FOUND,
        'Session does not exist or is no longer active',
      )
    }

    const lockedGame = await lockGame(transaction, session.gameId)

    // MODERATED: Quản trò. SELF: chủ phòng cũng được phân vai (R24).
    if (
      !lockedGame ||
      !(await isGameController(transaction, session, lockedGame))
    ) {
      return failure(
        STORE_ERROR_CODE.NOT_AUTHORIZED,
        'Moderator session is required',
      )
    }

    const requestHash = hashMutationRequest({
      type: 'ASSIGN_ROLES',
      expectedVersion,
      composition,
    })
    const replay = await replayCommandReceipt(
      transaction,
      session.id,
      idempotencyKey,
      requestHash,
    )
    if (replay) return replay

    const gameResult = validateLobbyMutation(lockedGame, expectedVersion)
    if (!gameResult.ok) return gameResult

    const game = gameResult.value

    const players = await transaction
      .select({
        id: gamePlayers.id,
      })
      .from(gamePlayers)
      .where(
        and(
          eq(gamePlayers.gameId, game.id),
          eq(gamePlayers.isModerator, false),
        ),
      )

    const assignment = assignRolesToPlayers(
      players.map((player) => player.id),
      composition,
    )

    if (!assignment.ok) {
      return failure(
        STORE_ERROR_CODE.INVALID_GAME_STATE,
        assignment.error.message,
      )
    }

    for (const player of players) {
      // player.id là UUID string lấy từ kết quả SELECT.
      const role = assignment.value.get(player.id)

      if (!role) {
        // Đây là persistence invariant: mọi player phải được assign một role.
        throw new Error(`Role assignment is missing player ${player.id}`)
      }

      await transaction
        .update(gamePlayers)
        .set({
          role,
          abilityState:
            role === 'WITCH'
              ? {
                  healingPotionAvailable: true,
                  poisonPotionAvailable: true,
                }
              : role === 'ALPHA_WEREWOLF'
                ? { enhancedAttackAvailable: true }
                : role === 'WHITE_WOLF'
                  ? { killAvailable: true }
                  : role === 'ELDER'
                    ? { werewolfAttackSurvivalAvailable: true }
                    : role === 'HYBRID_WOLF'
                      ? { converted: false }
                      : null,
          isReady: false,
        })
        .where(
          and(eq(gamePlayers.gameId, game.id), eq(gamePlayers.id, player.id)),
        )
    }

    await appendGameEvent(transaction, {
      game,
      createdBy: session.kind,
      actorPlayerId: session.playerId,
      createdAt: now,
      event: { type: 'ROLES_ASSIGNED' },
    })

    const nextVersion = await updateGameAndIncrementVersion(
      transaction,
      game,
      now,
    )

    const result = {
      gameId: game.id,
      version: nextVersion,
    }
    await saveCommandReceipt(transaction, {
      gameId: game.id,
      sessionId: session.id,
      idempotencyKey,
      requestHash,
      commandType: 'ASSIGN_ROLES',
      expectedVersion,
      result,
    })

    return {
      ok: true as const,
      value: result,
    }
  })
}

export async function startGame(
  deps: PostgresStoreDeps,
  sessionToken: string,
  expectedVersion: number,
  idempotencyKey: string,
): Promise<StoreResult<GameMutationResult>> {
  const { database } = deps
  const sessionTokenHash = deps.hashSessionToken(sessionToken)
  const now = deps.now()

  return database.transaction(async (transaction) => {
    const session = await findActiveSession(transaction, sessionTokenHash, now)

    if (!session) {
      return failure(
        STORE_ERROR_CODE.SESSION_NOT_FOUND,
        'Session does not exist or is no longer active',
      )
    }

    const lockedGame = await lockGame(transaction, session.gameId)

    // MODERATED: Quản trò. SELF: chủ phòng cũng được bắt đầu ván.
    if (
      !lockedGame ||
      !(await isGameController(transaction, session, lockedGame))
    ) {
      return failure(
        STORE_ERROR_CODE.NOT_AUTHORIZED,
        'Moderator session is required',
      )
    }

    const requestHash = hashMutationRequest({
      type: 'START_GAME',
      expectedVersion,
    })
    const replay = await replayCommandReceipt(
      transaction,
      session.id,
      idempotencyKey,
      requestHash,
    )
    if (replay) return replay

    const gameResult = validateLobbyMutation(lockedGame, expectedVersion)
    if (!gameResult.ok) return gameResult

    const game = gameResult.value

    const players = await transaction
      .select({
        id: gamePlayers.id,
        role: gamePlayers.role,
        alive: gamePlayers.isAlive,
        isReady: gamePlayers.isReady,
        displayName: gamePlayers.displayName,
        abilityState: gamePlayers.abilityState,
      })
      .from(gamePlayers)
      .where(
        and(
          eq(gamePlayers.gameId, game.id),
          eq(gamePlayers.isModerator, false),
        ),
      )

    if (players.length === 0 || players.some((player) => !player.role)) {
      return failure(
        STORE_ERROR_CODE.ROLES_NOT_ASSIGNED,
        'Roles must be assigned before starting',
      )
    }

    if (players.some((player) => !player.isReady)) {
      return failure(
        STORE_ERROR_CODE.NOT_ALL_PLAYERS_READY,
        'Every player must be ready before starting',
      )
    }

    const domainPlayers = players.map((player) => {
      return playerSchema.parse({
        id: player.id,
        role: player.role,
        alive: player.alive,
        abilityState: player.abilityState,
      })
    })

    const composition = validateRoleComposition(
      domainPlayers.map((player) => player.role),
    )
    if (!composition.ok) {
      return failure(
        STORE_ERROR_CODE.INVALID_GAME_STATE,
        composition.error.message,
      )
    }

    const state = createFirstNightState(domainPlayers)

    await transaction.insert(gameQueueSteps).values(
      state.queue.map((item, index) => {
        return {
          gameId: game.id,
          round: state.round,
          position: index + 1,
          step: item.step,
          status: item.status,
          skipReason: item.skipReason,
          activatedAt: item.status === 'PENDING' ? null : now,
          completedAt:
            item.status === 'COMPLETED' || item.status === 'SKIPPED'
              ? now
              : null,
          createdAt: now,
        }
      }),
    )

    const nextVersion = await updateGameAndIncrementVersion(
      transaction,
      game,
      now,
      {
        state,
        status: 'IN_PROGRESS',
        phase: state.phase,
        round: state.round,
      },
    )

    await appendGameEvent(transaction, {
      game: {
        id: game.id,
        phase: state.phase,
        round: state.round,
      },
      createdBy: session.kind,
      actorPlayerId: session.playerId,
      createdAt: now,
      event: { type: 'GAME_STARTED' },
    })

    const result = {
      gameId: game.id,
      version: nextVersion,
    }
    await saveCommandReceipt(transaction, {
      gameId: game.id,
      sessionId: session.id,
      idempotencyKey,
      requestHash,
      commandType: 'START_GAME',
      expectedVersion,
      result,
    })

    return {
      ok: true as const,
      value: result,
    }
  })
}

export async function rematch(
  deps: PostgresStoreDeps,
  sessionToken: string,
  expectedVersion: number,
  idempotencyKey: string,
): Promise<StoreResult<GameMutationResult>> {
  const { database } = deps
  const sessionTokenHash = deps.hashSessionToken(sessionToken)
  const now = deps.now()

  return database.transaction(async (transaction) => {
    const session = await findActiveSession(transaction, sessionTokenHash, now)
    if (!session) {
      return failure(
        STORE_ERROR_CODE.SESSION_NOT_FOUND,
        'Session does not exist or is no longer active',
      )
    }
    const game = await lockGame(transaction, session.gameId)

    // MODERATED: Quản trò. SELF: chủ phòng cũng được rematch.
    if (!game || !(await isGameController(transaction, session, game))) {
      return failure(
        STORE_ERROR_CODE.NOT_AUTHORIZED,
        'Moderator session is required',
      )
    }

    const requestHash = hashMutationRequest({
      type: 'REMATCH',
      expectedVersion,
    })
    const replay = await replayCommandReceipt(
      transaction,
      session.id,
      idempotencyKey,
      requestHash,
    )
    if (replay) return replay
    if (!game) {
      return failure(STORE_ERROR_CODE.GAME_NOT_FOUND, 'Game not found')
    }
    if (game.version !== expectedVersion) {
      return failure(STORE_ERROR_CODE.STALE_VERSION, 'Game version is stale')
    }
    if (game.state?.phase !== 'GAME_OVER') {
      return failure(STORE_ERROR_CODE.INVALID_GAME_STATE, 'Game has not ended')
    }

    await transaction
      .delete(gameQueueSteps)
      .where(eq(gameQueueSteps.gameId, game.id))
    await transaction
      .update(gamePlayers)
      .set({ role: null, abilityState: null, isReady: false, isAlive: true })
      .where(eq(gamePlayers.gameId, game.id))
    await appendGameEvent(transaction, {
      game: { id: game.id, phase: 'SETUP', round: 0 },
      createdBy: session.kind,
      actorPlayerId: session.playerId,
      createdAt: now,
      event: { type: 'MATCH_RESET' },
    })
    const nextVersion = await updateGameAndIncrementVersion(
      transaction,
      game,
      now,
      { state: null, status: 'LOBBY', phase: 'SETUP', round: 0 },
    )
    const result = { gameId: game.id, version: nextVersion }
    await saveCommandReceipt(transaction, {
      gameId: game.id,
      sessionId: session.id,
      idempotencyKey,
      requestHash,
      commandType: 'REMATCH',
      expectedVersion,
      result,
    })
    return { ok: true as const, value: result }
  })
}
