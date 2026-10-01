import { PlayerToken } from '#/components/ui/PlayerToken'
import { useState } from 'react'

import { CommandButton } from './CommandButton'

export function VoteForm({
  players,
  attempt,
  pending,
  onSubmit,
}: {
  players: { id: string; displayName: string }[]
  attempt: 1 | 2
  pending: boolean
  onSubmit: (tied: boolean, selectedPlayerId: string | null) => void
}) {
  const [targetId, setTargetId] = useState('')
  const [tied, setTied] = useState(false)
  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit(tied, tied ? null : targetId)
      }}
    >
      <div className="border-t border-line pt-5">
        <p className="font-mono text-sm tracking-wide text-accent uppercase">
          Lượt biểu quyết {attempt}/2
        </p>
        <p className="pt-1 text-sm text-ink-muted">
          Chọn người bị loại theo kết quả cả bàn đã thống nhất.
        </p>
      </div>
      <div
        aria-label="Người bị chọn"
        className={`grid grid-cols-2 gap-2.5 sm:grid-cols-3 ${tied ? 'pointer-events-none opacity-40' : ''}`}
        role="group"
      >
        {players.map((player, index) => (
          <PlayerToken
            key={player.id}
            displayName={player.displayName}
            index={index}
            selectable
            selected={player.id === targetId}
            onSelect={() => setTargetId(player.id)}
          />
        ))}
      </div>
      <label className="flex items-center gap-3 text-base/7 text-ink-muted sm:text-sm/6">
        <input
          className="size-5 accent-red-600 sm:size-4"
          name="tied"
          type="checkbox"
          checked={tied}
          onChange={(event) => setTied(event.target.checked)}
        />
        Kết quả hòa
      </label>
      <div className="sticky bottom-0 -mx-1 bg-linear-to-t from-stone-950 via-stone-950/90 px-1 pt-5 pb-safe">
        <CommandButton
          primary
          pending={pending}
          type="submit"
          disabled={!tied && !targetId}
        >
          Ghi nhận kết quả biểu quyết
        </CommandButton>
      </div>
    </form>
  )
}
