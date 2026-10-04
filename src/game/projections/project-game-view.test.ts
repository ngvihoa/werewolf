import type { LocalGame, StoredEvent } from '../store/model'
import type { GameEvent } from '../orchestration/events'
import type { GameState } from '../orchestration/model'

import { describe, expect, it } from 'vitest'

import { MVP_SETTINGS } from '../rules/mvp-settings'

import { getGameViewResultSchema } from './schema'
import { projectGameView } from './project-game-view'

const state: GameState = {
  phase: 'NIGHT',
  round: 2,
  players: [
    { id: 'seer', role: 'SEER', alive: true, abilityState: null },
    { id: 'wolf', role: 'WEREWOLF', alive: true, abilityState: null },
    {
      id: 'alpha',
      role: 'ALPHA_WEREWOLF',
      alive: true,
      abilityState: { enhancedAttackAvailable: true },
    },
    {
      id: 'witch',
      role: 'WITCH',
      alive: true,
      abilityState: {
        healingPotionAvailable: true,
        poisonPotionAvailable: false,
      },
    },
    {
      id: 'elder',
      role: 'ELDER',
      alive: true,
      abilityState: { werewolfAttackSurvivalAvailable: true },
    },
    { id: 'villager', role: 'VILLAGER', alive: false, abilityState: null },
  ],
  queue: [
    { step: 'SEER_INSPECT', status: 'COMPLETED', skipReason: null },
    { step: 'WEREWOLF_ATTACK', status: 'COMPLETED', skipReason: null },
    { step: 'WITCH_ACTION', status: 'ACTIVE', skipReason: null },
  ],
  pendingNightAction: null,
  confirmedNightActions: [
    {
      type: 'WEREWOLF_ATTACK',
      actorId: 'alpha',
      targetId: 'witch',
      enhanced: true,
    },
  ],
  pendingNightResolution: null,
  voteAttempt: 1,
  pendingVote: null,
  pendingVoteResolution: null,
  winner: null,
}

function stored(sequence: number, event: GameEvent): StoredEvent {
  return {
    sequence,
    id: `event-${sequence}`,
    gameId: 'game',
    actor: 'PLAYER',
    actorPlayerId: null,
    createdAt: '2026-08-08T00:00:00.000Z',
    event,
  }
}

function createGame(): LocalGame {
  return {
    id: 'game',
    roomCode: 'ABC123',
    version: 10,
    moderatorName: 'Moderator',
    // Fixture mặc định SELF: các test dưới đây kiểm hành vi trên thiết bị
    // người chơi (turn, countdown, consent) — đặc trưng của SELF. Test riêng
    // cho MODERATED tự set mode trong từng case.
    mode: 'SELF',
    hostPlayerId: null,
    settings: MVP_SETTINGS,
    lobbyPlayers: [
      { id: 'seer', displayName: 'Seer', ready: true, role: 'SEER' },
      { id: 'wolf', displayName: 'Wolf', ready: true, role: 'WEREWOLF' },
      {
        id: 'alpha',
        displayName: 'Alpha',
        ready: true,
        role: 'ALPHA_WEREWOLF',
      },
      { id: 'witch', displayName: 'Witch', ready: true, role: 'WITCH' },
      { id: 'elder', displayName: 'Elder', ready: true, role: 'ELDER' },
      {
        id: 'villager',
        displayName: 'Villager',
        ready: true,
        role: 'VILLAGER',
      },
    ],
    state: structuredClone(state),
    history: [
      stored(1, {
        type: 'NIGHT_ACTION_REJECTED',
        action: {
          type: 'WEREWOLF_ATTACK',
          actorId: 'wolf',
          targetId: 'villager',
        },
        reason: 'secret rejected target',
      }),
      stored(2, {
        type: 'SEER_RESULT_RECORDED',
        seerPlayerId: 'seer',
        targetPlayerId: 'wolf',
        result: 'WEREWOLF',
      }),
      stored(3, {
        type: 'PLAYER_DIED',
        playerId: 'villager',
        causes: ['WITCH_POISON'],
      }),
    ],
  }
}

