import type { GameState, NightQueueItem } from '../orchestration/model'
import type { DomainError, GameMode } from '../domain'
import type { GameCommand } from '../orchestration/commands'
import type { GameEvent } from '../orchestration/events'

import { executeCommand, tallyVotes } from '../orchestration/game-orchestrator'
import { isWerewolfPlayer } from '../domain'
import { STEP_ROLE } from '../rules/transitions'

// Giới hạn fixpoint chống vòng lặp vô hạn: một lệnh của bot không được tự
// kích hoạt chính nó lại. Flow dài nhất của game vẫn cách xa con số này.
export const MAX_BOT_ITERATIONS = 50

// R21: thảo luận tối thiểu kéo dài bao lâu trước khi consent có thể mở vote.
// Hằng số MVP — về sau nâng thành game setting.
export const MIN_DISCUSSION_MS = 30_000

// R22: thời lượng tối đa của từng ngữ cảnh chờ người chơi trước khi bot
// skip/abstain. Hằng số MVP — về sau nâng thành game setting.
export const STEP_TIMEOUT_MS = 45_000
export const BALLOT_TIMEOUT_MS = 60_000
export const HUNTER_SHOT_TIMEOUT_MS = 60_000

export type BotClock = {
  // Thời điểm hiện tại — store inject deps.now() để bot so mốc deadline.
  now: Date
  // R23: player đã rời game giữa ván (SELF). Bot skip step/phát bắn của họ và
  // abstain phiếu còn thiếu NGAY thay vì chờ timer (R22).
  leftPlayerIds?: readonly string[]
  // Revamp MODERATED (M12): allowlist command bot theo mode. Vắng = SELF
  // (hành vi nguyên bản). MODERATED chỉ được CONFIRM_STEP khi có action chờ
  // và tally khi đủ phiếu — mọi gate công bố thuộc về người.
  mode?: GameMode
}

/**
 * Quản trò bot (mode SELF): phát đúng các command nhóm "moderator confirmation"
 * hoặc lệnh hệ thống tất định mà Quản trò vẫn làm ở mode MODERATED. Rule
 * engine, event log và bề mặt command không đổi — bot chỉ bấm confirm tự động.
 */
export function nextBotCommands(
  state: Readonly<GameState>,
  clock?: BotClock,
): GameCommand[] {
  if (state.winner) return []
  // M12: allowlist theo mode — vắng clock/mode giữ hành vi SELF nguyên bản.
  const moderated = clock?.mode === 'MODERATED'

  switch (state.phase) {
    case 'NIGHT': {
      // Submit sai target đã bị rule engine từ chối lúc submit, nên mọi action
      // chờ confirm đều hợp lệ — bot confirm luôn, không có đường REJECT.
      // MODERATED cũng vậy: action do quản trò proxy submit (M2), bot tự tiến
      // queue để mỗi step chỉ tốn một tương tác của quản trò (M3).
      if (state.pendingNightAction) return [{ type: 'CONFIRM_STEP' }]
      if (moderated) return []
      // R23: chủ sở hữu step đã rời game → skip ngay (không ai còn hành động
      // được), dù timer chưa hết.
      const activeStep = state.queue.find((item) => item.status === 'ACTIVE')
      if (activeStep && stepOwnerLeft(state, activeStep.step, clock)) {
        return [{ type: 'SKIP_STEP', reason: 'PLAYER_LEFT' }]
      }
      // R22: step đêm hết giờ → skip (ability không tiêu thụ vì chưa confirm).
      return deadlineExpired(state, clock)
        ? [{ type: 'SKIP_STEP', reason: 'TIMEOUT' }]
        : []
    }
    case 'NIGHT_RESOLUTION':
      // M3: công bố bình minh là gate người ở MODERATED — nhịp đọc kịch bản
      // của quản trò quyết định khi nào làng biết ca chết.
      return moderated
        ? []
        : state.pendingNightResolution
          ? [{ type: 'CONFIRM_NIGHT_RESOLUTION' }]
          : []
    case 'HUNTER_SHOT': {
      if (moderated) return []
      // Hunter tự submit phát bắn qua thiết bị; bot chỉ xác nhận.
      if (state.pendingHunterShot?.targetId) {
        return [{ type: 'CONFIRM_HUNTER_SHOT' }]
      }
      // R23: hunter đã rời game mà chưa bắn → mất phát bắn ngay.
      if (
        state.pendingHunterShot &&
        hasPlayerLeft(state.pendingHunterShot.hunterId, clock)
      ) {
        return [{ type: 'SKIP_HUNTER_SHOT' }]
      }
      // R22: hunter không bắn đúng hạn → mất phát bắn, ván đi tiếp.
      return state.pendingHunterShot && deadlineExpired(state, clock)
        ? [{ type: 'SKIP_HUNTER_SHOT' }]
        : []
    }
    case 'DAY':
      // M7: MODERATED mở vote bằng nút của quản trò (START_VOTE), không consent.
      if (moderated) return []
      // R21: đủ majority người sống bấm "Sẵn sàng bỏ phiếu" VÀ đã qua mốc
      // thảo luận tối thiểu → mở vote. Một người chưa đồng ý không kẹt ván.
      return canOpenVote(state, clock) ? [{ type: 'START_VOTE' }] : []
    case 'VOTE':
      // R20/M6: khi mọi người sống đã bỏ phiếu, bot tally và phát kết quả —
      // hòa theo R14 (attempt 1 → revote, attempt 2 → không ai bị loại). Cả
      // hai mode dùng chung tally; MODERATED không có đường deadline.
      if (allAliveVoted(state, clock)) {
        return [{ type: 'SUBMIT_VOTE_RESULT', ...tallyVotes(state) }]
      }
      if (moderated) return []
      // R22: hết giờ biểu quyết → phiếu thiếu tính trắng, tally luôn.
      return deadlineExpired(state, clock)
        ? [{ type: 'SUBMIT_VOTE_RESULT', ...tallyVotes(state) }]
        : []
    case 'VOTE_RESOLUTION':
      // M3/M6: công bố kết quả biểu quyết là gate người ở MODERATED.
      return moderated
        ? []
        : state.pendingVoteResolution
          ? [{ type: 'CONFIRM_VOTE_RESULT' }]
          : []
    default:
      return []
  }
}

