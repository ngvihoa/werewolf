import type { PlayerGameView } from '#/game/projections/model'
import type { CommandHandler } from './types'

import { WaitingState } from '#/components/ui/WaitingState'

import { CommandButton } from './CommandButton'

/**
 * R21 — kết thúc thảo luận ở mode SELF: mỗi người sống bấm "Sẵn sàng bỏ
 * phiếu"; đủ majority (kể cả mình) là bot mở biểu quyết. Một người chưa bấm
 * không kẹt ván vì majority tính trên số người sống.
 */
export function SelfVoteConsent({
  view,
  pending,
  onCommand,
}: {
  view: PlayerGameView
  pending: boolean
  onCommand: CommandHandler
}) {
  const discussion = view.discussion
  if (!discussion) return null

  if (!view.me.alive) return null

  if (discussion.hasConsented) {
    return (
      <WaitingState
        title="Bạn đã sẵn sàng"
        description={`${discussion.consentCount}/${discussion.aliveCount} người muốn vào biểu quyết — cần ${discussion.consentNeeded}.`}
      />
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="font-mono text-sm tabular-nums text-ink-subtle">
        {discussion.consentCount}/{discussion.aliveCount} người muốn vào biểu
        quyết — cần {discussion.consentNeeded}
      </p>
      <CommandButton
        primary
        pending={pending}
        onClick={() =>
          onCommand({
            type: 'SUBMIT_VOTE_CONSENT',
            actorId: view.me.id,
          })
        }
      >
        Sẵn sàng bỏ phiếu
      </CommandButton>
    </div>
  )
}
