import type { DomainError, Player, Result } from '../domain'
import type { GameState, NightQueueItem } from './model'
import type { NightAction } from '../rules/night-actions'
import type { GameCommand } from './commands'
import type { GameEvent } from './events'

import { getSeerResult, validateNightAction } from '../rules/night-actions'
import { getWinningTeamFromPlayers } from '../rules/win-condition'
import { resolveNight, resolveVote } from '../rules/resolution'
import { getNightQueue, STEP_ROLE } from '../rules/transitions'

export type CommandOutcome = {
  state: GameState
  events: GameEvent[]
}

export function createFirstNightState(players: readonly Player[]): GameState {
  const queue = createQueue(players)
  activateNextRunnableStep(queue, players, [])

  return {
    phase: 'NIGHT',
    round: 1,
    players: players.map((player) => ({ ...player })),
    queue,
    pendingNightAction: null,
    confirmedNightActions: [],
    lastProtectedTargetId: null,
    pendingNightResolution: null,
    voteAttempt: 1,
    pendingVote: null,
    pendingVoteResolution: null,
    pendingHunterShot: null,
    winner: null,
  }
}

export function executeCommand(
  currentState: GameState,
  command: GameCommand,
): Result<CommandOutcome> {
  const state = structuredClone(currentState)
  const events: GameEvent[] = []

  switch (command.type) {
    case 'SUBMIT_NIGHT_ACTION':
      return submitNightAction(state, command.action, events)
    case 'CONFIRM_STEP':
      return confirmStep(state, events)
    case 'REJECT_STEP':
      return rejectStep(state, command.reason, events)
    case 'SKIP_STEP':
      return skipStep(state, command.reason, events)
    case 'CONFIRM_NIGHT_RESOLUTION':
      return confirmNightResolution(state, events)
    case 'START_VOTE':
      return startVote(state, events)
    case 'SUBMIT_VOTE_RESULT':
      return submitVoteResult(
        state,
        command.tied,
        command.selectedPlayerId,
        events,
      )
    case 'CONFIRM_VOTE_RESULT':
      return confirmVoteResult(state, events)
    case 'SKIP_REVOTE':
      return skipRevote(state, events)
    case 'SUBMIT_HUNTER_SHOT':
      return submitHunterShot(state, command.actorId, command.targetId, events)
    case 'CONFIRM_HUNTER_SHOT':
      return confirmHunterShot(state, events)
  }
}

function submitNightAction(
  state: GameState,
  action: NightAction,
  events: GameEvent[],
): Result<CommandOutcome> {
  if (state.phase !== 'NIGHT') return invalidPhase('NIGHT', state.phase)
  const activeItem = state.queue.find((item) => item.status === 'ACTIVE')
  if (!activeItem) return failure('INVALID_ACTION', 'No queue step is active')

  const validation = validateNightAction(action, {
    activeStep: activeItem.step,
    players: state.players,
    werewolfTargetId:
      findWerewolfTarget(state.confirmedNightActions) ?? undefined,
    lastProtectedTargetId: state.lastProtectedTargetId,
  })
  if (!validation.ok) return validation

  activeItem.status = 'WAITING_MODERATOR_CONFIRMATION'
  state.pendingNightAction = action
  events.push({ type: 'NIGHT_ACTION_SUBMITTED', action })
  return success(state, events)
}

function confirmStep(
  state: GameState,
  events: GameEvent[],
): Result<CommandOutcome> {
  if (state.phase !== 'NIGHT') return invalidPhase('NIGHT', state.phase)
  const item = state.queue.find(
    (queueItem) => queueItem.status === 'WAITING_MODERATOR_CONFIRMATION',
  )
  if (!item || !state.pendingNightAction) {
    return failure('INVALID_ACTION', 'No action is waiting for confirmation')
  }

  const action = state.pendingNightAction
  item.status = 'COMPLETED'
  state.confirmedNightActions.push(action)
  state.pendingNightAction = null
  consumeWitchResources(state, action)
  events.push({ type: 'NIGHT_ACTION_CONFIRMED', action })
  if (action.type === 'SEER_INSPECT') {
    const target = state.players.find((player) => player.id === action.targetId)
    if (target) {
      events.push({
        type: 'SEER_RESULT_RECORDED',
        seerPlayerId: action.actorId,
        targetPlayerId: action.targetId,
        result: getSeerResult(target.role),
      })
    }
  }
  advanceNight(state, events)
  return success(state, events)
}