function deadlineExpired(
  state: Readonly<GameState>,
  clock?: BotClock,
): boolean {
  if (!state.waitingDeadlineAt || !clock) return false
  return clock.now.getTime() >= Date.parse(state.waitingDeadlineAt)
}

// R23: player có mặt trong danh sách người rời do store inject qua clock.
function hasPlayerLeft(playerId: string, clock?: BotClock): boolean {
  return clock?.leftPlayerIds?.includes(playerId) ?? false
}

// R23: step đêm cần chủ sở hữu còn ở lại — werewolf thì chỉ cần MỘT sói còn
// ngồi tại bàn. Người rời vẫn "sống" trong rule engine nên phải loại trừ tường
// minh; ánh xạ role trùng activateNextRunnableStep của orchestrator.
function stepOwnerLeft(
  state: Readonly<GameState>,
  step: NightQueueItem['step'],
  clock?: BotClock,
): boolean {
  if (!clock?.leftPlayerIds?.length) return false
  const left = new Set(clock.leftPlayerIds)
  return !state.players.some(
    (player) =>
      player.alive &&
      !left.has(player.id) &&
      (step === 'WEREWOLF_ATTACK'
        ? isWerewolfPlayer(player)
        : player.role === STEP_ROLE[step]),
  )
}

/**
 * Ngữ cảnh đang chờ người chơi. Key đổi khi context đổi (step kế tiếp,
 * attempt vote mới, hunter shot mới) — store dựa vào đó gắn mốc mới đúng
 * một lần cho mỗi ngữ cảnh.
 */
export type WaitingContext = {
  kind: 'STEP' | 'VOTE' | 'HUNTER_SHOT' | 'DISCUSSION'
  key: string
  timeoutMs: number
}

export function waitingContext(
  state: Readonly<GameState>,
): WaitingContext | null {
  if (state.winner) return null
  const activeStep = state.queue.find((item) => item.status === 'ACTIVE')
  if (state.phase === 'NIGHT' && activeStep) {
    return {
      kind: 'STEP',
      key: `STEP:${state.round}:${activeStep.step}`,
      timeoutMs: STEP_TIMEOUT_MS,
    }
  }
  if (state.phase === 'VOTE') {
    return {
      kind: 'VOTE',
      key: `VOTE:${state.round}:${state.voteAttempt}`,
      timeoutMs: BALLOT_TIMEOUT_MS,
    }
  }
  if (state.phase === 'HUNTER_SHOT' && state.pendingHunterShot) {
    return {
      kind: 'HUNTER_SHOT',
      key: `SHOT:${state.round}`,
      timeoutMs: HUNTER_SHOT_TIMEOUT_MS,
    }
  }
  // R21: DAY không có đồng hồ cứng — mốc duy nhất là thời gian thảo luận tối
  // thiểu. Countdown hiện cho mọi người và auto-tick khi hết (R22) để bot mở
  // vote nếu majority đã consent: không có ngữ cảnh này, cả bàn bấm consent
  // sớm sẽ không còn command nào kích hoạt bot loop và vote không bao giờ mở.
  if (state.phase === 'DAY') {
    return {
      kind: 'DISCUSSION',
      key: `DISCUSSION:${state.round}`,
      timeoutMs: MIN_DISCUSSION_MS,
    }
  }
  return null
}

function canOpenVote(state: Readonly<GameState>, clock?: BotClock): boolean {
  // R23: người đã rời không đếm vào majority — DAY không có timer nên tính
  // họ vào mẫu số sẽ kẹt ván vĩnh viễn nếu họ chưa kịp consent.
  const aliveCount = participatingPlayers(state, clock).length
  const majority = Math.floor(aliveCount / 2) + 1
  const consentCount = state.voteConsentIds?.length ?? 0
  if (consentCount < majority) return false

  if (!state.discussionMinEndsAt) return true
  if (!clock) return false
  return clock.now.getTime() >= Date.parse(state.discussionMinEndsAt)
}

