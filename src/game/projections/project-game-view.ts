import type {
  EventProjection,
  GameView,
  PlayerGameView,
  PrivateHistoryEvent,
  ProjectionViewer,
  PublicHistoryEvent,
  PublicPlayerView,
  StoredEventInput,
} from './model'
import type { LocalGame } from '../store/model'

import { isWerewolfPlayer } from '../domain'
import { waitingContext } from '../bot/bot-moderator'
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
  const visibleWerewolfAction =
    game.state?.pendingNightAction?.type === 'WEREWOLF_ATTACK'
      ? game.state.pendingNightAction
      : game.state?.confirmedNightActions.find(
          (action) => action.type === 'WEREWOLF_ATTACK',
        )
  const werewolfTargetId =
    (domainPlayer?.role === 'WITCH' && activeStep === 'WITCH_ACTION') ||
    isWerewolfPlayer(domainPlayer)
      ? (visibleWerewolfAction?.targetId ?? null)
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
    gameMode: game.mode,
    isHost: game.hostPlayerId !== null && game.hostPlayerId === viewer.playerId,
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
      // Hết ván thì mọi vai được lộ ra — dữ liệu công khai của màn kết quả.
      role: game.state?.phase === 'GAME_OVER' ? player.role : null,
    })),
    me: {
      id: lobbyPlayer.id,
      displayName: lobbyPlayer.displayName,
      ready: lobbyPlayer.ready,
      alive: domainPlayer?.alive ?? true,
      role: lobbyPlayer.role,
      abilityState:
        domainPlayer?.role === 'WITCH' ||
        domainPlayer?.role === 'ALPHA_WEREWOLF' ||
        domainPlayer?.role === 'WHITE_WOLF' ||
        domainPlayer?.role === 'ELDER' ||
        domainPlayer?.role === 'HYBRID_WOLF'
          ? structuredClone(domainPlayer.abilityState)
          : null,
    },
    isCharmed: game.state?.charmedPlayerIds?.includes(lobbyPlayer.id) ?? false,
    lover: projectLover(game, lobbyPlayer.id),
    queue:
      game.state?.queue.map((item) => ({
        step: item.step,
        status: item.status,
      })) ?? [],
    turn: {
      canAct:
        (Boolean(domainPlayer?.alive) &&
          activeStep !== null &&
          (activeStep === 'WEREWOLF_ATTACK'
            ? isWerewolfPlayer(domainPlayer)
            : domainPlayer?.role === STEP_ROLE[activeStep])) ||
        (game.state?.phase === 'HUNTER_SHOT' &&
          domainPlayer?.role === 'HUNTER' &&
          game.state.pendingHunterShot?.hunterId === domainPlayer.id &&
          game.state.pendingHunterShot.targetId === null),
      activeStep,
      werewolfTargetId,
      werewolfAttackEnhanced: isWerewolfPlayer(domainPlayer)
        ? (visibleWerewolfAction?.enhanced ?? false)
        : null,
      enhancedAttackAvailable:
        domainPlayer?.role === 'ALPHA_WEREWOLF'
          ? domainPlayer.abilityState.enhancedAttackAvailable
          : null,
      werewolfTeammates: isWerewolfPlayer(domainPlayer)
        ? game
            .state!.players.filter(
              (player) =>
                isWerewolfPlayer(player) && player.id !== domainPlayer!.id,
            )
            .map((player) => ({
              id: player.id,
              displayName:
                game.lobbyPlayers.find((item) => item.id === player.id)
                  ?.displayName ?? '',
              ready:
                game.lobbyPlayers.find((item) => item.id === player.id)
                  ?.ready ?? false,
              alive: player.alive,
            }))
        : [],
      lastProtectedTargetId:
        domainPlayer?.role === 'PROTECTOR'
          ? (game.state?.lastProtectedTargetId ?? null)
          : null,
      hunterShotTargetId:
        game.state?.phase === 'HUNTER_SHOT' &&
        domainPlayer?.role === 'HUNTER' &&
        game.state.pendingHunterShot?.hunterId === domainPlayer.id
          ? game.state.pendingHunterShot.targetId
          : null,
      charmedPlayerIds:
        domainPlayer?.role === 'PIPER'
          ? (game.state?.charmedPlayerIds ?? [])
          : [],
      lastCourtesanTargetId:
        domainPlayer?.role === 'COURTESAN'
          ? (game.state?.lastCourtesanTargetId ?? null)
          : null,
    },
    vote: projectSelfVote(game, lobbyPlayer.id),
    discussion: projectSelfDiscussion(game, lobbyPlayer.id),
    waiting: projectSelfWaiting(game),
    publicHistory: history.flatMap((entry) =>
      entry.publicEntry ? [entry.publicEntry] : [],
    ),
    privateHistory: history.flatMap((entry) =>
      entry.privateEntry ? [entry.privateEntry] : [],
    ),
  }
  return view
}

