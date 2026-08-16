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
  const canSkipRevote = resolution?.outcome === 'REVOTE'
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
        {canSkipRevote ? 'Bắt đầu biểu quyết lần 2' : 'Xác nhận kết quả'}
      </CommandButton>
      {canSkipRevote ? (
        <CommandButton
          pending={pending}
          onClick={() => onCommand({ type: 'SKIP_REVOTE' })}
        >
          Xác nhận hòa và bỏ qua lần 2
        </CommandButton>
      ) : null}
    </div>
  )
}
