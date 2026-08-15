import type { StoreResult, CreatedGame, JoinedGame } from './model'
import type { GameStore } from './game-store'

import { gameEvents, gamePlayers, games, gameSessions } from '#/db/schema'
import { desc, eq } from 'drizzle-orm'
import { db } from '#/db/client'

import {
    createSessionExpiry,
    createSessionToken,
    hashSessionToken,
} from '../auth/session-token'

import { storeErrorCodeSchema } from './schema'
import { createRoomCode } from './utils.room-code'

const MAX_ROOM_CODE_ATTEMPTS = 20

type PostgresGameStoreDependencies = {
    database?: typeof db
    createRoomCode?: () => string
    createSessionToken?: () => string
    hashSessionToken?: (token: string) => string
    createSessionExpiry?: (now: Date) => Date
    now?: () => Date
}

export class PostgresGameStore implements Pick<
    GameStore,
    'createGame' | 'joinGame'
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

                        // Tạo event đầu tiên
                        await transaction.insert(gameEvents).values({
                            gameId: game.id,
                            round: 0,
                            phase: 'SETUP',
                            sequence: 1,
                            type: 'GAME_CREATED',
                            payload: {},
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
                    return {
                        ok: false as const,
                        error: {
                            code: storeErrorCodeSchema.enum['GAME_NOT_FOUND'],
                            message: 'Room not found',
                        },
                    }
                }

                if (game.status !== 'LOBBY') {
                    return {
                        ok: false as const,
                        error: {
                            code: storeErrorCodeSchema.enum['GAME_ALREADY_STARTED'],
                            message: 'Game already started',
                        },
                    }
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

                // Tạo sequence event
                const [lastestEvent] = await transaction
                    .select({
                        sequence: gameEvents.sequence,
                    })
                    .from(gameEvents)
                    .where(eq(gameEvents.gameId, game.id))
                    .orderBy(desc(gameEvents.sequence))
                    .limit(1)

                const nextSequence = (lastestEvent?.sequence ?? 0) + 1

                await transaction.insert(gameEvents).values({
                    gameId: game.id,
                    round: game.round,
                    phase: game.phase,
                    sequence: nextSequence,
                    type: 'PLAYER_JOINED',
                    payload: {
                        playerId: player.id,
                        displayName: player.displayName,
                    },
                    createdAt: now,
                    createdBy: 'SYSTEM',
                    targetPlayerId: null,
                    actorPlayerId: player.id,
                })

                // Cập nhật version của game trong cùng transaction.
                await transaction
                    .update(games)
                    .set({
                        version: game.version + 1,
                        updatedAt: now,
                    })
                    .where(eq(games.id, game.id))

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
                return {
                    ok: false,
                    error: {
                        code: 'DUPLICATE_DISPLAY_NAME',
                        message: 'Display name is already in use',
                    },
                }
            }

            throw error
        }
    }
}

/**************************** Helper Functions ****************************/

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