describe('player projections', () => {
  it('shows enhanced attack state only to the Werewolf team', () => {
    const game = createGame()
    const alphaView = projectGameView(game, {
      kind: 'PLAYER',
      playerId: 'alpha',
    })
    const wolfView = projectGameView(game, {
      kind: 'PLAYER',
      playerId: 'wolf',
    })
    const seerView = projectGameView(game, {
      kind: 'PLAYER',
      playerId: 'seer',
    })
    if (
      alphaView?.viewer !== 'PLAYER' ||
      wolfView?.viewer !== 'PLAYER' ||
      seerView?.viewer !== 'PLAYER'
    ) {
      return
    }

    expect(alphaView.turn.enhancedAttackAvailable).toBe(true)
    expect(alphaView.turn.werewolfAttackEnhanced).toBe(true)
    expect(wolfView.turn.werewolfAttackEnhanced).toBe(true)
    expect(seerView.turn.werewolfAttackEnhanced).toBeNull()
    expect(seerView.turn.enhancedAttackAvailable).toBeNull()
  })

  it('shows a submitted final-shot target only to the Hunter', () => {
    const game = createGame()
    game.state!.phase = 'HUNTER_SHOT'
    game.state!.players.push({
      id: 'hunter',
      role: 'HUNTER',
      alive: false,
      abilityState: null,
    })
    game.state!.pendingHunterShot = {
      hunterId: 'hunter',
      targetId: 'wolf',
    }
    game.lobbyPlayers.push({
      id: 'hunter',
      displayName: 'Hunter',
      ready: true,
      role: 'HUNTER',
    })

    const hunterView = projectGameView(game, {
      kind: 'PLAYER',
      playerId: 'hunter',
    })
    const seerView = projectGameView(game, {
      kind: 'PLAYER',
      playerId: 'seer',
    })
    if (hunterView?.viewer !== 'PLAYER' || seerView?.viewer !== 'PLAYER') return

    expect(hunterView.turn.hunterShotTargetId).toBe('wolf')
    expect(seerView.turn.hunterShotTargetId).toBeNull()
    expect(JSON.stringify(seerView)).not.toContain('pendingHunterShot')
  })

  it('shows Elder survival state only to the Elder', () => {
    const game = createGame()
    const elderView = projectGameView(game, {
      kind: 'PLAYER',
      playerId: 'elder',
    })
    const seerView = projectGameView(game, {
      kind: 'PLAYER',
      playerId: 'seer',
    })
    if (elderView?.viewer !== 'PLAYER' || seerView?.viewer !== 'PLAYER') return

    expect(elderView.me.abilityState).toEqual({
      werewolfAttackSurvivalAvailable: true,
    })
    expect(JSON.stringify(seerView)).not.toContain(
      'werewolfAttackSurvivalAvailable',
    )
  })

  it('reveals conversion only to Hybrid Wolf and grants wolf controls after conversion', () => {
    const game = createGame()
    game.state!.players.push({
      id: 'hybrid',
      role: 'HYBRID_WOLF',
      alive: true,
      abilityState: { converted: false },
    })
    game.lobbyPlayers.push({
      id: 'hybrid',
      displayName: 'Hybrid',
      ready: true,
      role: 'HYBRID_WOLF',
    })
    game.state!.queue = [
      { step: 'WEREWOLF_ATTACK', status: 'ACTIVE', skipReason: null },
    ]

    const before = projectGameView(game, {
      kind: 'PLAYER',
      playerId: 'hybrid',
    })
    if (before?.viewer !== 'PLAYER') return
    expect(before.me.abilityState).toEqual({ converted: false })
    expect(before.turn.canAct).toBe(false)
    expect(before.turn.werewolfTeammates).toEqual([])

    const hybrid = game.state!.players.find(
      (player) => player.role === 'HYBRID_WOLF',
    )
    if (hybrid?.role !== 'HYBRID_WOLF') return
    hybrid.abilityState.converted = true

    const after = projectGameView(game, {
      kind: 'PLAYER',
      playerId: 'hybrid',
    })
    const wolfView = projectGameView(game, {
      kind: 'PLAYER',
      playerId: 'wolf',
    })
    const seerView = projectGameView(game, {
      kind: 'PLAYER',
      playerId: 'seer',
    })
    if (
      after?.viewer !== 'PLAYER' ||
      wolfView?.viewer !== 'PLAYER' ||
      seerView?.viewer !== 'PLAYER'
    ) {
      return
    }
    expect(after.turn.canAct).toBe(true)
    expect(after.turn.werewolfTeammates.map((player) => player.id)).toContain(
      'wolf',
    )
    expect(
      wolfView.turn.werewolfTeammates.map((player) => player.id),
    ).toContain('hybrid')
    expect(JSON.stringify(seerView)).not.toContain('converted')
  })

  it('contains only public player fields and the viewer private state', () => {
    const view = projectGameView(createGame(), {
      kind: 'PLAYER',
      playerId: 'seer',
    })
    expect(view?.viewer).toBe('PLAYER')
    if (!view || view.viewer !== 'PLAYER') return

    expect(view.me.role).toBe('SEER')
    expect(view.players.find((player) => player.id === 'witch')).toEqual({
      id: 'witch',
      displayName: 'Witch',
      alive: true,
      ready: true,
      role: null,
    })
    expect(JSON.stringify(view)).not.toContain('poisonPotionAvailable')
    expect(JSON.stringify(view)).not.toContain('secret rejected target')
  })

  it('shows an immutable Seer result only to its owner', () => {
    const seerView = projectGameView(createGame(), {
      kind: 'PLAYER',
      playerId: 'seer',
    })
    const villagerView = projectGameView(createGame(), {
      kind: 'PLAYER',
      playerId: 'villager',
    })
    if (seerView?.viewer !== 'PLAYER' || villagerView?.viewer !== 'PLAYER') {
      return
    }

    expect(seerView.privateHistory.at(-1)?.event).toEqual({
      type: 'SEER_RESULT_RECORDED',
      targetPlayerId: 'wolf',
      result: 'WEREWOLF',
    })
    expect(villagerView.privateHistory).toEqual([])
  })

  it('shows Werewolf target only to Witch during the Witch step', () => {
    const game = createGame()
    const witchView = projectGameView(game, {
      kind: 'PLAYER',
      playerId: 'witch',
    })
    const seerView = projectGameView(game, {
      kind: 'PLAYER',
      playerId: 'seer',
    })
    if (witchView?.viewer !== 'PLAYER' || seerView?.viewer !== 'PLAYER') return

    expect(witchView.turn.werewolfTargetId).toBe('witch')
    expect(seerView.turn.werewolfTargetId).toBeNull()

    game.state!.queue[2].status = 'COMPLETED'
    expect(
      projectGameView(game, { kind: 'PLAYER', playerId: 'witch' }),
    ).toMatchObject({ turn: { werewolfTargetId: null } })
  })

  it('publishes death without role or cause', () => {
    const view = projectGameView(createGame(), {
      kind: 'PLAYER',
      playerId: 'seer',
    })
    if (view?.viewer !== 'PLAYER') return
    expect(view.publicHistory.at(-1)?.event).toEqual({
      type: 'PLAYER_DIED',
      playerId: 'villager',
    })
  })

  it('shows a player only their own rejected action', () => {
    const wolfView = projectGameView(createGame(), {
      kind: 'PLAYER',
      playerId: 'wolf',
    })
    const seerView = projectGameView(createGame(), {
      kind: 'PLAYER',
      playerId: 'seer',
    })
    if (wolfView?.viewer !== 'PLAYER' || seerView?.viewer !== 'PLAYER') return

    expect(wolfView.privateHistory[0]?.event.type).toBe(
      'OWN_NIGHT_ACTION_REJECTED',
    )
    expect(JSON.stringify(seerView)).not.toContain('secret rejected target')
  })

  it('shows charm targets only to Piper and charm status only to its owner', () => {
    const game = createGame()
    game.lobbyPlayers.push({
      id: 'piper',
      displayName: 'Piper',
      ready: true,
      role: 'PIPER',
    })
    game.state!.players.push({
      id: 'piper',
      role: 'PIPER',
      alive: true,
      abilityState: null,
    })
    game.state!.charmedPlayerIds = ['seer']

    const piperView = projectGameView(game, {
      kind: 'PLAYER',
      playerId: 'piper',
    })
    const seerView = projectGameView(game, {
      kind: 'PLAYER',
      playerId: 'seer',
    })
    const wolfView = projectGameView(game, {
      kind: 'PLAYER',
      playerId: 'wolf',
    })
    if (
      piperView?.viewer !== 'PLAYER' ||
      seerView?.viewer !== 'PLAYER' ||
      wolfView?.viewer !== 'PLAYER'
    ) {
      return
    }

    expect(piperView.turn.charmedPlayerIds).toEqual(['seer'])
    expect(seerView.isCharmed).toBe(true)
    expect(seerView.turn.charmedPlayerIds).toEqual([])
    expect(wolfView.isCharmed).toBe(false)
    expect(wolfView.turn.charmedPlayerIds).toEqual([])
  })

  it('shows each lover only the other lover without revealing their role', () => {
    const game = createGame()
    game.state!.loverIds = ['seer', 'wolf']

    const seerView = projectGameView(game, {
      kind: 'PLAYER',
      playerId: 'seer',
    })
    const wolfView = projectGameView(game, {
      kind: 'PLAYER',
      playerId: 'wolf',
    })
    const witchView = projectGameView(game, {
      kind: 'PLAYER',
      playerId: 'witch',
    })
    if (
      seerView?.viewer !== 'PLAYER' ||
      wolfView?.viewer !== 'PLAYER' ||
      witchView?.viewer !== 'PLAYER'
    ) {
      return
    }

    expect(seerView.lover).toEqual({
      id: 'wolf',
      displayName: 'Wolf',
      ready: true,
      alive: true,
    })
    expect(wolfView.lover?.id).toBe('seer')
    expect(witchView.lover).toBeNull()
    expect(seerView.lover).not.toHaveProperty('role')
  })
})