function rejectStep(
  state: GameState,
  reason: string,
  events: GameEvent[],
): Result<CommandOutcome> {
  if (state.phase !== 'NIGHT') return invalidPhase('NIGHT', state.phase)
  if (!reason.trim()) return reasonRequired()
  const item = state.queue.find(
    (queueItem) => queueItem.status === 'WAITING_MODERATOR_CONFIRMATION',
  )
  if (!item || !state.pendingNightAction) {
    return failure('INVALID_ACTION', 'No action is waiting for rejection')
  }

  const action = state.pendingNightAction
  item.status = 'ACTIVE'
  state.pendingNightAction = null
  events.push({ type: 'NIGHT_ACTION_REJECTED', action, reason: reason.trim() })
  return success(state, events)
}

function skipStep(
  state: GameState,
  reason: string,
  events: GameEvent[],
): Result<CommandOutcome> {
  if (state.phase !== 'NIGHT') return invalidPhase('NIGHT', state.phase)
  if (!reason.trim()) return reasonRequired()
  const item = state.queue.find((queueItem) => queueItem.status === 'ACTIVE')
  if (!item) return failure('INVALID_ACTION', 'No active step can be skipped')

  item.status = 'SKIPPED'
  item.skipReason = reason.trim()
  events.push({
    type: 'QUEUE_STEP_SKIPPED',
    step: item.step,
    reason: reason.trim(),
  })
  advanceNight(state, events)
  return success(state, events)
}

function advanceNight(state: GameState, events: GameEvent[]): void {
  const activated = activateNextRunnableStep(state.queue, state.players, events)
  if (activated) return

  const from = state.phase
  state.phase = 'NIGHT_RESOLUTION'
  state.pendingNightResolution = resolveNight({
    players: state.players,
    werewolfTargetId: findWerewolfTarget(state.confirmedNightActions),
    witchHealed: findWitchAction(state.confirmedNightActions)?.heal ?? false,
    witchPoisonTargetId:
      findWitchAction(state.confirmedNightActions)?.poisonTargetId ?? null,
    protectedTargetId:
      state.confirmedNightActions.find(
        (action) => action.type === 'PROTECTOR_PROTECT',
      )?.targetId ?? null,
    hunterId:
      state.players.find((player) => player.role === 'HUNTER')?.id ?? null,
    hunterTargetId:
      state.confirmedNightActions.find(
        (action) => action.type === 'HUNTER_MARK',
      )?.targetId ?? null,
  })
  events.push(
    {
      type: 'NIGHT_RESOLUTION_PREPARED',
      resolution: state.pendingNightResolution,
    },
    { type: 'PHASE_CHANGED', from, to: state.phase },
  )
}

function confirmNightResolution(
  state: GameState,
  events: GameEvent[],
): Result<CommandOutcome> {
  if (state.phase !== 'NIGHT_RESOLUTION') {
    return invalidPhase('NIGHT_RESOLUTION', state.phase)
  }
  if (!state.pendingNightResolution) {
    return failure('INVALID_ACTION', 'Night resolution is not prepared')
  }

  for (const death of state.pendingNightResolution.deaths) {
    setPlayerDead(state.players, death.playerId)
    events.push({
      type: 'PLAYER_DIED',
      playerId: death.playerId,
      causes: death.causes,
    })
  }
  state.pendingNightResolution = null
  return transitionAfterElimination(state, 'DAY', events)
}

function startVote(
  state: GameState,
  events: GameEvent[],
): Result<CommandOutcome> {
  if (state.phase !== 'DAY') return invalidPhase('DAY', state.phase)
  transitionPhase(state, 'VOTE', events)
  return success(state, events)
}

