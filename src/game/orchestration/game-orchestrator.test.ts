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
  it('consumes the Alpha attack only after confirmation and bypasses protection', () => {
    const players: Player[] = [
      ...fivePlayers.filter((player) => player.role !== 'WEREWOLF'),
      {
        id: 'alpha',
        role: 'ALPHA_WEREWOLF',
        alive: true,
        abilityState: { enhancedAttackAvailable: true },
      },
      {
        id: 'protector',
        role: 'PROTECTOR',
        alive: true,
        abilityState: null,
      },
    ]
    let state = createFirstNightState(players)
    state = run(state, {
      type: 'SUBMIT_NIGHT_ACTION',
      action: {
        type: 'PROTECTOR_PROTECT',
        actorId: 'protector',
        targetId: 'a',
      },
    }).state
    state = run(state, { type: 'CONFIRM_STEP' }).state
    state = run(state, { type: 'SKIP_STEP', reason: 'Skip Seer' }).state
    const submitted = run(state, {
      type: 'SUBMIT_NIGHT_ACTION',
      action: {
        type: 'WEREWOLF_ATTACK',
        actorId: 'alpha',
        targetId: 'a',
        enhanced: true,
      },
    }).state
    expect(
      submitted.players.find((player) => player.role === 'ALPHA_WEREWOLF')
        ?.abilityState,
    ).toEqual({ enhancedAttackAvailable: true })

    const confirmed = run(submitted, { type: 'CONFIRM_STEP' }).state
    expect(
      confirmed.players.find((player) => player.role === 'ALPHA_WEREWOLF')
        ?.abilityState,
    ).toEqual({ enhancedAttackAvailable: false })
    expect(confirmed.pendingNightResolution?.deaths).toEqual([
      { playerId: 'a', causes: ['WEREWOLF_ATTACK'] },
    ])
  })

  it('adds the marked target when the Hunter dies that night', () => {
    const players: Player[] = [
      ...fivePlayers,
      { id: 'hunter', role: 'HUNTER', alive: true, abilityState: null },
    ]
    let state = createFirstNightState(players)
    state = run(state, {
      type: 'SUBMIT_NIGHT_ACTION',
      action: { type: 'HUNTER_MARK', actorId: 'hunter', targetId: 'a' },
    }).state
    state = run(state, { type: 'CONFIRM_STEP' }).state
    state = run(state, { type: 'SKIP_STEP', reason: 'Skip Seer' }).state
    state = run(state, {
      type: 'SUBMIT_NIGHT_ACTION',
      action: {
        type: 'WEREWOLF_ATTACK',
        actorId: 'wolf',
        targetId: 'hunter',
      },
    }).state
    state = run(state, { type: 'CONFIRM_STEP' }).state

    expect(state.pendingNightResolution?.deaths).toEqual([
      { playerId: 'hunter', causes: ['WEREWOLF_ATTACK'] },
      { playerId: 'a', causes: ['HUNTER_SHOT'] },
    ])
  })

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

  it('consumes the Elder survival only when Moderator confirms the resolution', () => {
    const elder: Player = {
      id: 'elder',
      role: 'ELDER',
      alive: true,
      abilityState: { werewolfAttackSurvivalAvailable: true },
    }
    const state = createFirstNightState([...fivePlayers, elder])
    state.phase = 'NIGHT_RESOLUTION'
    state.pendingNightResolution = {
      deaths: [],
      survivors: state.players.map((player) => player.id),
      elderSurvivalConsumedPlayerIds: ['elder'],
    }

    expect(elder.abilityState.werewolfAttackSurvivalAvailable).toBe(true)
    const confirmed = run(state, { type: 'CONFIRM_NIGHT_RESOLUTION' })
    const confirmedElder = confirmed.state.players.find(
      (player) => player.id === 'elder',
    )
    expect(confirmedElder?.abilityState).toEqual({
      werewolfAttackSurvivalAvailable: false,
    })
    expect(confirmedElder?.alive).toBe(true)
  })

  it('awards Piper a solo victory after night deaths leave every survivor charmed', () => {
    const players: Player[] = [
      { id: 'piper', role: 'PIPER', alive: true, abilityState: null },
      { id: 'wolf', role: 'WEREWOLF', alive: true, abilityState: null },
      { id: 'a', role: 'VILLAGER', alive: true, abilityState: null },
    ]
    const state = createFirstNightState(players)
    state.phase = 'NIGHT_RESOLUTION'
    state.charmedPlayerIds = ['wolf']
    state.confirmedNightActions = [
      { type: 'PIPER_CHARM', actorId: 'piper', targetId: 'wolf' },
    ]
    state.pendingNightResolution = {
      deaths: [{ playerId: 'a', causes: ['WEREWOLF_ATTACK'] }],
      survivors: ['piper', 'wolf'],
      elderSurvivalConsumedPlayerIds: [],
    }

    const outcome = run(state, { type: 'CONFIRM_NIGHT_RESOLUTION' })

    expect(outcome.state.phase).toBe('GAME_OVER')
    expect(outcome.state.winner).toBe('PIPER')
    expect(outcome.events.at(-1)).toEqual({
      type: 'GAME_ENDED',
      winner: 'PIPER',
    })
  })

  it('does not award Piper victory if Piper dies in the resolution', () => {
    const players: Player[] = [
      { id: 'piper', role: 'PIPER', alive: true, abilityState: null },
      { id: 'wolf', role: 'WEREWOLF', alive: true, abilityState: null },
    ]
    const state = createFirstNightState(players)
    state.phase = 'NIGHT_RESOLUTION'
    state.charmedPlayerIds = ['wolf']
    state.pendingNightResolution = {
      deaths: [{ playerId: 'piper', causes: ['WEREWOLF_ATTACK'] }],
      survivors: ['wolf'],
      elderSurvivalConsumedPlayerIds: [],
    }

    const outcome = run(state, { type: 'CONFIRM_NIGHT_RESOLUTION' })

    expect(outcome.state.winner).toBe('WEREWOLF')
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
  it('eliminates the surviving lover from heartbreak after a vote', () => {
    const players: Player[] = [
      { id: 'wolf', role: 'WEREWOLF', alive: true, abilityState: null },
      { id: 'lover', role: 'VILLAGER', alive: true, abilityState: null },
      { id: 'other', role: 'VILLAGER', alive: true, abilityState: null },
    ]
    let state = createFirstNightState(players)
    state.loverIds = ['wolf', 'lover']
    state.phase = 'DAY'
    state = run(state, { type: 'START_VOTE' }).state
    state = run(state, {
      type: 'SUBMIT_VOTE_RESULT',
      tied: false,
      selectedPlayerId: 'lover',
    }).state

    const outcome = run(state, { type: 'CONFIRM_VOTE_RESULT' })

    expect(
      outcome.state.players.every(
        (player) => player.id === 'other' || !player.alive,
      ),
    ).toBe(true)
    expect(outcome.events).toContainEqual({
      type: 'PLAYER_DIED',
      playerId: 'wolf',
      causes: ['HEARTBREAK'],
    })
    expect(outcome.state.winner).toBe('VILLAGE')
  })

  it('awards mixed-alignment lovers victory when they are last alive', () => {
    const players: Player[] = [
      { id: 'wolf', role: 'WEREWOLF', alive: true, abilityState: null },
      { id: 'lover', role: 'VILLAGER', alive: true, abilityState: null },
      { id: 'other', role: 'VILLAGER', alive: true, abilityState: null },
    ]
    let state = createFirstNightState(players)
    state.loverIds = ['wolf', 'lover']
    state.phase = 'DAY'
    state = run(state, { type: 'START_VOTE' }).state
    state = run(state, {
      type: 'SUBMIT_VOTE_RESULT',
      tied: false,
      selectedPlayerId: 'other',
    }).state

    const outcome = run(state, { type: 'CONFIRM_VOTE_RESULT' })

    expect(outcome.state.phase).toBe('GAME_OVER')
    expect(outcome.state.winner).toBe('LOVERS')
  })

  it('awards the Fool a solo victory when a confirmed vote eliminates them', () => {
    const players: Player[] = [
      { id: 'fool', role: 'FOOL', alive: true, abilityState: null },
      { id: 'hunter', role: 'HUNTER', alive: true, abilityState: null },
      { id: 'wolf', role: 'WEREWOLF', alive: true, abilityState: null },
      { id: 'a', role: 'VILLAGER', alive: true, abilityState: null },
    ]
    let state = createFirstNightState(players)
    state.phase = 'DAY'
    state = run(state, { type: 'START_VOTE' }).state
    state = run(state, {
      type: 'SUBMIT_VOTE_RESULT',
      tied: false,
      selectedPlayerId: 'fool',
    }).state

    const outcome = run(state, { type: 'CONFIRM_VOTE_RESULT' })

    expect(outcome.state.phase).toBe('GAME_OVER')
    expect(outcome.state.winner).toBe('FOOL')
    expect(outcome.state.pendingHunterShot).toBeNull()
    expect(outcome.events.at(-1)).toEqual({
      type: 'GAME_ENDED',
      winner: 'FOOL',
    })
  })

  it('lets a voted-out Hunter choose a target before resolving the game', () => {
    const players: Player[] = [
      { id: 'hunter', role: 'HUNTER', alive: true, abilityState: null },
      { id: 'wolf', role: 'WEREWOLF', alive: true, abilityState: null },
      { id: 'a', role: 'VILLAGER', alive: true, abilityState: null },
      { id: 'b', role: 'VILLAGER', alive: true, abilityState: null },
    ]
    let state = createFirstNightState(players)
    state.phase = 'DAY'
    state = run(state, { type: 'START_VOTE' }).state
    state = run(state, {
      type: 'SUBMIT_VOTE_RESULT',
      tied: false,
      selectedPlayerId: 'hunter',
    }).state
    state = run(state, { type: 'CONFIRM_VOTE_RESULT' }).state
    expect(state.phase).toBe('HUNTER_SHOT')
    expect(state.winner).toBeNull()

    state = run(state, {
      type: 'SUBMIT_HUNTER_SHOT',
      actorId: 'hunter',
      targetId: 'wolf',
    }).state
    const outcome = run(state, { type: 'CONFIRM_HUNTER_SHOT' })
    expect(outcome.state.phase).toBe('GAME_OVER')
    expect(outcome.state.winner).toBe('VILLAGE')
    expect(outcome.events).toContainEqual({
      type: 'PLAYER_DIED',
      playerId: 'wolf',
      causes: ['HUNTER_SHOT'],
    })
  })

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

  it('allows the Moderator to confirm the first tie and skip the second vote', () => {
    let state = createFirstNightState(fivePlayers)
    state.phase = 'DAY'
    state = run(state, { type: 'START_VOTE' }).state
    state = run(state, {
      type: 'SUBMIT_VOTE_RESULT',
      tied: true,
      selectedPlayerId: null,
    }).state
    const outcome = run(state, { type: 'SKIP_REVOTE' })

    expect(outcome.state.phase).toBe('NIGHT')
    expect(outcome.state.round).toBe(2)
    expect(outcome.events).toContainEqual({ type: 'REVOTE_SKIPPED' })
    expect(outcome.events).toContainEqual({
      type: 'VOTE_RESOLVED',
      resolution: { outcome: 'REVOTE', nextAttempt: 2 },
    })
  })

  it('does not allow skipping the first vote', () => {
    const state = createFirstNightState(fivePlayers)
    state.phase = 'VOTE'

    const outcome = executeCommand(state, {
      type: 'SKIP_REVOTE',
    })

    expect(outcome).toMatchObject({
      ok: false,
      error: { code: 'INVALID_ACTION' },
    })
  })
})
