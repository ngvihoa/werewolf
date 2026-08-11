import { useState } from 'react'

import { CommandButton } from './CommandButton'
import { SelectField } from './SelectField'

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
      <p className="font-mono text-sm tracking-wide text-stone-500 uppercase">
        Lượt biểu quyết {attempt}/2
      </p>
      <SelectField
        id="vote-target"
        label="Người bị chọn"
        name="voteTarget"
        value={targetId}
        options={players}
        emptyLabel="Chọn kết quả"
        required={!tied}
        disabled={tied}
        onChange={setTargetId}
      />
      <label className="flex items-center gap-3 text-base/7 text-stone-300 sm:text-sm/6">
        <input
          className="size-5 accent-red-600 sm:size-4"
          name="tied"
          type="checkbox"
          checked={tied}
          onChange={(event) => setTied(event.target.checked)}
        />
        Kết quả hòa
      </label>
      <CommandButton
        primary
        pending={pending}
        type="submit"
        disabled={!tied && !targetId}
      >
        Ghi nhận kết quả biểu quyết
      </CommandButton>
    </form>
  )
}
