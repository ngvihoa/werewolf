import type {
    PersistedGameEvent,
    StoreErrorCode,
    GameMutationResult,
    CreatedGame,
    StoreResult,
    JoinedGame,
    SessionKind,
} from './model'
import type { GameStore } from './game-store'

import { gameEvents, gamePlayers, games, gameSessions } from '#/db/schema'
import { and, desc, eq, gt, isNull } from 'drizzle-orm'
import { db } from '#/db/client'

import { assignRoles } from '../rules/role-assignment'
import {
    createSessionExpiry,
    createSessionToken,
    hashSessionToken,
} from '../auth/session-token'

import { storeErrorCodeSchema } from './schema'
import { serializeGameEvent } from './event-persistence'
import { createRoomCode } from './utils.room-code'

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

type DatabaseTransaction = Parameters<
    Parameters<typeof db.transaction>[0]
>[0]

type GameRow = typeof games.$inferSelect

export class PostgresGameStore implements Pick<
    GameStore,
    'createGame' | 'joinGame' | 'setReady' | 'assignRoles'
> {
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
                    return failure(
                        STORE_ERROR_CODE.GAME_NOT_FOUND,
                        'Room not found',
                    )
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
                await incrementGameVersion(transaction, game, now)

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

            const gameResult = validateLobbyMutation(
                await lockGame(transaction, session.gameId),
                expectedVersion,
            )
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
                    and(
                        eq(gamePlayers.gameId, game.id),
                        eq(gamePlayers.id, player.id),
                    ),
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

            const nextVersion = await incrementGameVersion(
                transaction,
                game,
                now,
            )

            return {
                ok: true as const,
                value: {
                    gameId: game.id,
                    version: nextVersion,
                },
            }
        })
    }

    async assignRoles(
        sessionToken: string,
        expectedVersion: number,
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

            const gameResult = validateLobbyMutation(
                await lockGame(transaction, session.gameId),
                expectedVersion,
            )
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

            const assignment = assignRoles(
                players.map((player) => player.id)
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
                                : null,
                        isReady: false,
                    })
                    .where(
                        and(
                            eq(gamePlayers.gameId, game.id),
                            eq(gamePlayers.id, player.id),
                        ),
                    )
            }

            await appendGameEvent(transaction, {
                game,
                createdBy: 'MODERATOR',
                actorPlayerId: null,
                createdAt: now,
                event: { type: 'ROLES_ASSIGNED' },
            })

            const nextVersion = await incrementGameVersion(
                transaction,
                game,
                now,
            )

            return {
                ok: true as const,
                value: {
                    gameId: game.id,
                    version: nextVersion,
                }
            }

        })
    }
}

/**************************** Helper Functions ****************************/

function failure(
    code: StoreErrorCode,
    message: string,
): StoreResult<never> {
    // Mọi business error của store dùng chung một representation.
    return { ok: false, error: { code, message } }
}

async function findActiveSession(
    transaction: DatabaseTransaction,
    tokenHash: string,
    now: Date,
) {
    // Helper chỉ resolve session; từng mutation vẫn tự kiểm tra quyền cụ thể.
    const [session] = await transaction
        .select({
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

async function incrementGameVersion(
    transaction: DatabaseTransaction,
    game: Pick<GameRow, 'id' | 'version'>,
    now: Date,
): Promise<number> {
    const nextVersion = game.version + 1

    // Version thay đổi trong cùng transaction với state và event tương ứng.
    await transaction
        .update(games)
        .set({ version: nextVersion, updatedAt: now })
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