describe('self mode vote projection', () => {
  it('phase VOTE ở SELF: hiện count + phiếu của mình, không lộ phiếu người khác', () => {
    const game = createGame()
    game.mode = 'SELF'
    game.hostPlayerId = null
    const state = game.state!
    state.phase = 'VOTE'
    state.voteSubmissions = { seer: 'wolf' }

    const seerView = projectGameView(game, { kind: 'PLAYER', playerId: 'seer' })
    if (seerView?.viewer !== 'PLAYER') return
    expect(seerView.vote).toEqual({
      canVote: false,
      hasVoted: true,
      myTargetId: 'wolf',
      votedCount: 1,
      aliveCount: 5,
      voteAttempt: 1,
    })

    const wolfView = projectGameView(game, { kind: 'PLAYER', playerId: 'wolf' })
    if (wolfView?.viewer !== 'PLAYER') return
    // Người khác bỏ phiếu cho wolf nhưng wolf không thấy nội dung phiếu nào
    // ngoài phiếu của chính mình.
    expect(wolfView.vote).toEqual({
      canVote: true,
      hasVoted: false,
      myTargetId: null,
      votedCount: 1,
      aliveCount: 5,
      voteAttempt: 1,
    })
  })

  it('M6: MODERATED có block vote với candidateCounts; ngoài phase VOTE thì không', () => {
    const game = createGame()
    game.mode = 'MODERATED'
    game.state!.phase = 'VOTE'
    game.state!.voteSubmissions = { seer: 'wolf', wolf: 'seer', alpha: null }
    const moderated = projectGameView(game, {
      kind: 'PLAYER',
      playerId: 'seer',
    })
    if (moderated?.viewer !== 'PLAYER') return
    expect(moderated.vote).toMatchObject({
      hasVoted: true,
      myTargetId: 'wolf',
      votedCount: 3,
      aliveCount: 5,
      voteAttempt: 1,
      // M6: counts theo ứng viên chỉ ở MODERATED; phiếu trắng không vào đây.
      candidateCounts: { seer: 1, wolf: 1 },
    })
    expect(moderated.vote?.canVote).toBe(false)

    // Người chưa vote thấy nút bấm và counts như nhau.
    const fresh = projectGameView(game, { kind: 'PLAYER', playerId: 'witch' })
    if (fresh?.viewer !== 'PLAYER') return
    expect(fresh.vote).toMatchObject({
      canVote: true,
      hasVoted: false,
      myTargetId: null,
      candidateCounts: { seer: 1, wolf: 1 },
    })

    const selfDay = createGame()
    selfDay.mode = 'SELF'
    selfDay.state!.phase = 'DAY'
    const dayView = projectGameView(selfDay, {
      kind: 'PLAYER',
      playerId: 'seer',
    })
    if (dayView?.viewer !== 'PLAYER') return
    expect(dayView.vote).toBeUndefined()
  })

  it('M1/M13: player MODERATED không thấy queue/turn — trừ prompt hunter shot', () => {
    const game = createGame()
    game.mode = 'MODERATED'
    const night = projectGameView(game, { kind: 'PLAYER', playerId: 'seer' })
    if (night?.viewer !== 'PLAYER') return
    expect(night.queue).toEqual([])
    expect(night.turn.canAct).toBe(false)
    expect(night.turn.activeStep).toBeNull()
    expect(night.turn.werewolfTargetId).toBeNull()
    expect(night.turn.werewolfTeammates).toEqual([])

    // Ngoại lệ duy nhất: Thợ săn bị loại ban ngày tự bấm phát bắn.
    const hunterGame = structuredClone(game)
    hunterGame.state!.phase = 'HUNTER_SHOT'
    hunterGame.state!.pendingHunterShot = { hunterId: 'seer', targetId: null }
    const hunterView = projectGameView(hunterGame, {
      kind: 'PLAYER',
      playerId: 'seer',
    })
    if (hunterView?.viewer !== 'PLAYER') return
    expect(hunterView.turn.canAct).toBe(true)

    const bystanderView = projectGameView(hunterGame, {
      kind: 'PLAYER',
      playerId: 'wolf',
    })
    if (bystanderView?.viewer !== 'PLAYER') return
    expect(bystanderView.turn.canAct).toBe(false)
  })
})

