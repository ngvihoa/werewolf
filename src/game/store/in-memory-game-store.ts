import type {
  CreatedGame,
  GameMutationResult,
  JoinedGame,
  LocalGame,
  LocalSession,
  SessionKind,
  SetupEvent,
  StoredEvent,
  StoreErrorCode,
  StoreResult,
} from './model'
import type { ExecuteGameCommandInput, GameStore } from './game-store'
import type { Player, Role } from '../domain'
import type { GameEvent } from '../orchestration/events'
import type { GameView } from '../projections/model'

import { gameCommandSchema } from '../orchestration/schema'
import { projectGameView } from '../projections/project-game-view'
import { assignRoles } from '../rules/role-assignment'
import {
  createFirstNightState,
  executeCommand,
} from '../orchestration/game-orchestrator'

import { authorizeCommand } from './command-authorization'
import { createRoomCode } from './utils.room-code'

type StoreDependencies = {
  createId?: () => string
  createRoomCode?: () => string
  now?: () => Date
  randomIndex?: (upperBound: number) => number
}

export class InMemoryGameStore implements GameStore {
  readonly #games = new Map<string, LocalGame>()
  readonly #sessions = new Map<string, LocalSession>()
  readonly #commandReceipts = new Map<
    string,
    { request: string; result: GameMutationResult }
  >()
  readonly #createId: () => string
  readonly #createRoomCode: () => string
  readonly #now: () => Date
  readonly #randomIndex?: (upperBound: number) => number

  constructor(dependencies: StoreDependencies = {}) {
    this.#createId = dependencies.createId ?? (() => crypto.randomUUID())
    this.#createRoomCode = dependencies.createRoomCode ?? createRoomCode
    this.#now = dependencies.now ?? (() => new Date())
    this.#randomIndex = dependencies.randomIndex
  }

