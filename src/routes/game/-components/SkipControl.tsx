import type { CommandHandler } from './types'

import { useState } from 'react'

import { CommandButton } from './CommandButton'

export function SkipControl({
  pending,
  onCommand,
}: {
  pending: boolean
  onCommand: CommandHandler
}) {
  const [reason, setReason] = useState('')
  return (
    <div className="flex flex-col gap-3 border-t border-white/10 pt-5">
      <label
        className="text-base/7 text-stone-400 sm:text-sm/6"
        htmlFor="skip-step-reason"
      >
        Bỏ qua bước với lý do
      </label>
      <input
        className="rounded-md bg-stone-950 px-3 py-2.5 text-base text-stone-100 ring-1 ring-white/10 focus-visible:-outline-offset-1 focus-visible:outline-2 focus-visible:outline-red-500 sm:py-2 sm:text-sm"
        id="skip-step-reason"
        name="skipReason"
        value={reason}
        onChange={(event) => setReason(event.target.value)}
      />
      <CommandButton
        pending={pending}
        disabled={!reason.trim()}
        onClick={() => onCommand({ type: 'SKIP_STEP', reason })}
      >
        Bỏ qua lượt này
      </CommandButton>
    </div>
  )
}