describe('moderator projection', () => {
  it('returns a detached full server snapshot', () => {
    const game = createGame()
    const view = projectGameView(game, { kind: 'MODERATOR', playerId: null })
    expect(view).toEqual({ viewer: 'MODERATOR', game })
    if (view?.viewer === 'MODERATOR') {
      view.game.state!.players[0].alive = false
    }
    expect(game.state!.players[0].alive).toBe(true)
  })
})

describe('getGameView runtime output', () => {
  it('strips unknown injected fields from a player response', () => {
    const view = projectGameView(createGame(), {
      kind: 'PLAYER',
      playerId: 'seer',
    })
    if (view?.viewer !== 'PLAYER') return

    const unsafeOutput = {
      ok: true as const,
      value: {
        ...view,
        pendingNightAction: state.confirmedNightActions[0],
        players: view.players.map((player) => ({
          ...player,
          role: 'WEREWOLF',
          action: state.confirmedNightActions[0],
        })),
      },
    }

    const output = getGameViewResultSchema.parse(unsafeOutput)
    expect(output.ok).toBe(true)
    expect(JSON.stringify(output)).not.toContain('pendingNightAction')
    if (output.ok && output.value.viewer === 'PLAYER') {
      // 'action' không nằm trong schema nên bị bỏ. 'role' là trường chính
      // thức của danh sách người chơi; việc null hay lộ ra do projection
      // quyết định ở server — xem test 'reveals every role only after'.
      expect(output.value.players[0]).not.toHaveProperty('action')
    }
  })

  it('reveals every role only after the game is over', () => {
    const game = createGame()
    const before = projectGameView(game, { kind: 'PLAYER', playerId: 'seer' })
    if (before?.viewer !== 'PLAYER') return
    expect(before.players.every((player) => player.role === null)).toBe(true)

    game.state!.phase = 'GAME_OVER'
    game.state!.winner = 'WEREWOLF'
    const after = projectGameView(game, { kind: 'PLAYER', playerId: 'seer' })
    if (after?.viewer !== 'PLAYER') return
    expect(after.players.every((player) => player.role !== null)).toBe(true)
    const wolfEntry = after.players.find((player) => player.id === 'wolf')
    expect(wolfEntry?.role).toBe('WEREWOLF')
  })
})