  createGame(moderatorName: string): StoreResult<CreatedGame> {
    const gameId = this.#createId()
    const token = this.#createId()
    const game: LocalGame = {
      id: gameId,
      roomCode: this.#uniqueRoomCode(),
      version: 1,
      moderatorName: moderatorName.trim(),
      lobbyPlayers: [],
      state: null,
      history: [],
    }
    this.#games.set(gameId, game)
    this.#sessions.set(token, {
      token,
      gameId,
      kind: 'MODERATOR',
      playerId: null,
    })
    this.#appendEvents(game, 'SYSTEM', null, [{ type: 'GAME_CREATED' }])
    return {
      ok: true,
      value: {
        gameId,
        roomCode: game.roomCode,
        moderatorSessionToken: token,
      },
    }
  }

  joinGame(roomCode: string, displayName: string): StoreResult<JoinedGame> {
    const game = [...this.#games.values()].find(
      (candidate) => candidate.roomCode === roomCode.trim().toUpperCase(),
    )
    if (!game) return failure('GAME_NOT_FOUND', 'Room code does not exist')
    if (game.state) {
      return failure('GAME_ALREADY_STARTED', 'Game has already started')
    }

    const normalizedName = displayName.trim()
    if (
      game.lobbyPlayers.some(
        (player) =>
          player.displayName.toLocaleLowerCase() ===
          normalizedName.toLocaleLowerCase(),
      )
    ) {
      return failure('DUPLICATE_DISPLAY_NAME', 'Display name is already in use')
    }

    const playerId = this.#createId()
    const token = this.#createId()
    game.lobbyPlayers.push({
      id: playerId,
      displayName: normalizedName,
      ready: false,
      role: null,
    })
    game.version += 1
    this.#sessions.set(token, {
      token,
      gameId: game.id,
      kind: 'PLAYER',
      playerId,
    })
    this.#appendEvents(game, 'PLAYER', playerId, [
      { type: 'PLAYER_JOINED', playerId, displayName: normalizedName },
    ])
    return {
      ok: true,
      value: { gameId: game.id, playerId, playerSessionToken: token },
    }
  }

  setReady(
    sessionToken: string,
    expectedVersion: number,
    ready: boolean,
    idempotencyKey: string,
  ): StoreResult<GameMutationResult> {
    // Sesion dùng để xác định ai đang thực hiện command
    const resolved = this.#resolveSession(sessionToken)
    if (!resolved.ok) return resolved

    const { game, session } = resolved.value
    const receiptKey = `${session.token}:${idempotencyKey}`
    const request = JSON.stringify({
      type: 'SET_READY',
      expectedVersion,
      ready,
    })
    const receipt = this.#commandReceipts.get(receiptKey)
    if (receipt) return replayReceipt(receipt, request)

    // Mọi mutation đều phải kiểm tra version trước khi thay đổi state
    if (game.version !== expectedVersion) {
      return failure('STALE_VERSION', 'Game version is stale')
    }

    // Hàm này chỉ tác dụng cho Player
    if (session.kind !== 'PLAYER' || !session.playerId) {
      return failure('NOT_AUTHORIZED', 'Only a player can change ready state')
    }

    // Hàm này chỉ tác dụng khi game đang ở trạng thái Lobby
    if (game.state) {
      return failure('GAME_ALREADY_STARTED', 'Game has already started')
    }

    const player = game.lobbyPlayers.find(
      (candidate) => candidate.id === session.playerId,
    )
    if (!player) {
      return failure('INVALID_GAME_STATE', 'Session player is missing')
    }

    player.ready = ready
    game.version += 1
    this.#appendEvents(game, 'PLAYER', player.id, [
      { type: 'PLAYER_READY_CHANGED', playerId: player.id, ready },
    ])

    const result = { gameId: game.id, version: game.version }
    this.#commandReceipts.set(receiptKey, { request, result })
    return success(result)
  }

  assignRoles(
    sessionToken: string,
    expectedVersion: number,
    idempotencyKey: string,
  ): StoreResult<GameMutationResult> {
    const resolved = this.#resolveModerator(sessionToken)
    if (!resolved.ok) return resolved
    const game = resolved.value
    const receiptKey = `${sessionToken}:${idempotencyKey}`
    const request = JSON.stringify({ type: 'ASSIGN_ROLES', expectedVersion })
    const receipt = this.#commandReceipts.get(receiptKey)
    if (receipt) return replayReceipt(receipt, request)

    // Request được tạo từ version cũ không được phép randomize role lần nữa.
    if (game.version !== expectedVersion) {
      return failure('STALE_VERSION', 'Game version is stale')
    }

    if (game.state) {
      return failure('GAME_ALREADY_STARTED', 'Game has already started')
    }

    const assigned = assignRoles(
      game.lobbyPlayers.map((player) => player.id),
      this.#randomIndex,
    )
    if (!assigned.ok) {
      return failure('INVALID_GAME_STATE', assigned.error.message)
    }
    for (const player of game.lobbyPlayers) {
      player.role = assigned.value.get(player.id) ?? null
      player.ready = false
    }
    game.version += 1
    this.#appendEvents(game, 'MODERATOR', null, [{ type: 'ROLES_ASSIGNED' }])
    const result = { gameId: game.id, version: game.version }
    this.#commandReceipts.set(receiptKey, { request, result })
    return success(result)
  }

  startGame(
    sessionToken: string,
    expectedVersion: number,
    idempotencyKey: string,
  ): StoreResult<GameMutationResult> {
    const resolved = this.#resolveModerator(sessionToken)
    if (!resolved.ok) return resolved
    const game = resolved.value
    const receiptKey = `${sessionToken}:${idempotencyKey}`
    const request = JSON.stringify({ type: 'START_GAME', expectedVersion })
    const receipt = this.#commandReceipts.get(receiptKey)
    if (receipt) return replayReceipt(receipt, request)

    // In-memory adapter phải giữ cùng optimistic-locking contract với PostgreSQL.
    if (game.version !== expectedVersion) {
      return failure('STALE_VERSION', 'Game version is stale')
    }

    if (game.state) {
      return failure('GAME_ALREADY_STARTED', 'Game has already started')
    }
    if (game.lobbyPlayers.some((player) => !player.role)) {
      return failure(
        'ROLES_NOT_ASSIGNED',
        'Roles must be assigned before start',
      )
    }
    if (game.lobbyPlayers.some((player) => !player.ready)) {
      return failure('NOT_ALL_PLAYERS_READY', 'Every player must be ready')
    }

    const players: Player[] = []
    for (const player of game.lobbyPlayers) {
      if (!player.role) {
        return failure(
          'ROLES_NOT_ASSIGNED',
          'Roles must be assigned before start',
        )
      }
      players.push(createDomainPlayer(player.id, player.role))
    }
    game.state = createFirstNightState(players)
    game.version += 1
    this.#appendEvents(game, 'MODERATOR', null, [{ type: 'GAME_STARTED' }])
    const result = { gameId: game.id, version: game.version }
    this.#commandReceipts.set(receiptKey, { request, result })
    return success(result)
  }

  rematch(
    sessionToken: string,
    expectedVersion: number,
    idempotencyKey: string,
  ): StoreResult<GameMutationResult> {
    const resolved = this.#resolveModerator(sessionToken)
    if (!resolved.ok) return resolved
    const game = resolved.value
    const receiptKey = `${sessionToken}:${idempotencyKey}`
    const request = JSON.stringify({ type: 'REMATCH', expectedVersion })
    const receipt = this.#commandReceipts.get(receiptKey)
    if (receipt) return replayReceipt(receipt, request)

    if (game.version !== expectedVersion) {
      return failure('STALE_VERSION', 'Game version is stale')
    }
    if (game.state?.phase !== 'GAME_OVER') {
      return failure('INVALID_GAME_STATE', 'Game has not ended')
    }

    game.state = null
    for (const player of game.lobbyPlayers) {
      player.role = null
      player.ready = false
    }
    game.version += 1
    this.#appendEvents(game, 'MODERATOR', null, [{ type: 'MATCH_RESET' }])
    const result = { gameId: game.id, version: game.version }
    this.#commandReceipts.set(receiptKey, { request, result })
    return success(result)
  }

  execute(input: ExecuteGameCommandInput): StoreResult<GameMutationResult> {
    const game = this.#games.get(input.gameId)
    if (!game) return failure('GAME_NOT_FOUND', 'Game does not exist')
    const session = this.#sessions.get(input.sessionToken)
    if (!session || session.gameId !== game.id) {
      return failure(
        'SESSION_NOT_FOUND',
        'Session does not exist for this game',
      )
    }
    const receiptKey = `${session.token}:${input.idempotencyKey}`
    const request = JSON.stringify({
      expectedVersion: input.expectedVersion,
      command: gameCommandSchema.parse(input.command),
    })
    const receipt = this.#commandReceipts.get(receiptKey)
    if (receipt) {
      return receipt.request === request
        ? success(structuredClone(receipt.result))
        : failure(
            'IDEMPOTENCY_KEY_REUSED',
            'Idempotency key was already used for another command',
          )
    }
    if (game.version !== input.expectedVersion) {
      return failure('STALE_VERSION', 'Game version is stale')
    }
    if (!game.state) {
      return failure('INVALID_GAME_STATE', 'Game has not started')
    }

    const authorization = authorizeCommand(session, input.command)
    if (!authorization.ok) return authorization
    const outcome = executeCommand(game.state, input.command)
    if (!outcome.ok) {
      return failure('INVALID_GAME_STATE', outcome.error.message)
    }

    game.state = outcome.value.state
    game.version += 1
    this.#appendEvents(
      game,
      session.kind,
      session.playerId,
      outcome.value.events,
    )
    const result = {
      gameId: game.id,
      version: game.version,
    }
    this.#commandReceipts.set(receiptKey, { request, result })
    return success(result)
  }

  getGame(gameId: string): StoreResult<LocalGame> {
    const game = this.#games.get(gameId)
    return game
      ? success(this.#snapshot(game))
      : failure('GAME_NOT_FOUND', 'Game does not exist')
  }

  getGameView(sessionToken: string): StoreResult<GameView> {
    const resolved = this.#resolveSession(sessionToken)
    if (!resolved.ok) return resolved
    const { game, session } = resolved.value
    const view = projectGameView(
      currentMatchSnapshot(game),
      session.kind === 'MODERATOR'
        ? { kind: 'MODERATOR', playerId: null }
        : { kind: 'PLAYER', playerId: session.playerId ?? '' },
    )
    return view
      ? success(view)
      : failure('INVALID_GAME_STATE', 'Session player is missing')
  }

  getGameByRoomCode(roomCode: string): StoreResult<LocalGame> {
    const game = [...this.#games.values()].find(
      (candidate) => candidate.roomCode === roomCode.trim().toUpperCase(),
    )
    return game
      ? success(this.#snapshot(game))
      : failure('GAME_NOT_FOUND', 'Room code does not exist')
  }

  reset(): void {
    this.#games.clear()
    this.#sessions.clear()
    this.#commandReceipts.clear()
  }

  #resolveSession(
    token: string,
  ): StoreResult<{ game: LocalGame; session: LocalSession }> {
    const session = this.#sessions.get(token)
    if (!session) return failure('SESSION_NOT_FOUND', 'Session does not exist')
    const game = this.#games.get(session.gameId)
    if (!game) return failure('GAME_NOT_FOUND', 'Session game does not exist')
    return success({ game, session })
  }

  #resolveModerator(token: string): StoreResult<LocalGame> {
    const resolved = this.#resolveSession(token)
    if (!resolved.ok) return resolved
    if (resolved.value.session.kind !== 'MODERATOR') {
      return failure('NOT_AUTHORIZED', 'Moderator session is required')
    }
    return success(resolved.value.game)
  }

  #uniqueRoomCode(): string {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const roomCode = this.#createRoomCode().trim().toUpperCase()
      if (
        ![...this.#games.values()].some((game) => game.roomCode === roomCode)
      ) {
        return roomCode
      }
    }
    throw new Error('Could not generate a unique room code')
  }

  #appendEvents(
    game: LocalGame,
    actor: SessionKind | 'SYSTEM',
    actorPlayerId: string | null,
    events: readonly (SetupEvent | GameEvent)[],
  ): void {
    for (const event of events) {
      const storedEvent: StoredEvent = {
        sequence: game.history.length + 1,
        id: this.#createId(),
        gameId: game.id,
        actor,
        actorPlayerId,
        createdAt: this.#now().toISOString(),
        event: structuredClone(event),
      }
      game.history.push(storedEvent)
    }
  }

  #snapshot(game: LocalGame): LocalGame {
    return structuredClone(game)
  }
}

