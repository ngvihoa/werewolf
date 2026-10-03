import type { DomainError } from '../domain'
import type { GameCommand } from '../orchestration/commands'
import type { GameState } from '../orchestration/model'
import type { GameEvent } from '../orchestration/events'

import { executeCommand } from '../orchestration/game-orchestrator'

// Giới hạn fixpoint chống vòng lặp vô hạn: một lệnh của bot không được tự
// kích hoạt chính nó lại. Flow dài nhất của game vẫn cách xa con số này.
export const MAX_BOT_ITERATIONS = 50

/**
 * Quản trò bot (mode SELF): phát đúng các command thuộc nhóm "moderator
 * confirmation" mà Quản trò vẫn phát ở mode MODERATED. Rule engine, event log
 * và bề mặt command không đổi — bot chỉ là người bấm confirm tự động.
 *
 * Không thuộc trách nhiệm bot: START_VOTE (cần consent người chơi — T4),
 * vote tally (T3), timeout/AFK (T5).
 */
export function nextBotCommands(state: Readonly<GameState>): GameCommand[] {
  if (state.winner) return []

  switch (state.phase) {
    case 'NIGHT':
      // Submit sai target đã bị rule engine từ chối lúc submit, nên mọi action
      // chờ confirm đều hợp lệ — bot confirm luôn, không có đường REJECT.
      return state.pendingNightAction ? [{ type: 'CONFIRM_STEP' }] : []
    case 'NIGHT_RESOLUTION':
      return state.pendingNightResolution
        ? [{ type: 'CONFIRM_NIGHT_RESOLUTION' }]
        : []
    case 'HUNTER_SHOT':
      // Hunter tự submit phát bắn qua thiết bị; bot chỉ xác nhận.
      return state.pendingHunterShot?.targetId
        ? [{ type: 'CONFIRM_HUNTER_SHOT' }]
        : []
    case 'VOTE_RESOLUTION':
      return state.pendingVoteResolution
        ? [{ type: 'CONFIRM_VOTE_RESULT' }]
        : []
    default:
      return []
  }
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
export function runBotLoop(currentState: GameState): BotLoopOutcome {
  let state = structuredClone(currentState)
  const events: GameEvent[] = []
  const steps: BotStep[] = []

  for (let iteration = 0; iteration < MAX_BOT_ITERATIONS; iteration += 1) {
    const [command] = nextBotCommands(state)
    if (!command) break

    const previousState = structuredClone(state)
    const outcome = executeCommand(state, command)
    if (!outcome.ok) return outcome

    state = outcome.value.state
    events.push(...outcome.value.events)
    steps.push({ command, previousState, events: outcome.value.events })
  }

  return { ok: true, state, events, steps }
}
