import type {
  PersistedGameEvent,
  StoreErrorCode,
  GameMutationResult,
  CreatedGame,
  StoreResult,
  JoinedGame,
  SessionKind,
  LocalGame,
} from './model'
import type { ExecuteGameCommandInput, GameStore } from './game-store'
import type { GameView, ProjectionViewer } from '../projections/model'
import type { GameCommand } from '../orchestration/commands'
import type { GameState } from '../orchestration/model'
import type { GameEvent } from '../orchestration/events'

import { createHash } from 'node:crypto'

import { and, desc, eq, gt, isNull } from 'drizzle-orm'
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

import { validateRoleComposition, assignRoles } from '../rules/role-assignment'
import { gameCommandSchema } from '../orchestration/schema'
import { projectGameView } from '../projections/project-game-view'
import { playerSchema } from '../schema'
import {
  createSessionExpiry,
  createSessionToken,
  hashSessionToken,
} from '../auth/session-token'
import {
  createFirstNightState,
  executeCommand,
} from '../orchestration/game-orchestrator'

import { deserializeGameEvent, serializeGameEvent } from './event-persistence'
import { authorizeCommand } from './command-authorization'
import { createRoomCode } from './utils.room-code'
import {
  gameMutationResultSchema,
  storeErrorCodeSchema,
  eventActorSchema,
} from './schema'

const MAX_ROOM_CODE_ATTEMPTS = 20

// Runtime schema là source of truth cho mọi error code được trả qua StoreResult.
const STORE_ERROR_CODE = storeErrorCodeSchema.enum

type PostgresGameStoreDependencies = {
  database?: typeof db
  createRoomCode?: () => string
  createSessionToken?: () => string
  hashSessionToken?: (token: string) => string
  createSessionExpiry?: (now: Date) => Date
  now?: () => Date
}

type DatabaseTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0]

type GameRow = typeof games.$inferSelect

// Caller chỉ patch các cột state có thể thay đổi trong một game mutation.
// `version` và `updatedAt` luôn do updateGameAndIncrementVersion quản lý.
type GameVersionChanges = Partial<
  Pick<
    typeof games.$inferInsert,
    'settings' | 'state' | 'status' | 'phase' | 'round'
  >
>

export class PostgresGameStore implements GameStore {
  readonly #database: NonNullable<PostgresGameStoreDependencies['database']>
  readonly #createRoomCode: NonNullable<
    PostgresGameStoreDependencies['createRoomCode']
  >
  readonly #createSessionToken: NonNullable<
    PostgresGameStoreDependencies['createSessionToken']
  >
  readonly #hashSessionToken: NonNullable<
    PostgresGameStoreDependencies['hashSessionToken']
  >
  readonly #createSessionExpiry: NonNullable<
    PostgresGameStoreDependencies['createSessionExpiry']
  >
  readonly #now: NonNullable<PostgresGameStoreDependencies['now']>

  constructor(dependencies: PostgresGameStoreDependencies = {}) {
    this.#database = dependencies.database ?? db
    this.#createRoomCode = dependencies.createRoomCode ?? createRoomCode
    this.#createSessionToken =
      dependencies.createSessionToken ?? createSessionToken
    this.#hashSessionToken = dependencies.hashSessionToken ?? hashSessionToken
    this.#createSessionExpiry =
      dependencies.createSessionExpiry ?? createSessionExpiry
    this.#now = dependencies.now ?? (() => new Date())
  }

