import type { SessionKind, StoreResult } from './model'
import type { GameCommand } from '../orchestration/commands'
import type { GameEvent } from '../orchestration/events'
import type { EnteredBy } from '../orchestration/schema'
import type { GameMode } from '../domain'

type CommandSession = {
  kind: SessionKind
  playerId: string | null
}

// SELF (R20–R23): player tác động chính mình qua 4 lệnh; còn lại là của hệ
// thống (bot) hoặc chủ phòng.
const SELF_PLAYER_COMMANDS = new Set<GameCommand['type']>([
  'SUBMIT_NIGHT_ACTION',
  'SUBMIT_HUNTER_SHOT',
  'SUBMIT_VOTE',
  'SUBMIT_VOTE_CONSENT',
])

// Revamp MODERATED (M2, M6): đêm thuộc quản trò — player bị chặn night action
// lẫn consent R21; ban ngày thiết bị của player vẫn biểu quyết và Thợ săn bắn
// phát bắn của mình (ban ngày, mắt mở).
const MODERATED_PLAYER_COMMANDS = new Set<GameCommand['type']>([
  'SUBMIT_VOTE',
  'SUBMIT_HUNTER_SHOT',
])

// R23: kết thúc ván sớm — Quản trò (MODERATED) hoặc chủ phòng (SELF).
// Player gửi END_GAME qua đây; store kiểm tra host theo mode của game.
const DUAL_ACTOR_COMMANDS = new Set<GameCommand['type']>(['END_GAME'])

// Authorization là application policy dùng chung cho mọi GameStore.
// Rule engine phía sau chỉ kiểm tra luật chơi, không xác thực session.
export function authorizeCommand(
  session: CommandSession,
  command: GameCommand,
  mode: GameMode,
): StoreResult<true> {
  if (DUAL_ACTOR_COMMANDS.has(command.type)) {
    // Moderator luôn được; player phải là chủ phòng — store kiểm tra phần đó
    // vì cần biết game mode (chức năng này không có ở session).
    if (session.kind === 'MODERATOR' || session.kind === 'PLAYER') {
      return { ok: true, value: true }
    }
    return failure('Moderator or host session is required')
  }

  if (session.kind === 'PLAYER') {
    if (!session.playerId) return failure('Player session is required')
    return authorizePlayerCommand(
      session as CommandSession & { playerId: string },
      command,
      mode,
    )
  }

  // MODERATOR: được mọi lệnh điều phối. Ở MODERATED, SUBMIT_NIGHT_ACTION /
  // SUBMIT_HUNTER_SHOT với actorId bất kỳ là proxy input đường chính (M2) —
  // rule engine kiểm actor còn sống và còn nắm role. Ở SELF không có
  // moderator session nên nhánh này vô hình với SELF.
  return session.kind === 'MODERATOR'
    ? { ok: true, value: true }
    : failure('Moderator session is required')
}

function authorizePlayerCommand(
  session: CommandSession & { playerId: string },
  command: GameCommand,
  mode: GameMode,
): StoreResult<true> {
  const allowed =
    mode === 'MODERATED' ? MODERATED_PLAYER_COMMANDS : SELF_PLAYER_COMMANDS
  if (!allowed.has(command.type)) {
    return failure(
      mode === 'MODERATED'
        ? 'Players act through the moderator at night in this mode'
        : 'Player session is required',
    )
  }

  // Player chỉ được gửi action mang chính actor id của session đó.
  if (
    (command.type === 'SUBMIT_NIGHT_ACTION' &&
      command.action.actorId !== session.playerId) ||
    (command.type === 'SUBMIT_HUNTER_SHOT' &&
      command.actorId !== session.playerId) ||
    (command.type === 'SUBMIT_VOTE' && command.actorId !== session.playerId) ||
    (command.type === 'SUBMIT_VOTE_CONSENT' &&
      command.actorId !== session.playerId)
  ) {
    return failure('Player cannot act for another player')
  }

  return { ok: true, value: true }
}

function failure(message: string): StoreResult<never> {
  return { ok: false, error: { code: 'NOT_AUTHORIZED', message } }
}

// Revamp MODERATED (M4): gắn nguồn nhập vào event audit để thiết bị người
// chơi biết hành động nào do quản trò nhập thay. Store gọi sau khi command
// được chấp nhận; bot confirm trong cùng transaction kế thừa nguồn của lệnh
// khởi phát (action được confirm luôn do chính lệnh đó submit).
export function stampEnteredBy(
  events: GameEvent[],
  enteredBy: EnteredBy,
): GameEvent[] {
  return events.map((event) =>
    event.type === 'NIGHT_ACTION_SUBMITTED' ||
    event.type === 'NIGHT_ACTION_CONFIRMED' ||
    event.type === 'HUNTER_SHOT_SUBMITTED'
      ? { ...event, enteredBy }
      : event,
  )
}
