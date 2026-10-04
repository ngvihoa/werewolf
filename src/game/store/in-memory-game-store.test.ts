import type { CreatedGame } from './model'

import { describe, expect, it } from 'vitest'

import { InMemoryGameStore } from './in-memory-game-store'

// CreatedGame là discriminated union theo mode; fixture MODERATED lấy token
// qua helper này để TypeScript narrow đúng nhánh.
function moderatorToken(value: CreatedGame): string {
  if (value.mode !== 'MODERATED') {
    throw new Error('Expected a MODERATED game')
  }
  return value.moderatorSessionToken
}

function selfGame(value: CreatedGame): Extract<CreatedGame, { mode: 'SELF' }> {
  if (value.mode !== 'SELF') {
    throw new Error('Expected a SELF game')
  }
  return value
}

function createStore() {
  let id = 0
  return new InMemoryGameStore({
    createId: () => `id-${++id}`,
    createRoomCode: () => 'ABC123',
    now: () => new Date('2026-08-08T00:00:00.000Z'),
    randomIndex: () => 0,
  })
}

function createStartedGame() {
  const store = createStore()
  const created = store.createGame({
    mode: 'MODERATED',
    moderatorName: 'Moderator',
  })
  if (!created.ok) throw new Error(created.error.message)

  const players = ['An', 'Binh', 'Cuong', 'Dung', 'Hoa'].map((name) => {
    const joined = store.joinGame(created.value.roomCode, name)
    if (!joined.ok) throw new Error(joined.error.message)
    return joined.value
  })
  const assigned = store.assignRoles(
    moderatorToken(created.value),
    6,
    'fixture-assign',
  )
  if (!assigned.ok) throw new Error(assigned.error.message)
  for (const player of players) {
    // Mỗi mutation tăng version, nên client kế tiếp phải dùng version mới nhất.
    // Điều này mô phỏng việc UI refetch game view sau một mutation thành công.
    const currentGame = store.getGame(created.value.gameId)
    if (!currentGame.ok) throw new Error(currentGame.error.message)

    const ready = store.setReady(
      player.playerSessionToken,
      currentGame.value.version,
      true,
      `fixture-ready-${player.playerId}`,
    )
    if (!ready.ok) throw new Error(ready.error.message)
  }
  const beforeStart = store.getGame(created.value.gameId)
  if (!beforeStart.ok) throw new Error(beforeStart.error.message)

  const started = store.startGame(
    moderatorToken(created.value),
    beforeStart.value.version,
    'fixture-start',
  )
  if (!started.ok) throw new Error(started.error.message)

  const startedGame = store.getGame(created.value.gameId)
  if (!startedGame.ok) throw new Error(startedGame.error.message)

  return { store, created: created.value, players, game: startedGame.value }
}

