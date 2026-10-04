import type {
  EventProjection,
  GameView,
  PlayerGameView,
  PrivateHistoryEntry,
  PrivateHistoryEvent,
  ProjectionViewer,
  PublicHistoryEntry,
  PublicHistoryEvent,
  PublicPlayerView,
  StoredEventInput,
} from './model'
import type { NightAction } from '../rules/night-actions'
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
  const publicEntries: PublicHistoryEntry[] = []
  const privateEntries: PrivateHistoryEntry[] = []
  for (const entry of game.history) {
    if (entry.event.type === 'PHASE_CHANGED' && entry.event.to === 'NIGHT') {
      confirmedWerewolfTargetId = null
    }
    if (
      entry.event.type === 'NIGHT_ACTION_CONFIRMED' &&
      entry.event.action.type === 'WEREWOLF_ATTACK'
    ) {
      confirmedWerewolfTargetId = entry.event.action.targetId
    }
    const projected = projectEvent(
      entry,
      viewer.playerId,
      confirmedWerewolfTargetId,
    )
    if (projected.publicEntry) publicEntries.push(projected.publicEntry)
    if (projected.privateEntry) privateEntries.push(projected.privateEntry)
    // Revamp MODERATED (M9): hoàn tác là bù trừ trên history riêng — xóa các
    // entry của action bị hoàn tác rồi ghi nhận việc hoàn tác, để thiết bị
    // người chơi không hiển thị hành động đã bị rút lại. WEREWOLF_ATTACK bị
    // hoàn tác cũng reset tracker để Witch sau đó không thấy mục tiêu cũ.
    if (
      entry.event.type === 'STEP_UNDONE' &&
      entry.event.action.actorId === viewer.playerId
    ) {
      removeLastOwnAction(privateEntries, entry.event.action)
      if (entry.event.action.type === 'WEREWOLF_ATTACK') {
        confirmedWerewolfTargetId = null
      }
      privateEntries.push({
        sequence: entry.sequence,
        createdAt: entry.createdAt,
        event: {
          type: 'OWN_NIGHT_ACTION_UNDONE',
          action: structuredClone(entry.event.action),
          reason: entry.event.reason,
        },
      })
    }
  }
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
      // R23 (SELF): chỉ xuất hiện khi player đã rời — payload giữ hình dạng cũ.
      ...(player.leftAt ? { left: true as const } : {}),
    })),
    me: {
      id: lobbyPlayer.id,
      displayName: lobbyPlayer.displayName,
      ready: lobbyPlayer.ready,
      alive: domainPlayer?.alive ?? true,
      role: lobbyPlayer.role,
      ...(lobbyPlayer.leftAt ? { left: true as const } : {}),
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
    // M1/M13: player MODERATED không cần trạng thái bàn — đêm thuộc quản trò.
    // Chỉ giữ prompt phát bắn ban ngày (Thợ săn tự bấm trên thiết bị).
    queue:
      game.mode === 'MODERATED'
        ? []
        : (game.state?.queue.map((item) => ({
            step: item.step,
            status: item.status,
          })) ?? []),
    turn:
      game.mode === 'MODERATED'
        ? projectModeratedTurn(game, viewer.playerId)
        : {
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
                      isWerewolfPlayer(player) &&
                      player.id !== domainPlayer!.id,
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
    publicHistory: publicEntries,
    privateHistory: privateEntries,
  }
  return view
}

// M9: xóa entry riêng của action vừa bị hoàn tác (OWN_SUBMITTED →
// OWN_CONFIRMED, kèm kết quả soi nếu là Seer) — khớp theo deep-equal action
// và luôn là lần xảy ra GẦN NHẤT vì undo chỉ áp step cuối của đêm. Trong log
// các entry riêng của một lần confirm nằm liền nhau: SUBMITTED, CONFIRMED,
// SEER_RESULT (nếu có) — nhưng giữa attempt bị từ chối và attempt được nhận
// có thể chèn entry REJECTED, nên quét ngược tối đa tới ranh giới entry khác.
function removeLastOwnAction(
  entries: PrivateHistoryEntry[],
  action: NightAction,
): void {
  const signature = JSON.stringify(action)
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const event = entries[index].event
    const isOwn =
      (event.type === 'OWN_NIGHT_ACTION_CONFIRMED' ||
        event.type === 'OWN_NIGHT_ACTION_SUBMITTED') &&
      JSON.stringify(event.action) === signature
    if (!isOwn) continue

    let start = index
    for (let scan = index - 1; scan >= 0; scan -= 1) {
      const candidate = entries[scan].event
      const candidateIsOwn =
        (candidate.type === 'OWN_NIGHT_ACTION_CONFIRMED' ||
          candidate.type === 'OWN_NIGHT_ACTION_SUBMITTED') &&
        JSON.stringify(candidate.action) === signature
      if (!candidateIsOwn) break
      start = scan
    }
    // SEER_RESULT nằm ngay sau CONFIRMED trong log riêng của cùng lần confirm.
    const seerResultAfter =
      action.type === 'SEER_INSPECT' &&
      entries[index + 1]?.event.type === 'SEER_RESULT_RECORDED'
        ? 1
        : 0
    entries.splice(start, index + seerResultAfter - start + 1)
    return
  }
}

