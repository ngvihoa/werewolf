import type { GameCommand } from './commands'
import type { GameState } from './model'
import type { Player } from '../domain'

import { describe, expect, it } from 'vitest'

import { createFirstNightState, executeCommand } from './game-orchestrator'

const fivePlayers: Player[] = [
  { id: 'seer', role: 'SEER', alive: true, abilityState: null },
  { id: 'wolf', role: 'WEREWOLF', alive: true, abilityState: null },
  { id: 'a', role: 'VILLAGER', alive: true, abilityState: null },
  { id: 'b', role: 'VILLAGER', alive: true, abilityState: null },
  { id: 'c', role: 'VILLAGER', alive: true, abilityState: null },
]

function run(state: GameState, command: GameCommand) {
  const result = executeCommand(state, command)
  expect(result.ok).toBe(true)
  if (!result.ok) throw new Error(result.error.message)
  return result.value
}

describe('night orchestration', () => {
  it('submits, rejects and resubmits without changing the input state', () => {
    const initial = createFirstNightState(fivePlayers)
    const submitted = run(initial, {
      type: 'SUBMIT_NIGHT_ACTION',
      action: { type: 'SEER_INSPECT', actorId: 'seer', targetId: 'wolf' },
    })

    expect(initial.pendingNightAction).toBeNull()
    expect(initial.queue[0]?.status).toBe('ACTIVE')
    expect(submitted.state.queue[0]?.status).toBe(
      'WAITING_MODERATOR_CONFIRMATION',
    )

    const rejected = run(submitted.state, {
      type: 'REJECT_STEP',
      reason: 'Wrong physical target',
    })
    expect(rejected.state.pendingNightAction).toBeNull()
    expect(rejected.state.queue[0]?.status).toBe('ACTIVE')
    expect(rejected.events[0]?.type).toBe('NIGHT_ACTION_REJECTED')
  })

  it('runs a five-player night through pending resolution and Day', () => {
    let state = createFirstNightState(fivePlayers)
    state = run(state, {
      type: 'SUBMIT_NIGHT_ACTION',
      action: { type: 'SEER_INSPECT', actorId: 'seer', targetId: 'wolf' },
    }).state
    state = run(state, { type: 'CONFIRM_STEP' }).state
    state = run(state, {
      type: 'SUBMIT_NIGHT_ACTION',
      action: { type: 'WEREWOLF_ATTACK', actorId: 'wolf', targetId: 'a' },
    }).state
    const prepared = run(state, { type: 'CONFIRM_STEP' })

    expect(prepared.state.phase).toBe('NIGHT_RESOLUTION')
    expect(
      prepared.state.players.find((player) => player.id === 'a')?.alive,
    ).toBe(true)
    expect(prepared.state.pendingNightResolution?.deaths).toEqual([
      { playerId: 'a', causes: ['WEREWOLF_ATTACK'] },
    ])

    const confirmed = run(prepared.state, {
      type: 'CONFIRM_NIGHT_RESOLUTION',
    })
    expect(confirmed.state.phase).toBe('DAY')
    expect(
      confirmed.state.players.find((player) => player.id === 'a')?.alive,
    ).toBe(false)
  })

  it('records the Seer alignment when Moderator confirms', () => {
    let state = createFirstNightState(fivePlayers)
    state = run(state, {
      type: 'SUBMIT_NIGHT_ACTION',
      action: { type: 'SEER_INSPECT', actorId: 'seer', targetId: 'wolf' },
    }).state
    const confirmed = run(state, { type: 'CONFIRM_STEP' })
    expect(confirmed.events).toContainEqual({
      type: 'SEER_RESULT_RECORDED',
      seerPlayerId: 'seer',
      targetPlayerId: 'wolf',
      result: 'WEREWOLF',
    })
  })

  it('consumes both Witch potions only after confirmation', () => {
    const players: Player[] = [
      ...fivePlayers,
      {
        id: 'witch',
        role: 'WITCH',
        alive: true,
        abilityState: {
          healingPotionAvailable: true,
          poisonPotionAvailable: true,
        },
      },
    ]
    let state = createFirstNightState(players)
    state = run(state, { type: 'SKIP_STEP', reason: 'Moderator skip' }).state
    state = run(state, {
      type: 'SUBMIT_NIGHT_ACTION',
      action: {
        type: 'WEREWOLF_ATTACK',
        actorId: 'wolf',
        targetId: 'witch',
      },
    }).state
    state = run(state, { type: 'CONFIRM_STEP' }).state
    const submitted = run(state, {
      type: 'SUBMIT_NIGHT_ACTION',
      action: {
        type: 'WITCH_ACTION',
        actorId: 'witch',
        heal: true,
        poisonTargetId: 'a',
      },
    })

    expect(
      submitted.state.players.find((player) => player.role === 'WITCH')
        ?.abilityState,
    ).toEqual({
      healingPotionAvailable: true,
      poisonPotionAvailable: true,
    })
    const confirmed = run(submitted.state, { type: 'CONFIRM_STEP' })
    expect(
      confirmed.state.players.find((player) => player.role === 'WITCH')
        ?.abilityState,
    ).toEqual({
      healingPotionAvailable: false,
      poisonPotionAvailable: false,
    })
    expect(confirmed.state.pendingNightResolution?.deaths).toEqual([
      { playerId: 'a', causes: ['WITCH_POISON'] },
    ])
  })

  it('automatically skips a dead role owner on the next night', () => {
    const state = createFirstNightState(
      fivePlayers.map((player) =>
        player.id === 'seer' ? { ...player, alive: false } : player,
      ),
    )
    expect(state.queue[0]).toEqual({
      step: 'SEER_INSPECT',
      status: 'SKIPPED',
      skipReason: 'ROLE_OWNER_DEAD',
    })
    expect(state.queue[1]?.status).toBe('ACTIVE')
  })
})

describe('vote orchestration', () => {
  it('revotes once and starts the next night after a second tie', () => {
    let state = createFirstNightState(fivePlayers)
    state.phase = 'DAY'
    state = run(state, { type: 'START_VOTE' }).state
    state = run(state, {
      type: 'SUBMIT_VOTE_RESULT',
      tied: true,
      selectedPlayerId: null,
    }).state
    state = run(state, { type: 'CONFIRM_VOTE_RESULT' }).state
    expect(state.phase).toBe('VOTE')
    expect(state.voteAttempt).toBe(2)

    state = run(state, {
      type: 'SUBMIT_VOTE_RESULT',
      tied: true,
      selectedPlayerId: null,
    }).state
    state = run(state, { type: 'CONFIRM_VOTE_RESULT' }).state
    expect(state.phase).toBe('NIGHT')
    expect(state.round).toBe(2)
    expect(state.voteAttempt).toBe(1)
  })

  it('ends the game when the confirmed vote eliminates the Werewolf', () => {
    let state = createFirstNightState(fivePlayers)
    state.phase = 'DAY'
    state = run(state, { type: 'START_VOTE' }).state
    state = run(state, {
      type: 'SUBMIT_VOTE_RESULT',
      tied: false,
      selectedPlayerId: 'wolf',
    }).state
    const outcome = run(state, { type: 'CONFIRM_VOTE_RESULT' })

    expect(outcome.state.phase).toBe('GAME_OVER')
    expect(outcome.state.winner).toBe('VILLAGE')
    expect(outcome.events.at(-1)).toEqual({
      type: 'GAME_ENDED',
      winner: 'VILLAGE',
    })
  })
})
