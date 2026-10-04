import type { SessionKind, StoreResult } from './model'
import type { GameCommand } from '../orchestration/commands'
import type { GameEvent } from '../orchestration/events'
import type { EnteredBy } from '../orchestration/schema'

type CommandSession = {
  kind: SessionKind
  playerId: string | null
}

const PLAYER_COMMANDS = new Set<GameCommand['type']>([
  'SUBMIT_NIGHT_ACTION',
  'SUBMIT_HUNTER_SHOT',
  'SUBMIT_VOTE',
  'SUBMIT_VOTE_CONSENT',
])

// R23: kết thúc ván sớm — Quản trò (MODERATED) hoặc chủ phòng (SELF).
// Player gửi END_GAME qua đây; store kiểm tra host theo mode của game.
const DUAL_ACTOR_COMMANDS = new Set<GameCommand['type']>(['END_GAME'])

// Authorization là application policy dùng chung cho mọi GameStore.
// Rule engine phía sau chỉ kiểm tra luật chơi, không xác thực session.
export function authorizeCommand(
  session: CommandSession,
  command: GameCommand,
): StoreResult<true> {
  if (PLAYER_COMMANDS.has(command.type)) {
    if (session.kind !== 'PLAYER' || !session.playerId) {
      return failure('Player session is required')
    }

    // Player chỉ được gửi action mang chính actor id của session đó.
    if (
      (command.type === 'SUBMIT_NIGHT_ACTION' &&
        command.action.actorId !== session.playerId) ||
      (command.type === 'SUBMIT_HUNTER_SHOT' &&
        command.actorId !== session.playerId) ||
      (command.type === 'SUBMIT_VOTE' &&
        command.actorId !== session.playerId) ||
      (command.type === 'SUBMIT_VOTE_CONSENT' &&
        command.actorId !== session.playerId)
    ) {
      return failure('Player cannot act for another player')
    }

    return { ok: true, value: true }
  }

  if (DUAL_ACTOR_COMMANDS.has(command.type)) {
    // Moderator luôn được; player phải là chủ phòng — store kiểm tra phần đó
    // vì cần biết game mode (chức năng này không có ở session).
    if (session.kind === 'MODERATOR' || session.kind === 'PLAYER') {
      return { ok: true, value: true }
    }
    return failure('Moderator or host session is required')
  }

  return session.kind === 'MODERATOR'
    ? { ok: true, value: true }
    : failure('Moderator session is required')
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
