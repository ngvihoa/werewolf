import type { SessionKind, StoreResult } from './model'
import type { GameCommand } from '../orchestration/commands'

type CommandSession = {
  kind: SessionKind
  playerId: string | null
}

const PLAYER_COMMANDS = new Set<GameCommand['type']>(['SUBMIT_NIGHT_ACTION'])

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
      command.type === 'SUBMIT_NIGHT_ACTION' &&
      command.action.actorId !== session.playerId
    ) {
      return failure('Player cannot act for another player')
    }

    return { ok: true, value: true }
  }

  return session.kind === 'MODERATOR'
    ? { ok: true, value: true }
    : failure('Moderator session is required')
}

function failure(message: string): StoreResult<never> {
  return { ok: false, error: { code: 'NOT_AUTHORIZED', message } }
}
