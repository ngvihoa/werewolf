import type { CommandHandler } from './types'
import type { GameState } from '#/game/orchestration/model'

import { CommandButton } from './CommandButton'
import { SecretNotice } from './SecretNotice'

export function VoteResolutionControl({
  state,
  names,
  pending,
  onCommand,
}: {
  state: GameState
  names: Map<string, string>
  pending: boolean
  onCommand: CommandHandler
}) {
  const resolution = state.pendingVoteResolution
  const summary = !resolution
    ? 'Chưa có kết quả'
    : resolution.outcome === 'ELIMINATED'
      ? `${names.get(resolution.playerId) ?? 'Người chơi'} sẽ bị loại`
      : resolution.outcome === 'REVOTE'
        ? 'Biểu quyết hòa, thực hiện lượt thứ hai'
        : 'Lượt hòa thứ hai, không ai bị loại'
  return (
    <div className="flex flex-col gap-5">
      <SecretNotice label="Kết quả biểu quyết" value={summary} />
      <CommandButton
        primary
        pending={pending}
        onClick={() => onCommand({ type: 'CONFIRM_VOTE_RESULT' })}
      >
        Xác nhận kết quả
      </CommandButton>
    </div>
  )
}