describe('InMemoryGameStore lobby', () => {
  it('creates a room and joins players with fake sessions', () => {
    const store = createStore()
    const created = store.createGame({
      mode: 'MODERATED',
      moderatorName: 'Moderator',
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return

    const joined = store.joinGame('abc123', 'An')
    expect(joined.ok).toBe(true)
    const snapshot = store.getGame(created.value.gameId)
    expect(snapshot.ok).toBe(true)
    if (snapshot.ok) {
      expect(snapshot.value.lobbyPlayers).toEqual([
        {
          id: joined.ok ? joined.value.playerId : '',
          displayName: 'An',
          ready: false,
          role: null,
        },
      ])
      expect(snapshot.value.history.map((entry) => entry.event.type)).toEqual([
        'GAME_CREATED',
        'PLAYER_JOINED',
      ])
    }
  })

  it('rejects duplicate display names case-insensitively', () => {
    const store = createStore()
    const created = store.createGame({
      mode: 'MODERATED',
      moderatorName: 'Moderator',
    })
    if (!created.ok) throw new Error(created.error.message)
    store.joinGame(created.value.roomCode, 'An')
    const duplicate = store.joinGame(created.value.roomCode, 'an')
    expect(duplicate.ok).toBe(false)
    if (!duplicate.ok) {
      expect(duplicate.error.code).toBe('DUPLICATE_DISPLAY_NAME')
    }
  })

  it('rejects a stale ready mutation without changing the player', () => {
    const store = createStore()
    const created = store.createGame({
      mode: 'MODERATED',
      moderatorName: 'Moderator',
    })
    if (!created.ok) throw new Error(created.error.message)

    const joined = store.joinGame(created.value.roomCode, 'An')
    if (!joined.ok) throw new Error(joined.error.message)

    const currentGame = store.getGame(created.value.gameId)
    if (!currentGame.ok) throw new Error(currentGame.error.message)

    // Client cố gửi version cũ hơn version đang nằm trên server.
    // Store phải từ chối trước khi thay đổi ready state hoặc ghi event.
    const stale = store.setReady(
      joined.value.playerSessionToken,
      currentGame.value.version - 1,
      true,
      'stale-ready',
    )
    const unchanged = store.getGame(created.value.gameId)

    expect(stale.ok).toBe(false)
    if (!stale.ok) expect(stale.error.code).toBe('STALE_VERSION')
    expect(unchanged).toEqual(currentGame)
  })

  it('rejects stale role assignment without changing the game', () => {
    const store = createStore()
    const created = store.createGame({
      mode: 'MODERATED',
      moderatorName: 'Moderator',
    })
    if (!created.ok) throw new Error(created.error.message)

    for (const name of ['An', 'Binh', 'Cuong', 'Dung', 'Hoa']) {
      store.joinGame(created.value.roomCode, name)
    }

    // Sau năm lượt join, version hiện tại là 6 nên version 5 đã stale.
    const beforeAssignment = store.getGame(created.value.gameId)
    const result = store.assignRoles(
      moderatorToken(created.value),
      5,
      'stale-assign',
    )
    const afterAssignment = store.getGame(created.value.gameId)

    expect(result).toMatchObject({
      ok: false,
      error: { code: 'STALE_VERSION' },
    })
    expect(afterAssignment).toEqual(beforeAssignment)
  })

  it('assigns a custom composition and includes it in idempotency identity', () => {
    const store = createStore()
    const created = store.createGame({
      mode: 'MODERATED',
      moderatorName: 'Moderator',
    })
    if (!created.ok) throw new Error(created.error.message)
    for (const name of ['An', 'Binh', 'Cuong', 'Dung', 'Hoa']) {
      store.joinGame(created.value.roomCode, name)
    }

    const assigned = store.assignRoles(
      moderatorToken(created.value),
      6,
      'custom-assign',
      { mode: 'CUSTOM', roles: ['WEREWOLF', 'SEER', 'WITCH'] },
    )
    expect(assigned.ok).toBe(true)

    const game = store.getGame(created.value.gameId)
    if (!game.ok) throw new Error(game.error.message)
    expect(game.value.lobbyPlayers.map((player) => player.role).sort()).toEqual(
      ['WEREWOLF', 'SEER', 'WITCH', 'VILLAGER', 'VILLAGER'].sort(),
    )

    const reused = store.assignRoles(
      moderatorToken(created.value),
      6,
      'custom-assign',
      { mode: 'DEFAULT' },
    )
    expect(reused).toMatchObject({
      ok: false,
      error: { code: 'IDEMPOTENCY_KEY_REUSED' },
    })
  })

  it('requires assignment and every player to be ready before start', () => {
    const store = createStore()
    const created = store.createGame({
      mode: 'MODERATED',
      moderatorName: 'Moderator',
    })
    if (!created.ok) throw new Error(created.error.message)
    for (const name of ['An', 'Binh', 'Cuong', 'Dung', 'Hoa']) {
      store.joinGame(created.value.roomCode, name)
    }

    const beforeAssignment = store.startGame(
      moderatorToken(created.value),
      6,
      'start-before-assign',
    )
    expect(beforeAssignment.ok).toBe(false)
    if (!beforeAssignment.ok) {
      expect(beforeAssignment.error.code).toBe('ROLES_NOT_ASSIGNED')
    }

    store.assignRoles(moderatorToken(created.value), 6, 'assign-roles')
    const beforeReady = store.startGame(
      moderatorToken(created.value),
      7,
      'start-before-ready',
    )
    expect(beforeReady.ok).toBe(false)
    if (!beforeReady.ok) {
      expect(beforeReady.error.code).toBe('NOT_ALL_PLAYERS_READY')
    }
  })

  it('replays successful lobby mutations without applying them twice', () => {
    const store = createStore()
    const created = store.createGame({
      mode: 'MODERATED',
      moderatorName: 'Moderator',
    })
    if (!created.ok) throw new Error(created.error.message)
    const joined = store.joinGame(created.value.roomCode, 'An')
    if (!joined.ok) throw new Error(joined.error.message)

    const readyInput = [
      joined.value.playerSessionToken,
      2,
      true,
      'ready-once',
    ] as const
    const ready = store.setReady(...readyInput)
    expect(store.setReady(...readyInput)).toEqual(ready)

    for (const name of ['Binh', 'Cuong', 'Dung', 'Hoa']) {
      store.joinGame(created.value.roomCode, name)
    }
    const beforeAssign = store.getGame(created.value.gameId)
    if (!beforeAssign.ok) throw new Error(beforeAssign.error.message)
    const assignInput = [
      moderatorToken(created.value),
      beforeAssign.value.version,
      'assign-once',
    ] as const
    const assigned = store.assignRoles(...assignInput)
    expect(store.assignRoles(...assignInput)).toEqual(assigned)

    const snapshot = store.getGame(created.value.gameId)
    if (!snapshot.ok) throw new Error(snapshot.error.message)
    expect(
      snapshot.value.history.filter(
        (entry) => entry.event.type === 'PLAYER_READY_CHANGED',
      ),
    ).toHaveLength(1)
    expect(
      snapshot.value.history.filter(
        (entry) => entry.event.type === 'ROLES_ASSIGNED',
      ),
    ).toHaveLength(1)
  })

  it('replays startGame and rejects a reused key with another payload', () => {
    const { store, created, game } = createStartedGame()
    const retried = store.startGame(
      moderatorToken(created),
      game.version - 1,
      'fixture-start',
    )
    expect(retried).toEqual({
      ok: true,
      value: { gameId: game.id, version: game.version },
    })

    const reused = store.startGame(
      moderatorToken(created),
      game.version,
      'fixture-start',
    )
    expect(reused).toMatchObject({
      ok: false,
      error: { code: 'IDEMPOTENCY_KEY_REUSED' },
    })
  })

  it('only allows a rematch after the game has ended', () => {
    const { store, created, game } = createStartedGame()
    const before = store.getGame(game.id)
    const result = store.rematch(
      moderatorToken(created),
      game.version,
      'rematch-too-early',
    )

    expect(result).toMatchObject({
      ok: false,
      error: { code: 'INVALID_GAME_STATE' },
    })
    expect(store.getGame(game.id)).toEqual(before)
  })

  it('starts with a valid role composition and private Witch ability state', () => {
    const { game } = createStartedGame()
    expect(game.state?.phase).toBe('NIGHT')
    expect(game.state?.players.map((player) => player.role).sort()).toEqual(
      ['WEREWOLF', 'SEER', 'VILLAGER', 'VILLAGER', 'VILLAGER'].sort(),
    )
  })
})

describe('InMemoryGameStore commands', () => {
  it('resolves permission-aware views from fake sessions', () => {
    const { store, created, players, game } = createStartedGame()
    const playerView = store.getGameView(players[0].playerSessionToken)
    const moderatorView = store.getGameView(moderatorToken(created))

    expect(playerView.ok).toBe(true)
    if (playerView.ok && playerView.value.viewer === 'PLAYER') {
      expect(playerView.value.me.id).toBe(players[0].playerId)
      // Chưa kết thúc ván thì role trong danh sách phải được giữ kín (null).
      expect(playerView.value.players[0].role).toBeNull()
    }
    expect(moderatorView.ok).toBe(true)
    if (moderatorView.ok && moderatorView.value.viewer === 'MODERATOR') {
      expect(moderatorView.value.game).toEqual(game)
    }
  })

  it('authorizes the role owner and appends orchestration events', () => {
    const { store, players, game } = createStartedGame()
    const seer = game.lobbyPlayers.find((player) => player.role === 'SEER')
    const wolf = game.lobbyPlayers.find((player) => player.role === 'WEREWOLF')
    const seerSession = players.find((player) => player.playerId === seer?.id)
    if (!seer || !wolf || !seerSession) throw new Error('Fixture roles missing')

    const executed = store.execute({
      gameId: game.id,
      sessionToken: seerSession.playerSessionToken,
      idempotencyKey: 'submit-seer-action',
      expectedVersion: game.version,
      command: {
        type: 'SUBMIT_NIGHT_ACTION',
        action: {
          type: 'SEER_INSPECT',
          actorId: seer.id,
          targetId: wolf.id,
        },
      },
    })

    expect(executed.ok).toBe(true)
    if (executed.ok) {
      expect(executed.value.version).toBe(game.version + 1)
    }

    const updatedGame = store.getGame(game.id)
    if (!updatedGame.ok) {
      throw new Error('Expected updated game to exist')
    }

    expect(updatedGame.value.history.at(-1)?.event.type).toBe(
      'NIGHT_ACTION_SUBMITTED',
    )
  })

  it('prevents a player from acting for another player', () => {
    const { store, players, game } = createStartedGame()
    const seer = game.lobbyPlayers.find((player) => player.role === 'SEER')
    const anotherSession = players.find(
      (player) => player.playerId !== seer?.id,
    )
    const target = game.lobbyPlayers.find((player) => player.id !== seer?.id)
    if (!seer || !anotherSession || !target) throw new Error('Fixture missing')

    const executed = store.execute({
      gameId: game.id,
      sessionToken: anotherSession.playerSessionToken,
      idempotencyKey: 'unauthorized-seer-action',
      expectedVersion: game.version,
      command: {
        type: 'SUBMIT_NIGHT_ACTION',
        action: {
          type: 'SEER_INSPECT',
          actorId: seer.id,
          targetId: target.id,
        },
      },
    })
    expect(executed.ok).toBe(false)
    if (!executed.ok) expect(executed.error.code).toBe('NOT_AUTHORIZED')
  })

  it('returns the original result when the same command is retried', () => {
    const { store, created, game } = createStartedGame()
    const input = {
      gameId: game.id,
      sessionToken: moderatorToken(created),
      idempotencyKey: 'skip-seer-once',
      expectedVersion: game.version,
      command: { type: 'SKIP_STEP' as const, reason: 'No action' },
    }

    const first = store.execute(input)
    const retried = store.execute(input)
    const stored = store.getGame(game.id)

    expect(retried).toEqual(first)
    expect(first.ok).toBe(true)
    if (first.ok && stored.ok) {
      expect(stored.value.version).toBe(first.value.version)
      expect(
        stored.value.history.filter(
          (event) => event.event.type === 'QUEUE_STEP_SKIPPED',
        ),
      ).toHaveLength(1)
    }
  })

  it('rejects reuse of an idempotency key for a different command', () => {
    const { store, created, game } = createStartedGame()
    const base = {
      gameId: game.id,
      sessionToken: moderatorToken(created),
      idempotencyKey: 'one-command-only',
      expectedVersion: game.version,
    }

    expect(
      store.execute({
        ...base,
        command: { type: 'SKIP_STEP', reason: 'No action' },
      }).ok,
    ).toBe(true)
    const reused = store.execute({
      ...base,
      command: { type: 'SKIP_STEP', reason: 'Different request' },
    })

    expect(reused).toMatchObject({
      ok: false,
      error: { code: 'IDEMPOTENCY_KEY_REUSED' },
    })
  })

  it('rejects stale commands without changing state or history', () => {
    const { store, created, game } = createStartedGame()
    const before = store.getGame(game.id)
    const stale = store.execute({
      gameId: game.id,
      sessionToken: moderatorToken(created),
      idempotencyKey: 'stale-skip',
      expectedVersion: game.version - 1,
      command: { type: 'SKIP_STEP', reason: 'Local test' },
    })
    const after = store.getGame(game.id)

    expect(stale.ok).toBe(false)
    if (!stale.ok) expect(stale.error.code).toBe('STALE_VERSION')
    expect(after).toEqual(before)
  })

  it('returns detached snapshots that cannot mutate stored state', () => {
    const { store, game } = createStartedGame()
    game.lobbyPlayers[0].displayName = 'Changed outside store'
    const persisted = store.getGame(game.id)
    expect(persisted.ok).toBe(true)
    if (persisted.ok) {
      expect(persisted.value.lobbyPlayers[0]?.displayName).not.toBe(
        'Changed outside store',
      )
    }
  })
})

describe('InMemoryGameStore self mode (không quản trò)', () => {
  function createSelfGame() {
    const store = createStore()
    const created = store.createGame({ mode: 'SELF', creatorName: 'Hoa' })
    if (!created.ok) throw new Error(created.error.message)
    return { store, created: selfGame(created.value) }
  }

  function currentVersion(store: InMemoryGameStore, gameId: string): number {
    const snapshot = store.getGame(gameId)
    if (!snapshot.ok) throw new Error(snapshot.error.message)
    return snapshot.value.version
  }

  function startSelfGame() {
    const { store, created } = createSelfGame()
    const players = [
      { playerId: created.playerId, token: created.playerSessionToken },
    ]
    for (const name of ['An', 'Binh', 'Cuong', 'Dung']) {
      const joined = store.joinGame(created.roomCode, name)
      if (!joined.ok) throw new Error(joined.error.message)
      players.push({
        playerId: joined.value.playerId,
        token: joined.value.playerSessionToken,
      })
    }

    // Chủ phòng phân vai bằng player session của chính mình (R24).
    const assigned = store.assignRoles(
      created.playerSessionToken,
      currentVersion(store, created.gameId),
      'self-assign',
    )
    if (!assigned.ok) throw new Error(assigned.error.message)

    for (const player of players) {
      const ready = store.setReady(
        player.token,
        currentVersion(store, created.gameId),
        true,
        `self-ready-${player.token}`,
      )
      if (!ready.ok) throw new Error(ready.error.message)
    }

    const started = store.startGame(
      created.playerSessionToken,
      currentVersion(store, created.gameId),
      'self-start',
    )
    if (!started.ok) throw new Error(started.error.message)
    return { store, created, players }
  }

  it('tạo phòng SELF: chủ phòng là player thường và nhận player session', () => {
    const { store, created } = createSelfGame()

    expect(created.mode).toBe('SELF')
    const snapshot = store.getGame(created.gameId)
    expect(snapshot.ok).toBe(true)
    if (!snapshot.ok) return
    expect(snapshot.value.mode).toBe('SELF')
    expect(snapshot.value.hostPlayerId).toBe(created.playerId)
    expect(snapshot.value.lobbyPlayers).toEqual([
      {
        id: created.playerId,
        displayName: 'Hoa',
        ready: false,
        role: null,
      },
    ])
    expect(snapshot.value.history.map((entry) => entry.event.type)).toEqual([
      'GAME_CREATED',
      'PLAYER_JOINED',
    ])
  })

  it('player thường (không phải chủ phòng) không được phân vai hay start', () => {
    const { store, created } = createSelfGame()
    const joined = store.joinGame(created.roomCode, 'An')
    if (!joined.ok) throw new Error(joined.error.message)
    const version = currentVersion(store, created.gameId)

    const assigned = store.assignRoles(
      joined.value.playerSessionToken,
      version,
      'not-host',
    )
    expect(assigned).toMatchObject({
      ok: false,
      error: { code: 'NOT_AUTHORIZED' },
    })

    const started = store.startGame(
      joined.value.playerSessionToken,
      currentVersion(store, created.gameId),
      'not-host-start',
    )
    expect(started).toMatchObject({
      ok: false,
      error: { code: 'NOT_AUTHORIZED' },
    })
  })

  it('chủ phòng tự setReady như một player bình thường', () => {
    const { store, created } = createSelfGame()
    const ready = store.setReady(
      created.playerSessionToken,
      currentVersion(store, created.gameId),
      true,
      'host-ready',
    )
    expect(ready.ok).toBe(true)
  })

  it('chạy full flow SELF: phân vai → sẵn sàng → start vào đêm đầu', () => {
    const { store, created } = startSelfGame()

    const snapshot = store.getGame(created.gameId)
    expect(snapshot.ok).toBe(true)
    if (!snapshot.ok) return
    expect(snapshot.value.state?.phase).toBe('NIGHT')
    // R22: đêm đầu có mốc chờ ngay từ start — nếu không, không client nào
    // tick và người AFK ở step đầu tiên kẹt ván vĩnh viễn.
    expect(snapshot.value.state?.waitingKey).toBe('STEP:1:SEER_INSPECT')
    expect(snapshot.value.state?.waitingDeadlineAt).toBeTruthy()
    expect(
      snapshot.value.lobbyPlayers.every((player) => player.role !== null),
    ).toBe(true)
    // Event start do PLAYER (chủ phòng) thực hiện, không phải MODERATOR.
    const startedEvent = snapshot.value.history.find(
      (entry) => entry.event.type === 'GAME_STARTED',
    )
    expect(startedEvent?.actor).toBe('PLAYER')
    expect(startedEvent?.actorPlayerId).toBe(created.playerId)
  })

  it('carry setting voteTie từ createGame vào state khi start', () => {
    const store = createStore()
    const created = store.createGame({
      mode: 'SELF',
      creatorName: 'Hoa',
      voteTie: 'NO_REVOTE',
    })
    if (!created.ok) throw new Error(created.error.message)
    const game = created.value
    if (game.mode !== 'SELF') throw new Error('Expected a SELF game')
    const players = [
      { playerId: game.playerId, token: game.playerSessionToken },
    ]
    for (const name of ['An', 'Binh', 'Cuong', 'Dung']) {
      const joined = store.joinGame(game.roomCode, name)
      if (!joined.ok) throw new Error(joined.error.message)
      players.push({
        playerId: joined.value.playerId,
        token: joined.value.playerSessionToken,
      })
    }
    const assigned = store.assignRoles(
      game.playerSessionToken,
      currentVersion(store, game.gameId),
      'self-assign',
    )
    if (!assigned.ok) throw new Error(assigned.error.message)
    for (const player of players) {
      const ready = store.setReady(
        player.token,
        currentVersion(store, game.gameId),
        true,
        `ready-${player.token}`,
      )
      if (!ready.ok) throw new Error(ready.error.message)
    }
    const started = store.startGame(
      game.playerSessionToken,
      currentVersion(store, game.gameId),
      'self-start',
    )
    if (!started.ok) throw new Error(started.error.message)

    const snapshot = store.getGame(game.gameId)
    expect(snapshot.ok).toBe(true)
    if (!snapshot.ok) return
    expect(snapshot.value.state?.voteTie).toBe('NO_REVOTE')
  })

  it('mặc định voteTie là REVOTE_ONCE khi createGame không truyền', () => {
    const { store, created } = startSelfGame()
    const snapshot = store.getGame(created.gameId)
    expect(snapshot.ok).toBe(true)
    if (!snapshot.ok) return
    expect(snapshot.value.state?.voteTie).toBe('REVOTE_ONCE')
  })

  it('startGame vẫn chặn khi một player (kể cả chủ phòng) chưa sẵn sàng', () => {
    const { store, created } = createSelfGame()
    for (const name of ['An', 'Binh', 'Cuong', 'Dung']) {
      const joined = store.joinGame(created.roomCode, name)
      if (!joined.ok) throw new Error(joined.error.message)
    }

    const assigned = store.assignRoles(
      created.playerSessionToken,
      currentVersion(store, created.gameId),
      'self-assign',
    )
    if (!assigned.ok) throw new Error(assigned.error.message)

    // Chỉ chủ phòng ready — 4 player còn lại chưa.
    const hostReady = store.setReady(
      created.playerSessionToken,
      currentVersion(store, created.gameId),
      true,
      'host-ready',
    )
    if (!hostReady.ok) throw new Error(hostReady.error.message)

    const started = store.startGame(
      created.playerSessionToken,
      currentVersion(store, created.gameId),
      'self-start-incomplete',
    )
    expect(started).toMatchObject({
      ok: false,
      error: { code: 'NOT_ALL_PLAYERS_READY' },
    })
  })
  it('SELF: một lệnh submit của player kéo theo chuỗi confirm SYSTEM của bot', () => {
    const { store, created, players } = startSelfGame()
    const snapshot = store.getGame(created.gameId)
    if (!snapshot.ok) throw new Error(snapshot.error.message)
    const seer = snapshot.value.lobbyPlayers.find(
      (player) => player.role === 'SEER',
    )
    if (!seer) throw new Error('Composition is missing a seer')
    const seerSession = players.find((player) => player.playerId === seer.id)
    if (!seerSession) throw new Error('Seer session is missing')
    const target = snapshot.value.lobbyPlayers.find(
      (player) => player.id !== seer.id,
    )
    if (!target) throw new Error('No vote target available')

    const result = store.execute({
      gameId: created.gameId,
      sessionToken: seerSession.token,
      idempotencyKey: 'self-seer-submit',
      expectedVersion: snapshot.value.version,
      command: {
        type: 'SUBMIT_NIGHT_ACTION',
        action: {
          type: 'SEER_INSPECT',
          actorId: seer.id,
          targetId: target.id,
        },
      },
    })
    expect(result.ok).toBe(true)

    const after = store.getGame(created.gameId)
    expect(after.ok).toBe(true)
    if (!after.ok) return
    const seerStep = after.value.state?.queue.find(
      (item) => item.step === 'SEER_INSPECT',
    )
    // Bot confirm ngay trong cùng lệnh: step COMPLETED, step kế ACTIVE.
    expect(seerStep?.status).toBe('COMPLETED')
    const activeStep = after.value.state?.queue.find(
      (item) => item.status === 'ACTIVE',
    )
    expect(activeStep).toBeDefined()

    const events = after.value.history.map((entry) => entry.event.type)
    expect(events).toContain('NIGHT_ACTION_CONFIRMED')
    expect(events).toContain('SEER_RESULT_RECORDED')

    // Event do người chơi submit ghi actor PLAYER; event bot ghi SYSTEM.
    const submittedEntry = after.value.history.find(
      (entry) => entry.event.type === 'NIGHT_ACTION_SUBMITTED',
    )
    expect(submittedEntry?.actor).toBe('PLAYER')
    expect(submittedEntry?.actorPlayerId).toBe(seer.id)
    const confirmedEntry = after.value.history.find(
      (entry) => entry.event.type === 'NIGHT_ACTION_CONFIRMED',
    )
    expect(confirmedEntry?.actor).toBe('SYSTEM')
    expect(confirmedEntry?.actorPlayerId).toBeNull()
  })
})

describe('InMemoryGameStore rời game (R23)', () => {
  function createSelfGame() {
    const store = createStore()
    const created = store.createGame({ mode: 'SELF', creatorName: 'Hoa' })
    if (!created.ok) throw new Error(created.error.message)
    return { store, created: selfGame(created.value) }
  }

  function currentVersion(store: InMemoryGameStore, gameId: string): number {
    const snapshot = store.getGame(gameId)
    if (!snapshot.ok) throw new Error(snapshot.error.message)
    return snapshot.value.version
  }

  function startSelfGame() {
    const { store, created } = createSelfGame()
    const players = [
      { playerId: created.playerId, token: created.playerSessionToken },
    ]
    for (const name of ['An', 'Binh', 'Cuong', 'Dung']) {
      const joined = store.joinGame(created.roomCode, name)
      if (!joined.ok) throw new Error(joined.error.message)
      players.push({
        playerId: joined.value.playerId,
        token: joined.value.playerSessionToken,
      })
    }

    const assigned = store.assignRoles(
      created.playerSessionToken,
      currentVersion(store, created.gameId),
      'self-assign',
    )
    if (!assigned.ok) throw new Error(assigned.error.message)

    for (const player of players) {
      const ready = store.setReady(
        player.token,
        currentVersion(store, created.gameId),
        true,
        `self-ready-${player.token}`,
      )
      if (!ready.ok) throw new Error(ready.error.message)
    }

    const started = store.startGame(
      created.playerSessionToken,
      currentVersion(store, created.gameId),
      'self-start',
    )
    if (!started.ok) throw new Error(started.error.message)
    return { store, created, players }
  }

  function findPlayerSession(
    players: { playerId: string; token: string }[],
    playerId: string,
  ): { playerId: string; token: string } {
    const session = players.find((player) => player.playerId === playerId)
    if (!session) throw new Error('Player session is missing')
    return session
  }

  it('rời ván giữa đêm: step của người rời bị bot skip ngay (PLAYER_LEFT), event PLAYER_LEFT_GAME actor PLAYER', () => {
    const { store, created, players } = startSelfGame()
    const snapshot = store.getGame(created.gameId)
    if (!snapshot.ok) throw new Error(snapshot.error.message)
    // Step ACTIVE đầu tiên của đêm là SEER_INSPECT — seer rời là chủ step.
    const seer = snapshot.value.lobbyPlayers.find(
      (player) => player.role === 'SEER',
    )
    if (!seer) throw new Error('Composition is missing a seer')
    const seerSession = findPlayerSession(players, seer.id)

    const left = store.leaveGame(
      seerSession.token,
      snapshot.value.version,
      'leave-mid-night',
    )
    expect(left.ok).toBe(true)

    const after = store.getGame(created.gameId)
    if (!after.ok) throw new Error(after.error.message)
    // Không mark dead — rule engine vẫn coi người rời đang sống.
    expect(
      after.value.state?.players.find((player) => player.id === seer.id)?.alive,
    ).toBe(true)
    expect(
      after.value.lobbyPlayers.find((player) => player.id === seer.id)?.leftAt,
    ).toBeTruthy()

    const seerStep = after.value.state?.queue.find(
      (item) => item.step === 'SEER_INSPECT',
    )
    expect(seerStep).toMatchObject({
      status: 'SKIPPED',
      skipReason: 'PLAYER_LEFT',
    })
    // Ván đi tiếp ngay: step kế đã ACTIVE mà không cần chờ timer.
    expect(
      after.value.state?.queue.find((item) => item.status === 'ACTIVE')?.step,
    ).toBe('WEREWOLF_ATTACK')

    const leftEvent = after.value.history.find(
      (entry) => entry.event.type === 'PLAYER_LEFT_GAME',
    )
    expect(leftEvent).toMatchObject({ actor: 'PLAYER', actorPlayerId: seer.id })
  })

  it('người rời dùng session cũ vẫn xem được view với cờ left (reconnect chỉ xem)', () => {
    const { store, created, players } = startSelfGame()
    const snapshot = store.getGame(created.gameId)
    if (!snapshot.ok) throw new Error(snapshot.error.message)
    const seer = snapshot.value.lobbyPlayers.find(
      (player) => player.role === 'SEER',
    )
    if (!seer) throw new Error('Composition is missing a seer')
    const seerSession = findPlayerSession(players, seer.id)
    const left = store.leaveGame(
      seerSession.token,
      snapshot.value.version,
      'leave-for-view',
    )
    if (!left.ok) throw new Error(left.error.message)

    const view = store.getGameView(seerSession.token)
    expect(view.ok).toBe(true)
    if (!view.ok || view.value.viewer !== 'PLAYER') return
    expect(view.value.me.left).toBe(true)
    expect(view.value.me.alive).toBe(true)
    expect(
      view.value.players.find((player) => player.id === seer.id)?.left,
    ).toBe(true)

    // Người khác cũng thấy seer đã rời.
    const other = players.find((player) => player.playerId !== seer.id)
    if (!other) throw new Error('Other player is missing')
    const otherView = store.getGameView(other.token)
    if (!otherView.ok || otherView.value.viewer !== 'PLAYER') return
    expect(
      otherView.value.players.find((player) => player.id === seer.id)?.left,
    ).toBe(true)
  })

  it('người rời không submit được command nữa (NOT_AUTHORIZED)', () => {
    const { store, created, players } = startSelfGame()
    const snapshot = store.getGame(created.gameId)
    if (!snapshot.ok) throw new Error(snapshot.error.message)
    const seer = snapshot.value.lobbyPlayers.find(
      (player) => player.role === 'SEER',
    )
    if (!seer) throw new Error('Composition is missing a seer')
    const seerSession = findPlayerSession(players, seer.id)
    const left = store.leaveGame(
      seerSession.token,
      snapshot.value.version,
      'leave-then-act',
    )
    if (!left.ok) throw new Error(left.error.message)
    const after = store.getGame(created.gameId)
    if (!after.ok) throw new Error(after.error.message)

    const submitted = store.execute({
      gameId: created.gameId,
      sessionToken: seerSession.token,
      idempotencyKey: 'leaver-act',
      expectedVersion: after.value.version,
      command: {
        type: 'SUBMIT_NIGHT_ACTION',
        action: { type: 'SEER_INSPECT', actorId: seer.id, targetId: seer.id },
      },
    })
    expect(submitted).toMatchObject({
      ok: false,
      error: { code: 'NOT_AUTHORIZED' },
    })
  })

  it('END_GAME: chủ phòng kết thúc ván sớm (winner null); player thường bị chặn', () => {
    const { store, created, players } = startSelfGame()
    const snapshot = store.getGame(created.gameId)
    if (!snapshot.ok) throw new Error(snapshot.error.message)

    // Player thường không phải chủ phòng.
    const other = players.find((player) => player.playerId !== created.playerId)
    if (!other) throw new Error('Other player is missing')
    const rejected = store.execute({
      gameId: created.gameId,
      sessionToken: other.token,
      idempotencyKey: 'end-not-host',
      expectedVersion: snapshot.value.version,
      command: { type: 'END_GAME', reason: 'Không đủ người' },
    })
    expect(rejected).toMatchObject({
      ok: false,
      error: { code: 'NOT_AUTHORIZED' },
    })

    const ended = store.execute({
      gameId: created.gameId,
      sessionToken: created.playerSessionToken,
      idempotencyKey: 'end-by-host',
      expectedVersion: snapshot.value.version,
      command: { type: 'END_GAME', reason: 'Không đủ người' },
    })
    expect(ended.ok).toBe(true)

    const after = store.getGame(created.gameId)
    if (!after.ok) throw new Error(after.error.message)
    expect(after.value.state?.phase).toBe('GAME_OVER')
    expect(after.value.state?.winner).toBeNull()
    expect(
      after.value.history.find(
        (entry) => entry.event.type === 'GAME_ENDED_MANUAL',
      ),
    ).toMatchObject({ actor: 'PLAYER', actorPlayerId: created.playerId })
  })

  it('lobby: người rời không nhận vai và không chặn start (6 người, 1 rời, start với 5)', () => {
    const { store, created } = createSelfGame()
    const joinedPlayers = []
    for (const name of ['An', 'Binh', 'Cuong', 'Dung', 'Giang']) {
      const joined = store.joinGame(created.roomCode, name)
      if (!joined.ok) throw new Error(joined.error.message)
      joinedPlayers.push({
        playerId: joined.value.playerId,
        token: joined.value.playerSessionToken,
      })
    }
    const leaver = joinedPlayers[0]
    if (!leaver) throw new Error('Joined player is missing')
    const left = store.leaveGame(
      leaver.token,
      currentVersion(store, created.gameId),
      'lobby-leave',
    )
    expect(left.ok).toBe(true)

    const assigned = store.assignRoles(
      created.playerSessionToken,
      currentVersion(store, created.gameId),
      'assign-after-leave',
    )
    expect(assigned.ok).toBe(true)

    // Chỉ 5 người còn tham gia cần ready — người rời không chặn.
    for (const player of joinedPlayers.slice(1)) {
      const ready = store.setReady(
        player.token,
        currentVersion(store, created.gameId),
        true,
        `ready-after-leave-${player.playerId}`,
      )
      if (!ready.ok) throw new Error(ready.error.message)
    }
    const hostReady = store.setReady(
      created.playerSessionToken,
      currentVersion(store, created.gameId),
      true,
      'host-ready-after-leave',
    )
    if (!hostReady.ok) throw new Error(hostReady.error.message)

    const started = store.startGame(
      created.playerSessionToken,
      currentVersion(store, created.gameId),
      'start-after-leave',
    )
    expect(started.ok).toBe(true)

    const snapshot = store.getGame(created.gameId)
    if (!snapshot.ok) throw new Error(snapshot.error.message)
    expect(snapshot.value.lobbyPlayers).toHaveLength(6)
    expect(
      snapshot.value.lobbyPlayers.find(
        (player) => player.id === leaver.playerId,
      ),
    ).toMatchObject({ role: null, leftAt: expect.anything() })
    // Domain state chỉ gồm người còn tham gia.
    expect(snapshot.value.state?.players).toHaveLength(5)
    expect(
      snapshot.value.state?.players.find(
        (player) => player.id === leaver.playerId,
      ),
    ).toBeUndefined()
  })

  it('rematch xóa leftAt — ai rời ván cũ cũng quay lại sảnh bình thường', () => {
    const { store, created, players } = startSelfGame()
    const snapshot = store.getGame(created.gameId)
    if (!snapshot.ok) throw new Error(snapshot.error.message)
    const seer = snapshot.value.lobbyPlayers.find(
      (player) => player.role === 'SEER',
    )
    if (!seer) throw new Error('Composition is missing a seer')
    const seerSession = findPlayerSession(players, seer.id)
    const left = store.leaveGame(
      seerSession.token,
      snapshot.value.version,
      'leave-before-rematch',
    )
    if (!left.ok) throw new Error(left.error.message)

    const ended = store.execute({
      gameId: created.gameId,
      sessionToken: created.playerSessionToken,
      idempotencyKey: 'end-for-rematch',
      expectedVersion: currentVersion(store, created.gameId),
      command: { type: 'END_GAME', reason: 'Kết thúc để rematch' },
    })
    if (!ended.ok) throw new Error(ended.error.message)

    const rematch = store.rematch(
      created.playerSessionToken,
      currentVersion(store, created.gameId),
      'rematch-after-leave',
    )
    expect(rematch.ok).toBe(true)

    const after = store.getGame(created.gameId)
    if (!after.ok) throw new Error(after.error.message)
    expect(after.value.lobbyPlayers.every((player) => !player.leftAt)).toBe(
      true,
    )
  })

  it('MODERATED không rời game được', () => {
    const { store, created, players, game } = createStartedGame()
    const player = players[0]
    if (!player) throw new Error('Player is missing')
    const left = store.leaveGame(
      player.playerSessionToken,
      game.version,
      'moderated-leave',
    )
    expect(left).toMatchObject({
      ok: false,
      error: { code: 'NOT_AUTHORIZED' },
    })
    expect(created.mode).toBe('MODERATED')
    expect(store.getGame(created.gameId).ok).toBe(true)
  })
})

describe('InMemoryGameStore game over + rematch SELF (T7)', () => {
  function createSelfGame() {
    const store = createStore()
    const created = store.createGame({ mode: 'SELF', creatorName: 'Hoa' })
    if (!created.ok) throw new Error(created.error.message)
    return { store, created: selfGame(created.value) }
  }

  function currentVersion(store: InMemoryGameStore, gameId: string): number {
    const snapshot = store.getGame(gameId)
    if (!snapshot.ok) throw new Error(snapshot.error.message)
    return snapshot.value.version
  }

  function startSelfGame() {
    const { store, created } = createSelfGame()
    const players = [
      { playerId: created.playerId, token: created.playerSessionToken },
    ]
    for (const name of ['An', 'Binh', 'Cuong', 'Dung']) {
      const joined = store.joinGame(created.roomCode, name)
      if (!joined.ok) throw new Error(joined.error.message)
      players.push({
        playerId: joined.value.playerId,
        token: joined.value.playerSessionToken,
      })
    }

    const assigned = store.assignRoles(
      created.playerSessionToken,
      currentVersion(store, created.gameId),
      'self-assign',
    )
    if (!assigned.ok) throw new Error(assigned.error.message)

    for (const player of players) {
      const ready = store.setReady(
        player.token,
        currentVersion(store, created.gameId),
        true,
        `self-ready-${player.token}`,
      )
      if (!ready.ok) throw new Error(ready.error.message)
    }

    const started = store.startGame(
      created.playerSessionToken,
      currentVersion(store, created.gameId),
      'self-start',
    )
    if (!started.ok) throw new Error(started.error.message)
    return { store, created, players }
  }

  function endByHost(
    store: InMemoryGameStore,
    created: { gameId: string; playerSessionToken: string },
  ) {
    const ended = store.execute({
      gameId: created.gameId,
      sessionToken: created.playerSessionToken,
      idempotencyKey: 't7-end',
      expectedVersion: currentVersion(store, created.gameId),
      command: { type: 'END_GAME', reason: 'Kết thúc để chơi ván mới' },
    })
    if (!ended.ok) throw new Error(ended.error.message)
  }

  it('chủ phòng rematch: giữ nguyên lobby + mode SELF, xóa vai/ready/leftAt', () => {
    const { store, created, players } = startSelfGame()
    const seerSnapshot = store.getGame(created.gameId)
    if (!seerSnapshot.ok) throw new Error(seerSnapshot.error.message)
    expect(seerSnapshot.value.mode).toBe('SELF')

    // Người rời + ván kết thúc — rematch phải đưa cả người rời về sảnh.
    const seer = seerSnapshot.value.lobbyPlayers.find(
      (player) => player.role === 'SEER',
    )
    if (!seer) throw new Error('Composition is missing a seer')
    const seerSession = players.find((player) => player.playerId === seer.id)
    if (!seerSession) throw new Error('Seer session is missing')
    const left = store.leaveGame(
      seerSession.token,
      currentVersion(store, created.gameId),
      't7-leave',
    )
    if (!left.ok) throw new Error(left.error.message)
    endByHost(store, created)

    const rematch = store.rematch(
      created.playerSessionToken,
      currentVersion(store, created.gameId),
      't7-rematch',
    )
    expect(rematch.ok).toBe(true)

    const after = store.getGame(created.gameId)
    if (!after.ok) throw new Error(after.error.message)
    // Cùng phòng, cùng mode, lobby nguyên vẹn — chỉ state và trạng thái bị xóa.
    expect(after.value.id).toBe(created.gameId)
    expect(after.value.roomCode).toBe(created.roomCode)
    expect(after.value.mode).toBe('SELF')
    expect(after.value.hostPlayerId).toBe(created.playerId)
    expect(after.value.state).toBeNull()
    expect(after.value.lobbyPlayers).toHaveLength(5)
    expect(
      after.value.lobbyPlayers.every(
        (player) => player.role === null && !player.ready && !player.leftAt,
      ),
    ).toBe(true)
    expect(after.value.history.map((entry) => entry.event.type)).toContain(
      'MATCH_RESET',
    )

    // Ván mới chạy được ngay với cùng lobby.
    const assigned = store.assignRoles(
      created.playerSessionToken,
      currentVersion(store, created.gameId),
      't7-assign-2',
    )
    expect(assigned.ok).toBe(true)
    for (const player of players) {
      const ready = store.setReady(
        player.token,
        currentVersion(store, created.gameId),
        true,
        `t7-ready-2-${player.playerId}`,
      )
      if (!ready.ok) throw new Error(ready.error.message)
    }
    const started = store.startGame(
      created.playerSessionToken,
      currentVersion(store, created.gameId),
      't7-start-2',
    )
    expect(started.ok).toBe(true)
    const secondMatch = store.getGame(created.gameId)
    if (!secondMatch.ok) throw new Error(secondMatch.error.message)
    expect(secondMatch.value.state?.phase).toBe('NIGHT')
    expect(secondMatch.value.state?.round).toBe(1)
  })

  it('player thường (không phải chủ phòng) không rematch được', () => {
    const { store, created, players } = startSelfGame()
    endByHost(store, created)

    const other = players.find((player) => player.playerId !== created.playerId)
    if (!other) throw new Error('Other player is missing')
    const rejected = store.rematch(
      other.token,
      currentVersion(store, created.gameId),
      't7-rematch-not-host',
    )
    expect(rejected).toMatchObject({
      ok: false,
      error: { code: 'NOT_AUTHORIZED' },
    })
  })
})
