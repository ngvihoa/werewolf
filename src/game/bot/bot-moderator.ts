import type { DomainError } from '../domain'
import type { GameCommand } from '../orchestration/commands'
import type { GameState } from '../orchestration/model'
import type { GameEvent } from '../orchestration/events'

import { executeCommand, tallyVotes } from '../orchestration/game-orchestrator'

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

  switch (state.phase) {
    case 'NIGHT':
      // Submit sai target đã bị rule engine từ chối lúc submit, nên mọi action
      // chờ confirm đều hợp lệ — bot confirm luôn, không có đường REJECT.
      if (state.pendingNightAction) return [{ type: 'CONFIRM_STEP' }]
      // R22: step đêm hết giờ → skip (ability không tiêu thụ vì chưa confirm).
      return deadlineExpired(state, clock)
        ? [{ type: 'SKIP_STEP', reason: 'TIMEOUT' }]
        : []
    case 'NIGHT_RESOLUTION':
      return state.pendingNightResolution
        ? [{ type: 'CONFIRM_NIGHT_RESOLUTION' }]
        : []
    case 'HUNTER_SHOT':
      // Hunter tự submit phát bắn qua thiết bị; bot chỉ xác nhận.
      if (state.pendingHunterShot?.targetId) {
        return [{ type: 'CONFIRM_HUNTER_SHOT' }]
      }
      // R22: hunter không bắn đúng hạn → mất phát bắn, ván đi tiếp.
      return state.pendingHunterShot && deadlineExpired(state, clock)
        ? [{ type: 'SKIP_HUNTER_SHOT' }]
        : []
    case 'DAY':
      // R21: đủ majority người sống bấm "Sẵn sàng bỏ phiếu" VÀ đã qua mốc
      // thảo luận tối thiểu → mở vote. Một người chưa đồng ý không kẹt ván.
      return canOpenVote(state, clock) ? [{ type: 'START_VOTE' }] : []
    case 'VOTE':
      // R20: khi mọi người sống đã bỏ phiếu, bot tally và phát kết quả —
      // hòa theo R14 (attempt 1 → revote, attempt 2 → không ai bị loại).
      if (allAliveVoted(state)) {
        return [{ type: 'SUBMIT_VOTE_RESULT', ...tallyVotes(state) }]
      }
      // R22: hết giờ biểu quyết → phiếu thiếu tính trắng, tally luôn.
      return deadlineExpired(state, clock)
        ? [{ type: 'SUBMIT_VOTE_RESULT', ...tallyVotes(state) }]
        : []
    case 'VOTE_RESOLUTION':
      return state.pendingVoteResolution
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

/**
 * Ngữ cảnh đang chờ người chơi. Key đổi khi context đổi (step kế tiếp,
 * attempt vote mới, hunter shot mới) — store dựa vào đó gắn mốc mới đúng
 * một lần cho mỗi ngữ cảnh.
 */
export type WaitingContext = {
  kind: 'STEP' | 'VOTE' | 'HUNTER_SHOT'
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
  return null
}

function canOpenVote(state: Readonly<GameState>, clock?: BotClock): boolean {
  const aliveCount = state.players.filter((player) => player.alive).length
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
 */
export function stampWaitingDeadline(state: GameState, now: Date): void {
  const context = waitingContext(state)
  if (!context) {
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
 */
export function stampDiscussionDeadline(state: GameState, now: Date): void {
  if (state.phase === 'DAY' && !state.discussionMinEndsAt) {
    state.discussionMinEndsAt = new Date(
      now.getTime() + MIN_DISCUSSION_MS,
    ).toISOString()
  }
}

function allAliveVoted(state: Readonly<GameState>): boolean {
  return state.players
    .filter((player) => player.alive)
    .every((player) => state.voteSubmissions?.[player.id] !== undefined)
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
    // tránh một tick hết hạn ăn theo toàn bộ các step còn lại.
    if (clock) {
      stampDiscussionDeadline(state, clock.now)
      stampWaitingDeadline(state, clock.now)
    }
    events.push(...outcome.value.events)
    steps.push({ command, previousState, events: outcome.value.events })
  }

  return { ok: true, state, events, steps }
}