// R20: phiếu chỉ hiện count + phiếu của chính mình — không lộ ai bỏ ai trước
// resolution để tránh bandwagon khi cả bàn ngồi cạnh nhau.
function projectSelfVote(
  game: LocalGame,
  playerId: string,
): PlayerGameView['vote'] {
  const state = game.state
  if (game.mode !== 'SELF' || state?.phase !== 'VOTE') return undefined

  const submissions = state.voteSubmissions ?? {}
  const alivePlayers = state.players.filter((player) => player.alive)
  return {
    canVote: domainAlive(game, playerId) && submissions[playerId] === undefined,
    hasVoted: submissions[playerId] !== undefined,
    myTargetId: submissions[playerId] ?? null,
    votedCount: alivePlayers.filter(
      (player) => submissions[player.id] !== undefined,
    ).length,
    aliveCount: alivePlayers.length,
    voteAttempt: state.voteAttempt,
  }
}

// R22: ngữ cảnh chờ hiện tại + mốc hết giờ — mọi người cùng thấy countdown.
function projectSelfWaiting(game: LocalGame): PlayerGameView['waiting'] {
  const state = game.state
  if (game.mode !== 'SELF' || !state) return undefined
  const context = waitingContext(state)
  if (!context || !state.waitingDeadlineAt) return undefined
  return {
    kind: context.kind,
    key: context.key,
    deadlineAt: state.waitingDeadlineAt,
  }
}

function domainAlive(game: LocalGame, playerId: string): boolean {
  return (
    game.state?.players.find((player) => player.id === playerId)?.alive ?? false
  )
}

// R21: consent kết thúc thảo luận — count + trạng thái của chính mình.
function projectSelfDiscussion(
  game: LocalGame,
  playerId: string,
): PlayerGameView['discussion'] {
  const state = game.state
  if (game.mode !== 'SELF' || state?.phase !== 'DAY') return undefined

  const consentIds = state.voteConsentIds ?? []
  const aliveCount = state.players.filter((player) => player.alive).length
  return {
    canConsent: domainAlive(game, playerId) && !consentIds.includes(playerId),
    hasConsented: consentIds.includes(playerId),
    consentCount: consentIds.length,
    aliveCount,
    consentNeeded: Math.floor(aliveCount / 2) + 1,
  }
}

function projectLover(
  game: LocalGame,
  playerId: string,
): PublicPlayerView | null {
  const loverIds = game.state?.loverIds
  if (!loverIds) return null
  const [firstId, secondId] = loverIds
  const loverId =
    playerId === firstId ? secondId : playerId === secondId ? firstId : null
  if (!loverId) return null
  const lover = game.lobbyPlayers.find((player) => player.id === loverId)
  if (!lover) return null
  return {
    id: lover.id,
    displayName: lover.displayName,
    ready: lover.ready,
    alive:
      game.state?.players.find((player) => player.id === lover.id)?.alive ??
      true,
  }
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
    case 'REVOTE_SKIPPED':
      publicEvent = { type: event.type }
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
