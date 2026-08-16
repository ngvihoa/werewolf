import type {
  EventProjection,
  GameView,
  PlayerGameView,
  PrivateHistoryEvent,
  ProjectionViewer,
  PublicHistoryEvent,
  StoredEventInput,
} from './model'
import type { LocalGame } from '../store/model'

import { STEP_ROLE } from '../rules/transitions'

export function projectGameView(
  game: LocalGame,
  viewer: ProjectionViewer,
): GameView | null {
  if (viewer.kind === 'MODERATOR') {
    return { viewer: 'MODERATOR', game: structuredClone(game) }
  }

  const lobbyPlayer = game.lobbyPlayers.find(
    (player) => player.id === viewer.playerId,
  )
  if (!lobbyPlayer) return null
  const domainPlayer = game.state?.players.find(
    (player) => player.id === viewer.playerId,
  )
  const activeStep =
    game.state?.queue.find((item) => item.status === 'ACTIVE')?.step ?? null
  const werewolfTargetId =
    domainPlayer?.role === 'WITCH' && activeStep === 'WITCH_ACTION'
      ? (game.state?.confirmedNightActions.find(
        (action) => action.type === 'WEREWOLF_ATTACK',
      )?.targetId ?? null)
      : null

  let confirmedWerewolfTargetId: string | null = null
  const history = game.history.map((entry) => {
    if (entry.event.type === 'PHASE_CHANGED' && entry.event.to === 'NIGHT') {
      confirmedWerewolfTargetId = null
    }
    if (
      entry.event.type === 'NIGHT_ACTION_CONFIRMED' &&
      entry.event.action.type === 'WEREWOLF_ATTACK'
    ) {
      confirmedWerewolfTargetId = entry.event.action.targetId
    }
    return projectEvent(entry, viewer.playerId, confirmedWerewolfTargetId)
  })
  const view: PlayerGameView = {
    viewer: 'PLAYER',
    gameId: game.id,
    roomCode: game.roomCode,
    version: game.version,
    phase: game.state?.phase ?? 'LOBBY',
    round: game.state?.round ?? 0,
    winner: game.state?.winner ?? null,
    players: game.lobbyPlayers.map((player) => ({
      id: player.id,
      displayName: player.displayName,
      ready: player.ready,
      alive:
        game.state?.players.find((candidate) => candidate.id === player.id)
          ?.alive ?? true,
    })),
    me: {
      id: lobbyPlayer.id,
      displayName: lobbyPlayer.displayName,
      ready: lobbyPlayer.ready,
      alive: domainPlayer?.alive ?? true,
      role: lobbyPlayer.role,
      abilityState:
        domainPlayer?.role === 'WITCH'
          ? structuredClone(domainPlayer.abilityState)
          : null,
    },
    queue:
      game.state?.queue.map((item) => ({
        step: item.step,
        status: item.status,
      })) ?? [],
    turn: {
      canAct:
        Boolean(domainPlayer?.alive) &&
        activeStep !== null &&
        domainPlayer?.role === STEP_ROLE[activeStep],
      activeStep,
      werewolfTargetId,
    },
    publicHistory: history.flatMap((entry) =>
      entry.publicEntry ? [entry.publicEntry] : [],
    ),
    privateHistory: history.flatMap((entry) =>
      entry.privateEntry ? [entry.privateEntry] : [],
    ),
  }
  return view
}

function projectEvent(
  entry: StoredEventInput,
  viewerPlayerId: string,
  confirmedWerewolfTargetId: string | null,
): EventProjection {
  const metadata = { sequence: entry.sequence, createdAt: entry.createdAt }
  const event = entry.event
  let publicEvent: PublicHistoryEvent | null = null

  switch (event.type) {
    case 'GAME_CREATED':
    case 'ROLES_ASSIGNED':
    case 'GAME_STARTED':
      publicEvent = { type: event.type }
      break
    case 'PLAYER_JOINED':
      publicEvent = {
        type: event.type,
        playerId: event.playerId,
        displayName: event.displayName,
      }
      break
    case 'PLAYER_READY_CHANGED':
      publicEvent = {
        type: event.type,
        playerId: event.playerId,
        ready: event.ready,
      }
      break
    case 'PHASE_CHANGED':
      publicEvent = { type: event.type, from: event.from, to: event.to }
      break
    case 'PLAYER_DIED':
      publicEvent = { type: event.type, playerId: event.playerId }
      break
    case 'GAME_ENDED':
      publicEvent = { type: event.type, winner: event.winner }
      break
  }

  if (
    (event.type === 'NIGHT_ACTION_SUBMITTED' ||
      event.type === 'NIGHT_ACTION_CONFIRMED' ||
      event.type === 'NIGHT_ACTION_REJECTED') &&
    event.action.actorId === viewerPlayerId
  ) {
    let privateEvent: PrivateHistoryEvent
    if (event.type === 'NIGHT_ACTION_SUBMITTED') {
      privateEvent = {
        type: 'OWN_NIGHT_ACTION_SUBMITTED',
        action: structuredClone(event.action),
      }
    } else if (event.type === 'NIGHT_ACTION_CONFIRMED') {
      privateEvent = {
        type: 'OWN_NIGHT_ACTION_CONFIRMED',
        action: structuredClone(event.action),
        healedTargetId:
          event.action.type === 'WITCH_ACTION' && event.action.heal
            ? confirmedWerewolfTargetId
            : null,
      }
    } else {
      privateEvent = {
        type: 'OWN_NIGHT_ACTION_REJECTED',
        action: structuredClone(event.action),
        reason: event.reason,
      }
    }
    return {
      publicEntry: publicEvent ? { ...metadata, event: publicEvent } : null,
      privateEntry: {
        ...metadata,
        event: privateEvent,
      },
    }
  }

  if (
    event.type === 'SEER_RESULT_RECORDED' &&
    event.seerPlayerId === viewerPlayerId
  ) {
    return {
      publicEntry: null,
      privateEntry: {
        ...metadata,
        event: {
          type: 'SEER_RESULT_RECORDED',
          targetPlayerId: event.targetPlayerId,
          result: event.result,
        },
      },
    }
  }

  return {
    publicEntry: publicEvent ? { ...metadata, event: publicEvent } : null,
    privateEntry: null,
  }
}
