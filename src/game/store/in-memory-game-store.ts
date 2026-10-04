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
import type {
  CreateGameInput,
  ExecuteGameCommandInput,
  GameStore,
  TickInput,
} from './game-store'
import type { Player, Role, RoleCompositionSelection } from '../domain'
import type { GameEvent } from '../orchestration/events'
import type { GameView } from '../projections/model'

import { gameCommandSchema } from '../orchestration/schema'
import { projectGameView } from '../projections/project-game-view'
import { MVP_SETTINGS } from '../rules/mvp-settings'
import { assignRoles } from '../rules/role-assignment'
import {
  stampDiscussionDeadline,
  stampWaitingDeadline,
  runBotLoop,
} from '../bot/bot-moderator'
import {
  createFirstNightState,
  executeCommand,
} from '../orchestration/game-orchestrator'

import { authorizeCommand, stampEnteredBy } from './command-authorization'
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

  createGame(input: CreateGameInput): StoreResult<CreatedGame> {
    const gameId = this.#createId()
    const token = this.#createId()
    const mode = input.mode
    const ownerName = (
      mode === 'MODERATED' ? input.moderatorName : input.creatorName
    ).trim()
    const game: LocalGame = {
      id: gameId,
      roomCode: this.#uniqueRoomCode(),
      version: 1,
      moderatorName: ownerName,
      mode,
      hostPlayerId: null,
      settings: {
        ...MVP_SETTINGS,
        voteTie: input.voteTie ?? MVP_SETTINGS.voteTie,
      },
      lobbyPlayers: [],
      state: null,
      history: [],
    }
    this.#games.set(gameId, game)

    if (mode === 'MODERATED') {
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
          mode,
          gameId,
          roomCode: game.roomCode,
          moderatorSessionToken: token,
          version: game.version,
        },
      }
    }

    // SELF: người tạo phòng là một player thường, được đánh dấu chủ phòng.
    const creatorId = this.#createId()
    game.lobbyPlayers.push({
      id: creatorId,
      displayName: ownerName,
      ready: false,
      role: null,
    })
    game.hostPlayerId = creatorId
    this.#sessions.set(token, {
      token,
      gameId,
      kind: 'PLAYER',
      playerId: creatorId,
    })
    this.#appendEvents(game, 'SYSTEM', null, [
      { type: 'GAME_CREATED' },
      { type: 'PLAYER_JOINED', playerId: creatorId, displayName: ownerName },
    ])
    return {
      ok: true,
      value: {
        mode,
        gameId,
        roomCode: game.roomCode,
        playerId: creatorId,
        playerSessionToken: token,
        version: game.version,
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
      value: {
        gameId: game.id,
        playerId,
        playerSessionToken: token,
        version: game.version,
      },
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
    composition: RoleCompositionSelection = { mode: 'DEFAULT' },
  ): StoreResult<GameMutationResult> {
    const resolved = this.#resolveGameController(sessionToken)
    if (!resolved.ok) return resolved
    const { game, session } = resolved.value
    const receiptKey = `${sessionToken}:${idempotencyKey}`
    const request = JSON.stringify({
      type: 'ASSIGN_ROLES',
      expectedVersion,
      composition,
    })
    const receipt = this.#commandReceipts.get(receiptKey)
    if (receipt) return replayReceipt(receipt, request)

    // Request được tạo từ version cũ không được phép randomize role lần nữa.
    if (game.version !== expectedVersion) {
      return failure('STALE_VERSION', 'Game version is stale')
    }

    if (game.state) {
      return failure('GAME_ALREADY_STARTED', 'Game has already started')
    }

    // R23: người đã rời (lobby) không nhận vai — composition tính trên số
    // người còn tham gia.
    const assignablePlayers = game.lobbyPlayers.filter(
      (player) => !player.leftAt,
    )
    const assigned = assignRoles(
      assignablePlayers.map((player) => player.id),
      composition,
      this.#randomIndex,
    )
    if (!assigned.ok) {
      return failure('INVALID_GAME_STATE', assigned.error.message)
    }
    for (const player of assignablePlayers) {
      player.role = assigned.value.get(player.id) ?? null
      player.ready = false
    }
    game.version += 1
    this.#appendEvents(game, session.kind, session.playerId, [
      { type: 'ROLES_ASSIGNED' },
    ])
    const result = { gameId: game.id, version: game.version }
    this.#commandReceipts.set(receiptKey, { request, result })
    return success(result)
  }

  startGame(
    sessionToken: string,
    expectedVersion: number,
    idempotencyKey: string,
  ): StoreResult<GameMutationResult> {
    const resolved = this.#resolveGameController(sessionToken)
    if (!resolved.ok) return resolved
    const { game, session } = resolved.value
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
    // R23: người đã rời không tham gia ván — không chặn ready-check, không
    // nhận vai ảo trong domain state.
    const participants = game.lobbyPlayers.filter((player) => !player.leftAt)
    if (participants.some((player) => !player.role)) {
      return failure(
        'ROLES_NOT_ASSIGNED',
        'Roles must be assigned before start',
      )
    }
    if (participants.some((player) => !player.ready)) {
      return failure('NOT_ALL_PLAYERS_READY', 'Every player must be ready')
    }

    const players: Player[] = []
    for (const player of participants) {
      if (!player.role) {
        return failure(
          'ROLES_NOT_ASSIGNED',
          'Roles must be assigned before start',
        )
      }
      players.push(createDomainPlayer(player.id, player.role))
    }
    game.state = createFirstNightState(players, game.settings.voteTie)
    // R22: đêm đầu cũng cần mốc chờ ngay từ start — không có deadline thì
    // không client nào tick và người AFK ở step đầu tiên kẹt ván vĩnh viễn.
    if (game.mode === 'SELF') {
      stampDiscussionDeadline(game.state, this.#now())
      stampWaitingDeadline(game.state, this.#now())
    }
    game.version += 1
    this.#appendEvents(game, session.kind, session.playerId, [
      { type: 'GAME_STARTED' },
    ])
    const result = { gameId: game.id, version: game.version }
    this.#commandReceipts.set(receiptKey, { request, result })
    return success(result)
  }

  rematch(
    sessionToken: string,
    expectedVersion: number,
    idempotencyKey: string,
  ): StoreResult<GameMutationResult> {
    const resolved = this.#resolveGameController(sessionToken)
    if (!resolved.ok) return resolved
    const { game, session } = resolved.value
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
      // R23: ván mới — ai rời ván cũ cũng quay lại sảnh bình thường.
      player.leftAt = null
    }
    game.version += 1
    this.#appendEvents(game, session.kind, session.playerId, [
      { type: 'MATCH_RESET' },
    ])
    const result = { gameId: game.id, version: game.version }
    this.#commandReceipts.set(receiptKey, { request, result })
    return success(result)
  }

  // R23 (SELF): rời game không mark dead — domain state chỉ đổi qua bot
  // (skip step/vote của người rời). Event PLAYER_LEFT_GAME chỉ mang hiển thị.
  leaveGame(
    sessionToken: string,
    expectedVersion: number,
    idempotencyKey: string,
  ): StoreResult<GameMutationResult> {
    const resolved = this.#resolveSession(sessionToken)
    if (!resolved.ok) return resolved
    const { game, session } = resolved.value
    const receiptKey = `${session.token}:${idempotencyKey}`
    const request = JSON.stringify({ type: 'LEAVE_GAME', expectedVersion })
    const receipt = this.#commandReceipts.get(receiptKey)
    if (receipt) return replayReceipt(receipt, request)

    if (game.version !== expectedVersion) {
      return failure('STALE_VERSION', 'Game version is stale')
    }
    if (game.mode !== 'SELF') {
      return failure(
        'NOT_AUTHORIZED',
        'Leaving is only available in self-moderated games',
      )
    }
    if (session.kind !== 'PLAYER' || !session.playerId) {
      return failure('NOT_AUTHORIZED', 'Only a player can leave the game')
    }
    if (game.state?.phase === 'GAME_OVER') {
      return failure('INVALID_GAME_STATE', 'Game is already over')
    }

    const player = game.lobbyPlayers.find(
      (candidate) => candidate.id === session.playerId,
    )
    if (!player) {
      return failure('INVALID_GAME_STATE', 'Session player is missing')
    }
    if (player.leftAt) {
      return failure('INVALID_GAME_STATE', 'Player has already left')
    }

    // Bot loop chạy trên bản clone trước khi commit: failure giữa chừng không
    // để lại nửa trái (leftAt đã set mà state chưa skip).
    let nextState = game.state
    let botEvents: GameEvent[] = []
    if (game.state) {
      const now = this.#now()
      const leftPlayerIds = [
        ...game.lobbyPlayers
          .filter((candidate) => candidate.leftAt)
          .map((candidate) => candidate.id),
        player.id,
      ]
      const bot = runBotLoop(structuredClone(game.state), {
        now,
        leftPlayerIds,
      })
      if (!bot.ok) {
        return failure('INVALID_GAME_STATE', bot.error.message)
      }
      nextState = bot.state
      stampDiscussionDeadline(nextState, now)
      stampWaitingDeadline(nextState, now)
      botEvents = bot.events
    }

    player.leftAt = this.#now().toISOString()
    game.state = nextState
    game.version += 1
    this.#appendEvents(game, 'PLAYER', player.id, [
      { type: 'PLAYER_LEFT_GAME', playerId: player.id },
    ])
    if (botEvents.length > 0) {
      this.#appendEvents(game, 'SYSTEM', null, botEvents)
    }

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

    const authorization = authorizeCommand(session, input.command, game.mode)
    if (!authorization.ok) return authorization
    // R23: player chỉ được END_GAME khi là chủ phòng ở SELF.
    if (input.command.type === 'END_GAME' && session.kind === 'PLAYER') {
      if (game.mode !== 'SELF' || game.hostPlayerId !== session.playerId) {
        return failure('NOT_AUTHORIZED', 'Only the host can end the game early')
      }
    }
    // R23: người đã rời không hành động/bỏ phiếu nữa (session cũ chỉ còn xem)
    // — trừ END_GAME: chủ phòng rời vẫn giữ quyền kết thúc ván (host đã kiểm
    // ở trên, player thường đã bị chặn).
    if (
      input.command.type !== 'END_GAME' &&
      session.kind === 'PLAYER' &&
      game.mode === 'SELF'
    ) {
      const actor = game.lobbyPlayers.find(
        (candidate) => candidate.id === session.playerId,
      )
      if (actor?.leftAt) {
        return failure('NOT_AUTHORIZED', 'Player has left the game')
      }
    }
    const outcome = executeCommand(game.state, input.command)
    if (!outcome.ok) {
      return failure('INVALID_GAME_STATE', outcome.error.message)
    }

    let finalState = outcome.value.state
    // M4: nguồn nhập của event audit — session nào khởi phát lệnh thì action
    // mang nguồn đó (bot confirm cùng "transaction" kế thừa).
    const enteredBy: 'PLAYER' | 'MODERATOR' =
      session.kind === 'MODERATOR' ? 'MODERATOR' : 'PLAYER'
    const humanEvents = stampEnteredBy(outcome.value.events, enteredBy)
    let botEvents: GameEvent[] = []

    // M12: sau lệnh người chơi, quản trò bot chạy tới fixpoint ở CẢ HAI mode
    // trong cùng "transaction" — version chỉ tăng một lần cho cả thay đổi.
    // Allowlist theo mode quyết định bot được phát lệnh gì.
    {
      const now = this.#now()
      // Mốc thời gian có thể cần gắn cả TRƯỚC lẫn SAU loop: DAY và step mới
      // thường được tạo bên trong loop bởi chính bot. Cả hai hàm stamp tự
      // no-op phần SELF-only khi mode là MODERATED.
      stampDiscussionDeadline(finalState, now, game.mode)
      stampWaitingDeadline(finalState, now, game.mode)
      const bot = runBotLoop(finalState, {
        now,
        leftPlayerIds: this.#leftPlayerIds(game),
        mode: game.mode,
      })
      if (!bot.ok) {
        return failure('INVALID_GAME_STATE', bot.error.message)
      }
      finalState = bot.state
      stampDiscussionDeadline(finalState, now, game.mode)
      stampWaitingDeadline(finalState, now, game.mode)
      botEvents = stampEnteredBy(bot.events, enteredBy)
    }

    game.state = finalState
    game.version += 1
    this.#appendEvents(game, session.kind, session.playerId, humanEvents)
    if (botEvents.length > 0) {
      this.#appendEvents(game, 'SYSTEM', null, botEvents)
    }
    const result = {
      gameId: game.id,
      version: game.version,
    }
    this.#commandReceipts.set(receiptKey, { request, result })
    return success(result)
  }

  // R22: lazy tick — client gọi khi countdown về 0; đồng hồ là store clock.
  // Idempotent: không có gì đổi thì chỉ trả version hiện tại.
  tick(input: TickInput): StoreResult<GameMutationResult> {
    const game = this.#games.get(input.gameId)
    if (!game) return failure('GAME_NOT_FOUND', 'Game does not exist')
    const session = this.#sessions.get(input.sessionToken)
    if (!session || session.gameId !== game.id) {
      return failure(
        'SESSION_NOT_FOUND',
        'Session does not exist for this game',
      )
    }
    if (!game.state || game.mode !== 'SELF' || game.state.winner) {
      return success({ gameId: game.id, version: game.version })
    }

    const before = JSON.stringify(game.state)
    const state = structuredClone(game.state)
    const now = this.#now()
    stampDiscussionDeadline(state, now)
    stampWaitingDeadline(state, now)
    const bot = runBotLoop(state, {
      now,
      leftPlayerIds: this.#leftPlayerIds(game),
    })
    if (!bot.ok) {
      return failure('INVALID_GAME_STATE', bot.error.message)
    }
    const finalState = bot.state
    stampDiscussionDeadline(finalState, now)
    stampWaitingDeadline(finalState, now)

    if (JSON.stringify(finalState) === before) {
      return success({ gameId: game.id, version: game.version })
    }

    game.state = finalState
    game.version += 1
    // Tick chỉ tồn tại ở SELF: action được bot confirm luôn do một người chơi
    // submit ở transaction trước — nguồn nhập là PLAYER.
    if (bot.events.length > 0) {
      this.#appendEvents(
        game,
        'SYSTEM',
        null,
        stampEnteredBy(bot.events, 'PLAYER'),
      )
    }
    return success({ gameId: game.id, version: game.version })
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

  // R23: danh sách player đã rời — bot dùng để skip step/abstain phiếu.
  #leftPlayerIds(game: LocalGame): string[] {
    return game.lobbyPlayers
      .filter((player) => player.leftAt)
      .map((player) => player.id)
  }

  // MODERATED: chỉ Quản trò điều khiển sảnh. SELF: chủ phòng (player tạo
  // phòng) điều khiển. Mọi lệnh cấu hình/start/rematch đi qua đây.
  #resolveGameController(
    token: string,
  ): StoreResult<{ game: LocalGame; session: LocalSession }> {
    const resolved = this.#resolveSession(token)
    if (!resolved.ok) return resolved
    const { game, session } = resolved.value
    if (session.kind === 'MODERATOR') return success({ game, session })
    if (
      game.mode === 'SELF' &&
      session.kind === 'PLAYER' &&
      session.playerId !== null &&
      session.playerId === game.hostPlayerId
    ) {
      return success({ game, session })
    }
    return failure('NOT_AUTHORIZED', 'Moderator session is required')
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
  if (role === 'WHITE_WOLF') {
    return {
      id,
      role,
      alive: true,
      abilityState: { killAvailable: true },
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
