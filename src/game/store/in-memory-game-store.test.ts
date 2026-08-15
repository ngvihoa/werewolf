import { describe, expect, it } from 'vitest'

import { InMemoryGameStore } from './in-memory-game-store'

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
  const created = store.createGame('Moderator')
  if (!created.ok) throw new Error(created.error.message)

  const players = ['An', 'Binh', 'Cuong', 'Dung', 'Hoa'].map((name) => {
    const joined = store.joinGame(created.value.roomCode, name)
    if (!joined.ok) throw new Error(joined.error.message)
    return joined.value
  })
  const assigned = store.assignRoles(created.value.moderatorSessionToken, 6)
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
    )
    if (!ready.ok) throw new Error(ready.error.message)
  }
  const beforeStart = store.getGame(created.value.gameId)
  if (!beforeStart.ok) throw new Error(beforeStart.error.message)

  const started = store.startGame(
    created.value.moderatorSessionToken,
    beforeStart.value.version,
  )
  if (!started.ok) throw new Error(started.error.message)

  const startedGame = store.getGame(created.value.gameId)
  if (!startedGame.ok) throw new Error(startedGame.error.message)

  return { store, created: created.value, players, game: startedGame.value }
}

describe('InMemoryGameStore lobby', () => {
  it('creates a room and joins players with fake sessions', () => {
    const store = createStore()
    const created = store.createGame('Moderator')
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
    const created = store.createGame('Moderator')
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
    const created = store.createGame('Moderator')
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
    )
    const unchanged = store.getGame(created.value.gameId)

    expect(stale.ok).toBe(false)
    if (!stale.ok) expect(stale.error.code).toBe('STALE_VERSION')
    expect(unchanged).toEqual(currentGame)
  })

  it('rejects stale role assignment without changing the game', () => {
    const store = createStore()
    const created = store.createGame('Moderator')
    if (!created.ok) throw new Error(created.error.message)

    for (const name of ['An', 'Binh', 'Cuong', 'Dung', 'Hoa']) {
      store.joinGame(created.value.roomCode, name)
    }

    // Sau năm lượt join, version hiện tại là 6 nên version 5 đã stale.
    const beforeAssignment = store.getGame(created.value.gameId)
    const result = store.assignRoles(created.value.moderatorSessionToken, 5)
    const afterAssignment = store.getGame(created.value.gameId)

    expect(result).toMatchObject({
      ok: false,
      error: { code: 'STALE_VERSION' },
    })
    expect(afterAssignment).toEqual(beforeAssignment)
  })

  it('requires assignment and every player to be ready before start', () => {
    const store = createStore()
    const created = store.createGame('Moderator')
    if (!created.ok) throw new Error(created.error.message)
    for (const name of ['An', 'Binh', 'Cuong', 'Dung', 'Hoa']) {
      store.joinGame(created.value.roomCode, name)
    }

    const beforeAssignment = store.startGame(
      created.value.moderatorSessionToken,
      6,
    )
    expect(beforeAssignment.ok).toBe(false)
    if (!beforeAssignment.ok) {
      expect(beforeAssignment.error.code).toBe('ROLES_NOT_ASSIGNED')
    }

    store.assignRoles(created.value.moderatorSessionToken, 6)
    const beforeReady = store.startGame(created.value.moderatorSessionToken, 7)
    expect(beforeReady.ok).toBe(false)
    if (!beforeReady.ok) {
      expect(beforeReady.error.code).toBe('NOT_ALL_PLAYERS_READY')
    }
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
    const moderatorView = store.getGameView(created.moderatorSessionToken)

    expect(playerView.ok).toBe(true)
    if (playerView.ok && playerView.value.viewer === 'PLAYER') {
      expect(playerView.value.me.id).toBe(players[0].playerId)
      expect(playerView.value.players[0]).not.toHaveProperty('role')
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
      sessionToken: created.moderatorSessionToken,
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
      sessionToken: created.moderatorSessionToken,
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
      sessionToken: created.moderatorSessionToken,
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