  async createGame(moderatorName: string): Promise<StoreResult<CreatedGame>> {
    // tạo session token
    const now = this.#now()

    const rawSessionToken = this.#createSessionToken()
    const hashedSessionToken = this.#hashSessionToken(rawSessionToken)
    const expiresAt = this.#createSessionExpiry(now)

    // Tạo room code
    let roomCode: string
    for (let attempt = 0; attempt < MAX_ROOM_CODE_ATTEMPTS; attempt += 1) {
      roomCode = this.#createRoomCode()
      try {
        // Kiểm tra room code đã tồn tại chưa khi tạo room
        // Nếu tạo failed tức room code đã tồn tại
        const createRoomResult = await this.#database.transaction(
          async (transaction) => {
            // Tạo game mới
            const [game] = await transaction
              .insert(games)
              .values({
                roomCode,
                moderatorName: moderatorName.trim(),
              })
              .returning({
                id: games.id,
                roomCode: games.roomCode,
              })

            if (!game) {
              // Đây là lỗi invariant của persistence layer, không phải lỗi transport oRPC.
              throw new Error('Database did not return the created game')
            }

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
                gameId: game.id,
                roomCode: game.roomCode,
                moderatorSessionToken: rawSessionToken,
              },
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

  async joinGame(
    _roomCode: string,
    _displayName: string,
  ): Promise<StoreResult<JoinedGame>> {
    const roomCode = _roomCode.trim().toUpperCase()
    const displayName = _displayName.trim()

    // Chuẩn bị token bên ngoài để transaction chỉ chứa thao tác database.
    const now = this.#now()
    const rawSessionToken = this.#createSessionToken()
    const hashedSessionToken = this.#hashSessionToken(rawSessionToken)
    const expiresAt = this.#createSessionExpiry(now)

    try {
      // Player, session, event và version phải cùng thành công hoặc cùng rollback.
      return await this.#database.transaction(async (transaction) => {
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
        await updateGameAndIncrementVersion(transaction, game, now)

        return {
          ok: true as const,
          value: {
            gameId: game.id,
            playerId: player.id,
            playerSessionToken: rawSessionToken,
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

  async setReady(
    sessionToken: string,
    expectedVersion: number,
    ready: boolean,
    idempotencyKey: string,
  ): Promise<StoreResult<GameMutationResult>> {
    const sessionTokenHash = this.#hashSessionToken(sessionToken)
    const now = this.#now()

    return this.#database.transaction(async (transaction) => {
      const session = await findActiveSession(
        transaction,
        sessionTokenHash,
        now,
      )

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

  async assignRoles(
    sessionToken: string,
    expectedVersion: number,
    idempotencyKey: string,
  ): Promise<StoreResult<GameMutationResult>> {
    const sessionTokenHash = this.#hashSessionToken(sessionToken)
    const now = this.#now()

    return this.#database.transaction(async (transaction) => {
      const session = await findActiveSession(
        transaction,
        sessionTokenHash,
        now,
      )

      if (!session) {
        return failure(
          STORE_ERROR_CODE.SESSION_NOT_FOUND,
          'Session does not exist or is no longer active',
        )
      }

      // Chỉ Moderator mới được quyền phân vai.
      if (session.kind !== 'MODERATOR') {
        return failure(
          STORE_ERROR_CODE.NOT_AUTHORIZED,
          'Moderator session is required',
        )
      }

      const lockedGame = await lockGame(transaction, session.gameId)
      const requestHash = hashMutationRequest({
        type: 'ASSIGN_ROLES',
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
        })
        .from(gamePlayers)
        .where(
          and(
            eq(gamePlayers.gameId, game.id),
            eq(gamePlayers.isModerator, false),
          ),
        )

      const assignment = assignRoles(players.map((player) => player.id))

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
                  : role === 'ELDER'
                    ? { werewolfAttackSurvivalAvailable: true }
                    : null,
            isReady: false,
          })
          .where(
            and(eq(gamePlayers.gameId, game.id), eq(gamePlayers.id, player.id)),
          )
      }

      await appendGameEvent(transaction, {
        game,
        createdBy: 'MODERATOR',
        actorPlayerId: null,
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

  async startGame(
    sessionToken: string,
    expectedVersion: number,
    idempotencyKey: string,
  ): Promise<StoreResult<GameMutationResult>> {
    const sessionTokenHash = this.#hashSessionToken(sessionToken)
    const now = this.#now()

    return this.#database.transaction(async (transaction) => {
      const session = await findActiveSession(
        transaction,
        sessionTokenHash,
        now,
      )

      if (!session) {
        return failure(
          STORE_ERROR_CODE.SESSION_NOT_FOUND,
          'Session does not exist or is no longer active',
        )
      }

      // Chỉ Moderator mới được quyền phân vai.
      if (session.kind !== 'MODERATOR') {
        return failure(
          STORE_ERROR_CODE.NOT_AUTHORIZED,
          'Moderator session is required',
        )
      }

      const lockedGame = await lockGame(transaction, session.gameId)
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
        createdBy: 'MODERATOR',
        actorPlayerId: null,
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

  async rematch(
    sessionToken: string,
    expectedVersion: number,
    idempotencyKey: string,
  ): Promise<StoreResult<GameMutationResult>> {
    const sessionTokenHash = this.#hashSessionToken(sessionToken)
    const now = this.#now()

    return this.#database.transaction(async (transaction) => {
      const session = await findActiveSession(
        transaction,
        sessionTokenHash,
        now,
      )
      if (!session) {
        return failure(
          STORE_ERROR_CODE.SESSION_NOT_FOUND,
          'Session does not exist or is no longer active',
        )
      }
      if (session.kind !== 'MODERATOR') {
        return failure(
          STORE_ERROR_CODE.NOT_AUTHORIZED,
          'Moderator session is required',
        )
      }

      const game = await lockGame(transaction, session.gameId)
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
        return failure(
          STORE_ERROR_CODE.INVALID_GAME_STATE,
          'Game has not ended',
        )
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
        createdBy: 'MODERATOR',
        actorPlayerId: null,
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

  async getGameView(sessionToken: string): Promise<StoreResult<GameView>> {
    const sessionHash = this.#hashSessionToken(sessionToken)
    const now = this.#now()

    return this.#database.transaction(
      async (transaction) => {
        const session = await findActiveSession(transaction, sessionHash, now)

        if (!session) {
          return failure(
            STORE_ERROR_CODE.SESSION_NOT_FOUND,
            'Session does not exist or is no longer active',
          )
        }

        // Player session bắt buộc phải gắn với player id. Không dùng chuỗi rỗng
        // làm fallback vì nó sẽ che mất dữ liệu vi phạm DB invariant.
        const viewer: ProjectionViewer | null =
          session.kind === 'MODERATOR'
            ? { kind: 'MODERATOR', playerId: null }
            : session.playerId
              ? { kind: 'PLAYER', playerId: session.playerId }
              : null

        if (!viewer) {
          return failure(
            STORE_ERROR_CODE.INVALID_GAME_STATE,
            'Session is not valid',
          )
        }

        const [game] = await transaction
          .select()
          .from(games)
          .where(eq(games.id, session.gameId))
          .limit(1)

        if (!game) {
          return failure(STORE_ERROR_CODE.GAME_NOT_FOUND, 'Game not found')
        }

        const players = await transaction
          .select({
            id: gamePlayers.id,
            role: gamePlayers.role,
            alive: gamePlayers.isAlive,
            isReady: gamePlayers.isReady,
            displayName: gamePlayers.displayName,
            isModerator: gamePlayers.isModerator,
            abilityState: gamePlayers.abilityState,
          })
          .from(gamePlayers)
          .where(eq(gamePlayers.gameId, game.id))

        const events = await transaction
          .select()
          .from(gameEvents)
          .where(eq(gameEvents.gameId, game.id))
          .orderBy(desc(gameEvents.sequence))
          .limit(200)

        const allHistory = events.reverse().map((row) => ({
          id: row.id,
          sequence: row.sequence,
          gameId: row.gameId,
          actor: eventActorSchema.parse(row.createdBy),
          actorPlayerId: row.actorPlayerId,
          createdAt: row.createdAt.toISOString(),
          event: deserializeGameEvent(row.type, row.payload),
        }))
        const resetIndex = allHistory
          .map((entry) => entry.event.type)
          .lastIndexOf('MATCH_RESET')
        const history = allHistory.slice(resetIndex + 1)

        const localGame: LocalGame = {
          id: game.id,
          roomCode: game.roomCode,
          version: game.version,
          moderatorName: game.moderatorName,
          lobbyPlayers: players.map((p) => ({
            id: p.id,
            role: p.role,
            alive: p.alive,
            abilityState: p.abilityState,
            isModerator: p.isModerator,
            displayName: p.displayName,
            ready: p.isReady,
          })),
          state: game.state,
          history,
        }

        const gameView = projectGameView(localGame, viewer)

        if (!gameView) {
          return failure(
            STORE_ERROR_CODE.INVALID_GAME_STATE,
            'Failed to project game view',
          )
        }

        return {
          ok: true as const,
          value: gameView,
        }
      },
      {
        // Các query game, players và events phải dùng chung một snapshot.
        accessMode: 'read only',
        isolationLevel: 'repeatable read',
      },
    )
  }

  async execute(
    input: ExecuteGameCommandInput,
  ): Promise<StoreResult<GameMutationResult>> {
    const sessionHash = this.#hashSessionToken(input.sessionToken)
    const now = this.#now()

    return this.#database.transaction(async (transaction) => {
      const session = await findActiveSession(transaction, sessionHash, now)
      // Token thuộc game khác cũng trả SESSION_NOT_FOUND để không làm lộ game.
      if (!session || session.gameId !== input.gameId) {
        return failure(
          STORE_ERROR_CODE.SESSION_NOT_FOUND,
          'Session does not exist for this game',
        )
      }

      const game = await lockGame(transaction, input.gameId)

      if (!game) {
        return failure(STORE_ERROR_CODE.GAME_NOT_FOUND, 'Game not found')
      }

      const requestHash = hashCommandRequest(input)
      const [receipt] = await transaction
        .select({
          requestHash: commandReceipts.requestHash,
          response: commandReceipts.response,
        })
        .from(commandReceipts)
        .where(
          and(
            eq(commandReceipts.sessionId, session.id),
            eq(commandReceipts.idempotencyKey, input.idempotencyKey),
          ),
        )
        .limit(1)

      if (receipt) {
        if (receipt.requestHash !== requestHash) {
          return failure(
            STORE_ERROR_CODE.IDEMPOTENCY_KEY_REUSED,
            'Idempotency key was already used for another command',
          )
        }
        return {
          ok: true as const,
          value: gameMutationResultSchema.parse(receipt.response),
        }
      }

      if (game.version !== input.expectedVersion) {
        return failure(STORE_ERROR_CODE.STALE_VERSION, 'Game version is stale')
      }

      if (!game.state || game.status !== 'IN_PROGRESS') {
        return failure(
          STORE_ERROR_CODE.INVALID_GAME_STATE,
          'Game has not started or has already ended',
        )
      }

      const authorization = authorizeCommand(session, input.command)
      if (!authorization.ok) return authorization

      // Rule engine không biết database; nó chỉ nhận state cũ và trả
      // state + events mới hoặc domain error.
      const outcome = executeCommand(game.state, input.command)
      if (!outcome.ok) {
        return failure(
          STORE_ERROR_CODE.INVALID_GAME_STATE,
          outcome.error.message,
        )
      }

      await persistGameAction(transaction, {
        gameId: game.id,
        previousState: game.state,
        command: input.command,
        sessionId: session.id,
        now,
      })

      await syncGamePlayers(transaction, game.id, outcome.value.state)
      await syncGameQueue(transaction, game.id, outcome.value.state, now)

      const nextVersion = await updateGameAndIncrementVersion(
        transaction,
        game,
        now,
        {
          state: outcome.value.state,
          status:
            outcome.value.state.phase === 'GAME_OVER'
              ? 'GAME_OVER'
              : 'IN_PROGRESS',
          phase: outcome.value.state.phase,
          round: outcome.value.state.round,
        },
      )

      // Event append cùng transaction nên state, version và audit history
      // luôn cùng thành công hoặc cùng rollback.
      for (const event of outcome.value.events) {
        await appendGameEvent(transaction, {
          game: {
            id: game.id,
            phase: outcome.value.state.phase,
            round: outcome.value.state.round,
          },
          createdBy: session.kind,
          actorPlayerId: session.playerId,
          targetPlayerId: getEventTargetPlayerId(event),
          createdAt: now,
          event,
        })
      }

      const result = {
        gameId: game.id,
        version: nextVersion,
      }

      await transaction.insert(commandReceipts).values({
        gameId: game.id,
        sessionId: session.id,
        idempotencyKey: input.idempotencyKey,
        requestHash,
        commandType: input.command.type,
        expectedVersion: input.expectedVersion,
        resultingVersion: nextVersion,
        status: 'ACCEPTED',
        response: result,
      })

      return {
        ok: true as const,
        value: result,
      }
    })
  }
}

/**************************** Helper Functions ****************************/

function failure(code: StoreErrorCode, message: string): StoreResult<never> {
  // Mọi business error của store dùng chung một representation.
  return { ok: false, error: { code, message } }
}

function hashCommandRequest(input: ExecuteGameCommandInput): string {
  return hashMutationRequest({
    expectedVersion: input.expectedVersion,
    command: gameCommandSchema.parse(input.command),
  })
}

function hashMutationRequest(request: unknown): string {
  return createHash('sha256').update(JSON.stringify(request)).digest('hex')
}

async function replayCommandReceipt(
  transaction: DatabaseTransaction,
  sessionId: string,
  idempotencyKey: string,
  requestHash: string,
): Promise<StoreResult<GameMutationResult> | null> {
  const [receipt] = await transaction
    .select({
      requestHash: commandReceipts.requestHash,
      response: commandReceipts.response,
    })
    .from(commandReceipts)
    .where(
      and(
        eq(commandReceipts.sessionId, sessionId),
        eq(commandReceipts.idempotencyKey, idempotencyKey),
      ),
    )
    .limit(1)

  if (!receipt) return null
  if (receipt.requestHash !== requestHash) {
    return failure(
      STORE_ERROR_CODE.IDEMPOTENCY_KEY_REUSED,
      'Idempotency key was already used for another command',
    )
  }
  return {
    ok: true,
    value: gameMutationResultSchema.parse(receipt.response),
  }
}

async function saveCommandReceipt(
  transaction: DatabaseTransaction,
  input: {
    gameId: string
    sessionId: string
    idempotencyKey: string
    requestHash: string
    commandType: string
    expectedVersion: number
    result: GameMutationResult
  },
): Promise<void> {
  await transaction.insert(commandReceipts).values({
    gameId: input.gameId,
    sessionId: input.sessionId,
    idempotencyKey: input.idempotencyKey,
    requestHash: input.requestHash,
    commandType: input.commandType,
    expectedVersion: input.expectedVersion,
    resultingVersion: input.result.version,
    status: 'ACCEPTED',
    response: input.result,
  })
}

async function findActiveSession(
  transaction: DatabaseTransaction,
  tokenHash: string,
  now: Date,
) {
  // Helper chỉ resolve session; từng mutation vẫn tự kiểm tra quyền cụ thể.
  const [session] = await transaction
    .select({
      id: gameSessions.id,
      gameId: gameSessions.gameId,
      playerId: gameSessions.playerId,
      kind: gameSessions.kind,
    })
    .from(gameSessions)
    .where(
      and(
        eq(gameSessions.tokenHash, tokenHash),
        isNull(gameSessions.revokedAt),
        gt(gameSessions.expiresAt, now),
      ),
    )
    .limit(1)

  return session ?? null
}

async function lockGame(
  transaction: DatabaseTransaction,
  gameId: string,
): Promise<GameRow | null> {
  // Tất cả mutation lock cùng game row để có chung thứ tự version và event.
  const [game] = await transaction
    .select()
    .from(games)
    .where(eq(games.id, gameId))
    .limit(1)
    .for('update')

  return game ?? null
}

function validateLobbyMutation(
  game: GameRow | null,
  expectedVersion: number,
): StoreResult<GameRow> {
  // Các kiểm tra này chạy trong memory sau một query lock duy nhất.
  if (!game) return failure(STORE_ERROR_CODE.GAME_NOT_FOUND, 'Game not found')

  if (game.version !== expectedVersion) {
    return failure(STORE_ERROR_CODE.STALE_VERSION, 'Game version is stale')
  }

  if (game.status !== 'LOBBY') {
    return failure(
      STORE_ERROR_CODE.GAME_ALREADY_STARTED,
      'Game has already started',
    )
  }

  return { ok: true, value: game }
}

async function persistGameAction(
  transaction: DatabaseTransaction,
  input: {
    gameId: string
    previousState: GameState
    command: GameCommand
    sessionId: string
    now: Date
  },
): Promise<void> {
  // For players
  if (input.command.type === 'SUBMIT_NIGHT_ACTION') {
    const action = input.command.action
    const [queueStep] = await transaction
      .select({ id: gameQueueSteps.id })
      .from(gameQueueSteps)
      .where(
        and(
          eq(gameQueueSteps.gameId, input.gameId),
          eq(gameQueueSteps.round, input.previousState.round),
          eq(gameQueueSteps.step, action.type),
        ),
      )
      .limit(1)

    if (!queueStep) {
      throw new Error('Active queue step is missing from the database')
    }

    const [latestAttempt] = await transaction
      .select({ attempt: gameActions.attempt })
      .from(gameActions)
      .where(eq(gameActions.queueStepId, queueStep.id))
      .orderBy(desc(gameActions.attempt))
      .limit(1)

    // `type` đã có cột riêng; JSONB chỉ giữ phần payload của action.
    const { type, ...payload } = action
    await transaction.insert(gameActions).values({
      gameId: input.gameId,
      queueStepId: queueStep.id,
      actorPlayerId: action.actorId,
      attempt: (latestAttempt?.attempt ?? 0) + 1,
      type,
      payload,
      status: 'SUBMITTED',
      submittedAt: input.now,
    })
    return
  }

  if (
    input.command.type !== 'CONFIRM_STEP' &&
    input.command.type !== 'REJECT_STEP'
  ) {
    return
  }

  // For moderator confirms/rejects

  const pendingAction = input.previousState.pendingNightAction
  if (!pendingAction) {
    throw new Error('Pending action is missing from game state')
  }

  const [storedAction] = await transaction
    .select({ id: gameActions.id })
    .from(gameActions)
    .where(
      and(
        eq(gameActions.gameId, input.gameId),
        eq(gameActions.type, pendingAction.type),
        eq(gameActions.status, 'SUBMITTED'),
      ),
    )
    .orderBy(desc(gameActions.attempt))
    .limit(1)

  if (!storedAction) {
    throw new Error('Submitted action is missing from the database')
  }

  const decision =
    input.command.type === 'REJECT_STEP'
      ? {
          status: 'REJECTED' as const,
          rejectionReason: input.command.reason.trim(),
        }
      : { status: 'CONFIRMED' as const, rejectionReason: null }

  await transaction
    .update(gameActions)
    .set({
      ...decision,
      decidedBySessionId: input.sessionId,
      decidedAt: input.now,
    })
    .where(eq(gameActions.id, storedAction.id))
}

async function syncGamePlayers(
  transaction: DatabaseTransaction,
  gameId: string,
  state: GameState,
): Promise<void> {
  // Player count is small (5-12); explicit row updates keep this easy to audit.
  for (const player of state.players) {
    await transaction
      .update(gamePlayers)
      .set({
        isAlive: player.alive,
        abilityState: player.abilityState,
      })
      .where(and(eq(gamePlayers.gameId, gameId), eq(gamePlayers.id, player.id)))
  }
}

async function syncGameQueue(
  transaction: DatabaseTransaction,
  gameId: string,
  state: GameState,
  now: Date,
): Promise<void> {
  const storedSteps = await transaction
    .select()
    .from(gameQueueSteps)
    .where(
      and(
        eq(gameQueueSteps.gameId, gameId),
        eq(gameQueueSteps.round, state.round),
      ),
    )

  const storedStepByType = new Map(storedSteps.map((step) => [step.step, step]))

  for (const [index, item] of state.queue.entries()) {
    const storedStep = storedStepByType.get(item.step)
    const active = item.status !== 'PENDING'
    const finished = item.status === 'COMPLETED' || item.status === 'SKIPPED'
    const lifecycle = {
      status: item.status,
      skipReason: item.skipReason,
      activatedAt: active ? (storedStep?.activatedAt ?? now) : null,
      completedAt: finished ? (storedStep?.completedAt ?? now) : null,
    }

    if (storedStep) {
      await transaction
        .update(gameQueueSteps)
        .set(lifecycle)
        .where(eq(gameQueueSteps.id, storedStep.id))
      continue
    }

    // Khi sang đêm mới, rule engine tạo queue mới và persistence insert
    // toàn bộ step của round đó trong transaction hiện tại.
    await transaction.insert(gameQueueSteps).values({
      gameId,
      round: state.round,
      position: index + 1,
      step: item.step,
      ...lifecycle,
      createdAt: now,
    })
  }
}

function getEventTargetPlayerId(event: GameEvent): string | null {
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
    default:
      return null
  }
}

async function appendGameEvent(
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

async function updateGameAndIncrementVersion(
  transaction: DatabaseTransaction,
  game: Pick<GameRow, 'id' | 'version'>,
  now: Date,
  changes: GameVersionChanges = {},
): Promise<number> {
  const nextVersion = game.version + 1

  // Version thay đổi trong cùng transaction với state và event tương ứng.
  await transaction
    .update(games)
    .set({ ...changes, version: nextVersion, updatedAt: now })
    .where(eq(games.id, game.id))

  return nextVersion
}

function isRoomCodeCollision(error: unknown) {
  return isPostgresConstraintViolation(error, '23505', 'games_room_code_unique')
}

function isDuplicateDisplayNameCollision(error: unknown) {
  return isPostgresConstraintViolation(
    error,
    '23505',
    'game_players_game_display_name_unique_idx',
  )
}

function isPostgresConstraintViolation(
  error: unknown,
  code: string,
  constraintName: string,
) {
  if (!error || typeof error !== 'object') {
    return false
  }

  // DrizzleQueryError giữ lỗi gốc của postgres-js trong `cause`.
  // Vẫn kiểm tra chính error để helper hoạt động cả khi nhận PostgresError trực tiếp.
  const wrappedError = error as { cause?: unknown }
  const candidates = [error, wrappedError.cause]

  return candidates.some(
    (candidate) =>
      candidate !== null &&
      typeof candidate === 'object' &&
      'code' in candidate &&
      candidate.code === code &&
      'constraint_name' in candidate &&
      candidate.constraint_name === constraintName,
  )
}