describe('rời game projection (R23)', () => {
  it('cờ left trên players + me; đếm vote/consent loại trừ người đã rời', () => {
    const game = createGame()
    game.mode = 'SELF'
    game.hostPlayerId = null
    game.lobbyPlayers = game.lobbyPlayers.map((player) =>
      player.id === 'alpha'
        ? { ...player, leftAt: '2026-08-08T00:00:00.000Z' }
        : player,
    )
    const state = game.state!
    state.phase = 'VOTE'
    // alpha (đã rời) chưa bỏ phiếu; seer, wolf, witch đã bỏ.
    state.voteSubmissions = { seer: 'wolf', wolf: 'seer', witch: 'wolf' }

    const seerView = projectGameView(game, { kind: 'PLAYER', playerId: 'seer' })
    if (seerView?.viewer !== 'PLAYER') return
    // aliveCount chỉ tính người sống còn ở lại (alpha rời, villager chết);
    // alpha chưa vote không chặn hiển thị count.
    expect(seerView.vote).toEqual({
      canVote: false,
      hasVoted: true,
      myTargetId: 'wolf',
      votedCount: 3,
      aliveCount: 4,
      voteAttempt: 1,
    })
    expect(seerView.players.find((player) => player.id === 'alpha')?.left).toBe(
      true,
    )
    expect(
      seerView.players.find((player) => player.id === 'elder')?.left,
    ).toBeUndefined()

    const alphaView = projectGameView(game, {
      kind: 'PLAYER',
      playerId: 'alpha',
    })
    if (alphaView?.viewer !== 'PLAYER') return
    expect(alphaView.me.left).toBe(true)
    // Người đã rời không thể bỏ phiếu thêm qua UI.
    expect(alphaView.vote).toMatchObject({ canVote: false, hasVoted: false })
  })

  it('DAY consent: canConsent false cho người đã rời, aliveCount loại trừ họ', () => {
    const game = createGame()
    game.mode = 'SELF'
    game.hostPlayerId = null
    game.lobbyPlayers = game.lobbyPlayers.map((player) =>
      player.id === 'alpha'
        ? { ...player, leftAt: '2026-08-08T00:00:00.000Z' }
        : player,
    )
    const state = game.state!
    state.phase = 'DAY'
    state.voteConsentIds = ['seer', 'wolf']

    const seerView = projectGameView(game, { kind: 'PLAYER', playerId: 'seer' })
    if (seerView?.viewer !== 'PLAYER') return
    expect(seerView.discussion).toEqual({
      canConsent: false,
      hasConsented: true,
      consentCount: 2,
      aliveCount: 4,
      consentNeeded: 3,
    })

    const alphaView = projectGameView(game, {
      kind: 'PLAYER',
      playerId: 'alpha',
    })
    if (alphaView?.viewer !== 'PLAYER') return
    expect(alphaView.discussion).toMatchObject({
      canConsent: false,
      hasConsented: false,
    })
  })
})

