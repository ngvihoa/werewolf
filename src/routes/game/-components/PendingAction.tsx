import type { CommandHandler } from './types'
import type { GameState } from '#/game/orchestration/model'

import { useState } from 'react'

import { actionSummary } from './game-copy'
import { CommandButton } from './CommandButton'

export function PendingAction({
  action,
  names,
  pending,
  onCommand,
}: {
  action: NonNullable<GameState['pendingNightAction']>
  names: Map<string, string>
  pending: boolean
  onCommand: CommandHandler
}) {
  const [reason, setReason] = useState('')
  return (
    <div className="flex flex-col gap-5 rounded-lg bg-white/5 p-5 ring-1 ring-white/10">
      <div className="flex flex-col gap-2">
        <p className="font-mono text-sm tracking-wide text-red-300 uppercase">
          Chờ xác nhận
        </p>
        <p className="text-base/7 text-stone-200 sm:text-sm/6">
          {actionSummary(action, names)}
        </p>
      </div>
      <CommandButton
        primary
        pending={pending}
        onClick={() => onCommand({ type: 'CONFIRM_STEP' })}
      >
        Xác nhận hành động
      </CommandButton>
      <div className="flex flex-col gap-3 border-t border-white/10 pt-4">
        <label
          className="text-base/7 text-stone-400 sm:text-sm/6"
          htmlFor="reject-reason"
        >
          Lý do từ chối
        </label>
        <input
          className="rounded-md bg-stone-950 px-3 py-2.5 text-base text-stone-100 ring-1 ring-white/10 placeholder:text-stone-600 focus-visible:-outline-offset-1 focus-visible:outline-2 focus-visible:outline-red-500 sm:py-2 sm:text-sm"
          id="reject-reason"
          name="reason"
          placeholder="Ví dụ: chọn sai người"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
        <CommandButton
          pending={pending}
          disabled={!reason.trim()}
          onClick={() => onCommand({ type: 'REJECT_STEP', reason })}
        >
          Từ chối và yêu cầu chọn lại
        </CommandButton>
      </div>
    </div>
  )
}
