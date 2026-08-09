import type { LocalGame, StoredEvent } from '../store/model'
import type { GameEvent } from '../orchestration/events'
import type { GameState } from '../orchestration/model'

import { describe, expect, it } from 'vitest'

import { projectGameView } from './project-game-view'

const state: GameState = {
  phase: 'NIGHT',
  round: 2,
  players: [
    { id: 'seer', role: 'SEER', alive: true, abilityState: null },
    { id: 'wolf', role: 'WEREWOLF', alive: true, abilityState: null },
    {
      id: 'witch',
      role: 'WITCH',
      alive: true,
      abilityState: {
        healingPotionAvailable: true,
        poisonPotionAvailable: false,
      },
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
    { type: 'WEREWOLF_ATTACK', actorId: 'wolf', targetId: 'witch' },
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
      { id: 'witch', displayName: 'Witch', ready: true, role: 'WITCH' },
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