describe('M4 parity: proxy input vẫn về đúng chủ role', () => {
  it('action do quản trò nhập vẫn hiện trong privateHistory của chủ role kèm nhãn MODERATOR', () => {
    const game = createGame()
    game.history.push(
      stored(10, {
        type: 'NIGHT_ACTION_SUBMITTED',
        action: { type: 'SEER_INSPECT', actorId: 'seer', targetId: 'wolf' },
        enteredBy: 'MODERATOR',
      }),
      stored(11, {
        type: 'NIGHT_ACTION_CONFIRMED',
        action: { type: 'SEER_INSPECT', actorId: 'seer', targetId: 'wolf' },
        enteredBy: 'MODERATOR',
      }),
      stored(12, {
        type: 'SEER_RESULT_RECORDED',
        seerPlayerId: 'seer',
        targetPlayerId: 'wolf',
        result: 'WEREWOLF',
      }),
    )
    const seerView = projectGameView(game, { kind: 'PLAYER', playerId: 'seer' })
    if (seerView?.viewer !== 'PLAYER') return

    const own = seerView.privateHistory.filter((entry) =>
      ['OWN_NIGHT_ACTION_SUBMITTED', 'OWN_NIGHT_ACTION_CONFIRMED'].includes(
        entry.event.type,
      ),
    )
    expect(own).toHaveLength(2)
    // Parity: hành động do quản trò nhập vẫn đổ về thiết bị của Seer.
    expect(own.every((entry) => entry.enteredBy === 'MODERATOR')).toBe(true)
  })

  it('event cũ không có enteredBy vẫn parse — entry không gắn nhãn', () => {
    const seerView = projectGameView(createGame(), {
      kind: 'PLAYER',
      playerId: 'seer',
    })
    if (seerView?.viewer !== 'PLAYER') return
    expect(seerView.privateHistory[0]?.enteredBy).toBeUndefined()
  })

  it('UNDO_STEP bù trừ: entry riêng của action bị rút khỏi history, thay bằng mục hoàn tác', () => {
    const game = createGame()
    game.history.push(
      stored(10, {
        type: 'NIGHT_ACTION_SUBMITTED',
        action: { type: 'SEER_INSPECT', actorId: 'seer', targetId: 'wolf' },
        enteredBy: 'MODERATOR',
      }),
      stored(11, {
        type: 'NIGHT_ACTION_CONFIRMED',
        action: { type: 'SEER_INSPECT', actorId: 'seer', targetId: 'wolf' },
        enteredBy: 'MODERATOR',
      }),
      stored(12, {
        type: 'SEER_RESULT_RECORDED',
        seerPlayerId: 'seer',
        targetPlayerId: 'wolf',
        result: 'WEREWOLF',
      }),
      stored(13, {
        type: 'STEP_UNDONE',
        step: 'SEER_INSPECT',
        action: { type: 'SEER_INSPECT', actorId: 'seer', targetId: 'wolf' },
        reason: 'Quản trò chọn nhầm mục tiêu',
      }),
    )
    const seerView = projectGameView(game, { kind: 'PLAYER', playerId: 'seer' })
    if (seerView?.viewer !== 'PLAYER') return

    expect(
      seerView.privateHistory.some((entry) =>
        ['OWN_NIGHT_ACTION_SUBMITTED', 'OWN_NIGHT_ACTION_CONFIRMED'].includes(
          entry.event.type,
        ),
      ),
    ).toBe(false)
    // Chỉ kết quả soi của LẦN bị hoàn tác bị rút; kết quả của đêm trước
    // (có sẵn trong fixture, sequence 2) phải còn nguyên.
    expect(
      seerView.privateHistory
        .filter((entry) => entry.event.type === 'SEER_RESULT_RECORDED')
        .map((entry) => entry.sequence),
    ).toEqual([2])
    expect(seerView.privateHistory.at(-1)?.event).toEqual({
      type: 'OWN_NIGHT_ACTION_UNDONE',
      action: { type: 'SEER_INSPECT', actorId: 'seer', targetId: 'wolf' },
      reason: 'Quản trò chọn nhầm mục tiêu',
    })

    // Người khác không thấy gì — bù trừ chỉ áp cho chủ role.
    const wolfView = projectGameView(game, { kind: 'PLAYER', playerId: 'wolf' })
    if (wolfView?.viewer !== 'PLAYER') return
    expect(
      wolfView.privateHistory.some(
        (entry) => entry.event.type === 'OWN_NIGHT_ACTION_UNDONE',
      ),
    ).toBe(false)
  })

  it('Witch bị hoàn tác potion: entry nhật ký đêm bị rút khỏi history', () => {
    const game = createGame()
    const witchAction = {
      type: 'WITCH_ACTION',
      actorId: 'witch',
      heal: true,
      poisonTargetId: null,
    } as const
    game.history.push(
      stored(10, {
        type: 'NIGHT_ACTION_CONFIRMED',
        action: witchAction,
      }),
    )
    const before = projectGameView(game, { kind: 'PLAYER', playerId: 'witch' })
    if (before?.viewer !== 'PLAYER') return
    expect(before.privateHistory).toHaveLength(1)

    game.history.push(
      stored(11, {
        type: 'STEP_UNDONE',
        step: 'WITCH_ACTION',
        action: witchAction,
        reason: 'Sói chưa chọn xong',
      }),
    )
    const after = projectGameView(game, { kind: 'PLAYER', playerId: 'witch' })
    if (after?.viewer !== 'PLAYER') return
    expect(
      after.privateHistory.some(
        (entry) => entry.event.type === 'OWN_NIGHT_ACTION_CONFIRMED',
      ),
    ).toBe(false)
    expect(after.privateHistory.at(-1)?.event.type).toBe(
      'OWN_NIGHT_ACTION_UNDONE',
    )
  })
})