function currentMatchSnapshot(game: LocalGame): LocalGame {
  const resetIndex = game.history
    .map((entry) => entry.event.type)
    .lastIndexOf('MATCH_RESET')
  const snapshot = structuredClone(game)
  snapshot.history = snapshot.history.slice(resetIndex + 1)
  return snapshot
}

function createDomainPlayer(id: string, role: Role): Player {
  if (role === 'WITCH') {
    return {
      id,
      role,
      alive: true,
      abilityState: {
        healingPotionAvailable: true,
        poisonPotionAvailable: true,
      },
    }
  }
  if (role === 'ALPHA_WEREWOLF') {
    return {
      id,
      role,
      alive: true,
      abilityState: { enhancedAttackAvailable: true },
    }
  }
  if (role === 'ELDER') {
    return {
      id,
      role,
      alive: true,
      abilityState: { werewolfAttackSurvivalAvailable: true },
    }
  }
  if (role === 'HYBRID_WOLF') {
    return {
      id,
      role,
      alive: true,
      abilityState: { converted: false },
    }
  }
  return { id, role, alive: true, abilityState: null }
}

function success<T>(value: T): StoreResult<T> {
  return { ok: true, value }
}

function failure(code: StoreErrorCode, message: string): StoreResult<never> {
  return { ok: false, error: { code, message } }
}

function replayReceipt(
  receipt: { request: string; result: GameMutationResult },
  request: string,
): StoreResult<GameMutationResult> {
  return receipt.request === request
    ? success(structuredClone(receipt.result))
    : failure(
        'IDEMPOTENCY_KEY_REUSED',
        'Idempotency key was already used for another command',
      )
}
