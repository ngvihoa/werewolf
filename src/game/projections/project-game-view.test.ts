import type { LocalGame, StoredEvent } from '../store/model'
import type { GameEvent } from '../orchestration/events'
import type { GameState } from '../orchestration/model'

import { describe, expect, it } from 'vitest'

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
  it('strips injected role and action data from a player response', () => {
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
      expect(output.value.players[0]).not.toHaveProperty('role')
      expect(output.value.players[0]).not.toHaveProperty('action')
    }
  })
})