function submitVoteResult(
  state: GameState,
  tied: boolean,
  selectedPlayerId: string | null,
  events: GameEvent[],
): Result<CommandOutcome> {
  if (state.phase !== 'VOTE') return invalidPhase('VOTE', state.phase)
  if (tied && selectedPlayerId) {
    return failure(
      'INVALID_ACTION',
      'A tied vote cannot have one selected player',
    )
  }
  if (!tied) {
    const target = state.players.find(
      (player) => player.id === selectedPlayerId,
    )
    if (!target?.alive) {
      return failure('INVALID_TARGET', 'Vote target must be a living player')
    }
  }

  state.pendingVote = { tied, selectedPlayerId }
  state.pendingVoteResolution = resolveVote(
    tied,
    selectedPlayerId,
    state.voteAttempt,
  )
  events.push({ type: 'VOTE_SUBMITTED', tied, selectedPlayerId })
  transitionPhase(state, 'VOTE_RESOLUTION', events)
  return success(state, events)
}

function confirmVoteResult(
  state: GameState,
  events: GameEvent[],
): Result<CommandOutcome> {
  if (state.phase !== 'VOTE_RESOLUTION') {
    return invalidPhase('VOTE_RESOLUTION', state.phase)
  }
  if (!state.pendingVoteResolution) {
    return failure('INVALID_ACTION', 'Vote resolution is not prepared')
  }

  const resolution = state.pendingVoteResolution
  state.pendingVote = null
  state.pendingVoteResolution = null
  events.push({ type: 'VOTE_RESOLVED', resolution })

  if (resolution.outcome === 'REVOTE') {
    state.voteAttempt = resolution.nextAttempt
    transitionPhase(state, 'VOTE', events)
    return success(state, events)
  }

  if (resolution.outcome === 'ELIMINATED') {
    setPlayerDead(state.players, resolution.playerId)
    events.push({
      type: 'PLAYER_DIED',
      playerId: resolution.playerId,
      causes: ['VOTE'],
    })
    const eliminated = state.players.find(
      (player) => player.id === resolution.playerId,
    )
    if (eliminated?.role === 'HUNTER') {
      state.pendingHunterShot = {
        hunterId: eliminated.id,
        targetId: null,
      }
      transitionPhase(state, 'HUNTER_SHOT', events)
      return success(state, events)
    }
  }

  return transitionAfterElimination(state, 'NIGHT', events)
}

function submitHunterShot(
  state: GameState,
  actorId: string,
  targetId: string,
  events: GameEvent[],
): Result<CommandOutcome> {
  if (state.phase !== 'HUNTER_SHOT') {
    return invalidPhase('HUNTER_SHOT', state.phase)
  }
  const pending = state.pendingHunterShot
  const hunter = state.players.find((player) => player.id === actorId)
  if (!pending || pending.hunterId !== actorId || hunter?.role !== 'HUNTER') {
    return failure('ROLE_MISMATCH', 'Only the eliminated Hunter can shoot')
  }
  if (pending.targetId) {
    return failure('INVALID_ACTION', 'Hunter shot is already submitted')
  }
  const target = state.players.find((player) => player.id === targetId)
  if (!target?.alive || target.id === actorId) {
    return failure(
      'INVALID_TARGET',
      'Hunter target must be another living player',
    )
  }

  pending.targetId = targetId
  events.push({
    type: 'HUNTER_SHOT_SUBMITTED',
    hunterId: actorId,
    targetId,
  })
  return success(state, events)
}

function confirmHunterShot(
  state: GameState,
  events: GameEvent[],
): Result<CommandOutcome> {
  if (state.phase !== 'HUNTER_SHOT') {
    return invalidPhase('HUNTER_SHOT', state.phase)
  }
  const pending = state.pendingHunterShot
  if (!pending?.targetId) {
    return failure('INVALID_ACTION', 'Hunter shot is not submitted')
  }

  setPlayerDead(state.players, pending.targetId)
  events.push(
    {
      type: 'HUNTER_SHOT_CONFIRMED',
      hunterId: pending.hunterId,
      targetId: pending.targetId,
    },
    {
      type: 'PLAYER_DIED',
      playerId: pending.targetId,
      causes: ['HUNTER_SHOT'],
    },
  )
  state.pendingHunterShot = null
  return transitionAfterElimination(state, 'NIGHT', events)
}