// R20/M6: phiếu chỉ hiện count + phiếu của chính mình — không lộ ai bỏ ai
// trước resolution để tránh bandwagon. Ban ngày ở MODERATED còn counts theo
// ứng viên (candidateCounts); SELF giữ nguyên R20 (chỉ tổng). Người đã rời
// (R23) không đếm vào aliveCount và không thể bỏ phiếu thêm.
function projectSelfVote(
  game: LocalGame,
  playerId: string,
): PlayerGameView['vote'] {
  const state = game.state
  if (state?.phase !== 'VOTE') return undefined

  const submissions = state.voteSubmissions ?? {}
  const leftIds = leftPlayerIdSet(game)
  const alivePlayers = state.players.filter(
    (player) => player.alive && !leftIds.has(player.id),
  )
  const candidateCounts: Record<string, number> = {}
  for (const [voterId, targetId] of Object.entries(submissions)) {
    if (!targetId) continue
    const voter = state.players.find((player) => player.id === voterId)
    if (!voter?.alive || leftIds.has(voterId)) continue
    candidateCounts[targetId] = (candidateCounts[targetId] ?? 0) + 1
  }
  return {
    canVote:
      domainAlive(game, playerId) &&
      !leftIds.has(playerId) &&
      submissions[playerId] === undefined,
    hasVoted: submissions[playerId] !== undefined,
    myTargetId: submissions[playerId] ?? null,
    votedCount: alivePlayers.filter(
      (player) => submissions[player.id] !== undefined,
    ).length,
    aliveCount: alivePlayers.length,
    voteAttempt: state.voteAttempt,
    // M6: counts theo ứng viên chỉ ở MODERATED (ban ngày, ai cũng mở mắt);
    // SELF không đếm công khai ứng viên (R20).
    ...(game.mode === 'MODERATED' ? { candidateCounts } : {}),
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

// M13: ở MODERATED, turn của player rỗng trừ một ngoại lệ — Thợ săn bị loại
// ban ngày tự bấm phát bắn trên thiết bị (ban ngày, mắt mở, không tell).
function projectModeratedTurn(
  game: LocalGame,
  playerId: string,
): PlayerGameView['turn'] {
  const state = game.state
  const isPendingHunter =
    state?.phase === 'HUNTER_SHOT' &&
    state.pendingHunterShot?.hunterId === playerId
  return {
    canAct: Boolean(
      isPendingHunter && state.pendingHunterShot?.targetId === null,
    ),
    activeStep: null,
    werewolfTargetId: null,
    werewolfAttackEnhanced: null,
    enhancedAttackAvailable: null,
    werewolfTeammates: [],
    lastProtectedTargetId: null,
    hunterShotTargetId: isPendingHunter
      ? (state.pendingHunterShot?.targetId ?? null)
      : null,
    charmedPlayerIds: [],
    lastCourtesanTargetId: null,
  }
}

function domainAlive(game: LocalGame, playerId: string): boolean {
  return (
    game.state?.players.find((player) => player.id === playerId)?.alive ?? false
  )
}

// R21: consent kết thúc thảo luận — count + trạng thái của chính mình. Người
// đã rời (R23) không đếm vào majority và không consent thêm được.
function projectSelfDiscussion(
  game: LocalGame,
  playerId: string,
): PlayerGameView['discussion'] {
  const state = game.state
  if (game.mode !== 'SELF' || state?.phase !== 'DAY') return undefined

  const consentIds = state.voteConsentIds ?? []
  const leftIds = leftPlayerIdSet(game)
  const aliveCount = state.players.filter(
    (player) => player.alive && !leftIds.has(player.id),
  ).length
  return {
    canConsent:
      domainAlive(game, playerId) &&
      !leftIds.has(playerId) &&
      !consentIds.includes(playerId),
    hasConsented: consentIds.includes(playerId),
    consentCount: consentIds.length,
    aliveCount,
    consentNeeded: Math.floor(aliveCount / 2) + 1,
  }
}

// R23: id các player đã rời — từ lobbyPlayers (leftAt do store ghi).
function leftPlayerIdSet(game: LocalGame): Set<string> {
  return new Set(
    game.lobbyPlayers
      .filter((player) => player.leftAt)
      .map((player) => player.id),
  )
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
        // M4: nguồn nhập đi kèm entry để UI gắn nhãn "do quản trò nhập" —
        // parity dữ liệu khi chính chủ role không hề chạm thiết bị.
        ...(event.type !== 'NIGHT_ACTION_REJECTED' && event.enteredBy
          ? { enteredBy: event.enteredBy }
          : {}),
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