/**
 * Store gọi khi state vừa thay đổi (trước và sau bot loop): gắn mốc hết giờ
 * cho ngữ cảnh chờ MỚI; giữ nguyên mốc nếu vẫn cùng ngữ cảnh. Orchestrator
 * giữ nguyên thuần khiết — chỉ store (biết `now`) mới gắn mốc thời gian.
 *
 * M8/M12: MODERATED chỉ stamp ngữ cảnh VOTE (đèn alert trên màn quản trò —
 * hết giờ không phát lệnh nào); đêm thuộc quản trò nên không có đồng hồ.
 */
export function stampWaitingDeadline(
  state: GameState,
  now: Date,
  mode: GameMode = 'SELF',
): void {
  const context = waitingContext(state)
  if (!context || (mode === 'MODERATED' && context.kind !== 'VOTE')) {
    state.waitingKey = null
    state.waitingDeadlineAt = null
    return
  }
  if (state.waitingKey !== context.key) {
    state.waitingKey = context.key
    state.waitingDeadlineAt = new Date(
      now.getTime() + context.timeoutMs,
    ).toISOString()
  }
}

/**
 * Store gọi SAU khi lệnh người chơi được chấp nhận và TRƯỚC runBotLoop: nếu
 * state vừa vào DAY mà chưa có mốc thì gắn mốc thảo luận tối thiểu. Orchestrator
 * giữ nguyên thuần khiết — chỉ store (biết `now`) mới được gắn mốc thời gian.
 * MODERATED không có consent R21 nên no-op (M12).
 */
export function stampDiscussionDeadline(
  state: GameState,
  now: Date,
  mode: GameMode = 'SELF',
): void {
  if (mode === 'MODERATED') return
  if (state.phase === 'DAY' && !state.discussionMinEndsAt) {
    state.discussionMinEndsAt = new Date(
      now.getTime() + MIN_DISCUSSION_MS,
    ).toISOString()
  }
}

// Người chơi còn tham gia: sống và chưa rời game (R23). Người rời không bị
// mark dead nên phải loại trừ tường minh ở mọi chỗ đếm "người sống".
function participatingPlayers(
  state: Readonly<GameState>,
  clock?: BotClock,
): readonly { id: string }[] {
  if (!clock?.leftPlayerIds?.length) {
    return state.players.filter((player) => player.alive)
  }
  const left = new Set(clock.leftPlayerIds)
  return state.players.filter((player) => player.alive && !left.has(player.id))
}

function allAliveVoted(state: Readonly<GameState>, clock?: BotClock): boolean {
  return participatingPlayers(state, clock).every(
    (player) => state.voteSubmissions?.[player.id] !== undefined,
  )
}

export type BotStep = {
  command: GameCommand
  // State trước khi bot thực thi command này — cần cho persistence layer
  // (persistGameAction đọc pendingNightAction từ state trước).
  previousState: GameState
  events: GameEvent[]
}

export type BotLoopOutcome =
  | { ok: true; state: GameState; events: GameEvent[]; steps: BotStep[] }
  | { ok: false; error: DomainError }

/**
 * Chạy bot tới fixpoint: lặp `nextBotCommands` → `executeCommand` cho đến khi
 * không còn command nào. Thuần để test; caller (store) gọi trong cùng
 * transaction với lệnh người chơi rồi persist một lần.
 *
 * Bot command bị rule engine từ chối là lỗi invariant (bot không phát lệnh
 * trái luật), trả failure để toàn transaction rollback thay vì im lặng.
 */
export function runBotLoop(
  currentState: GameState,
  clock?: BotClock,
): BotLoopOutcome {
  let state = structuredClone(currentState)
  const events: GameEvent[] = []
  const steps: BotStep[] = []

  for (let iteration = 0; iteration < MAX_BOT_ITERATIONS; iteration += 1) {
    const [command] = nextBotCommands(state, clock)
    if (!command) break

    const previousState = structuredClone(state)
    const outcome = executeCommand(state, command)
    if (!outcome.ok) return outcome

    state = outcome.value.state
    // Bot có thể đổi ngữ cảnh chờ (skip step → step mới ACTIVE, vào DAY,
    // revote...): gắn mốc ngay trong loop để lần kiểm kế tiếp so đúng mốc,
    // tránh một tick hết hạn ăn theo toàn bộ các step còn lại. Cả hai hàm
    // stamp tự no-op phần SELF-only khi mode là MODERATED.
    if (clock) {
      stampDiscussionDeadline(state, clock.now, clock.mode)
      stampWaitingDeadline(state, clock.now, clock.mode)
    }
    events.push(...outcome.value.events)
    steps.push({ command, previousState, events: outcome.value.events })
  }

  return { ok: true, state, events, steps }
}