function skipRevote(
  state: GameState,
  events: GameEvent[],
): Result<CommandOutcome> {
  if (state.phase !== 'VOTE_RESOLUTION') {
    return invalidPhase('VOTE_RESOLUTION', state.phase)
  }
  if (state.pendingVoteResolution?.outcome !== 'REVOTE') {
    return failure(
      'INVALID_ACTION',
      'Only a confirmed first-round tie can skip the second vote',
    )
  }

  const resolution = state.pendingVoteResolution
  state.pendingVote = null
  state.pendingVoteResolution = null
  events.push({ type: 'VOTE_RESOLVED', resolution })
  events.push({ type: 'REVOTE_SKIPPED' })
  return transitionAfterElimination(state, 'NIGHT', events)
}

function transitionAfterElimination(
  state: GameState,
  nextPhase: 'DAY' | 'NIGHT',
  events: GameEvent[],
): Result<CommandOutcome> {
  const winner = getWinningTeamFromPlayers(state.players)
  if (winner) {
    state.winner = winner
    transitionPhase(state, 'GAME_OVER', events)
    events.push({ type: 'GAME_ENDED', winner })
    return success(state, events)
  }

  if (nextPhase === 'NIGHT') {
    state.lastProtectedTargetId =
      state.confirmedNightActions.find(
        (action) => action.type === 'PROTECTOR_PROTECT',
      )?.targetId ?? null
    state.round += 1
    state.voteAttempt = 1
    state.confirmedNightActions = []
    state.queue = createQueue(state.players)
    transitionPhase(state, 'NIGHT', events)
    activateNextRunnableStep(state.queue, state.players, events)
  } else {
    transitionPhase(state, 'DAY', events)
  }
  return success(state, events)
}

function createQueue(players: readonly Player[]): NightQueueItem[] {
  return getNightQueue(players.map((player) => player.role)).map((step) => ({
    step,
    status: 'PENDING',
    skipReason: null,
  }))
}

function activateNextRunnableStep(
  queue: NightQueueItem[],
  players: readonly Player[],
  events: GameEvent[],
): boolean {
  for (const item of queue) {
    if (item.status !== 'PENDING') continue
    const ownerAlive = players.some(
      (player) => player.role === STEP_ROLE[item.step] && player.alive,
    )
    if (!ownerAlive) {
      item.status = 'SKIPPED'
      item.skipReason = 'ROLE_OWNER_DEAD'
      events.push({
        type: 'QUEUE_STEP_SKIPPED',
        step: item.step,
        reason: item.skipReason,
      })
      continue
    }

    item.status = 'ACTIVE'
    events.push({ type: 'QUEUE_STEP_ACTIVATED', step: item.step })
    return true
  }
  return false
}

function findWerewolfTarget(actions: readonly NightAction[]): string | null {
  return (
    actions.find((action) => action.type === 'WEREWOLF_ATTACK')?.targetId ??
    null
  )
}

function findWitchAction(actions: readonly NightAction[]) {
  return actions.find((action) => action.type === 'WITCH_ACTION')
}

function consumeWitchResources(state: GameState, action: NightAction): void {
  if (action.type !== 'WITCH_ACTION') return
  const witch = state.players.find((player) => player.id === action.actorId)
  if (witch?.role !== 'WITCH') return
  if (action.heal) witch.abilityState.healingPotionAvailable = false
  if (action.poisonTargetId) witch.abilityState.poisonPotionAvailable = false
}

function setPlayerDead(players: Player[], playerId: string): void {
  const player = players.find((candidate) => candidate.id === playerId)
  if (player) player.alive = false
}

function transitionPhase(
  state: GameState,
  to: GameState['phase'],
  events: GameEvent[],
): void {
  const from = state.phase
  state.phase = to
  events.push({ type: 'PHASE_CHANGED', from, to })
}

function success(
  state: GameState,
  events: GameEvent[],
): Result<CommandOutcome> {
  return { ok: true, value: { state, events } }
}

function failure(code: DomainError['code'], message: string): Result<never> {
  return { ok: false, error: { code, message } }
}

function invalidPhase(expected: string, actual: string): Result<never> {
  return failure(
    'INVALID_ACTION',
    `Expected phase ${expected}, received ${actual}`,
  )
}

function reasonRequired(): Result<never> {
  return failure('INVALID_ACTION', 'Moderator reason is required')
}
