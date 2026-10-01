import type { PlayerGameView } from '#/game/projections/model'
import type { CommandHandler } from './types'
import type { FormEvent } from 'react'

import { WaitingState } from '#/components/ui/WaitingState'
import { PlayerToken } from '#/components/ui/PlayerToken'
import { useState } from 'react'

import { CommandButton } from './CommandButton'

export function HunterShotForm({
  view,
  pending,
  error,
  onCommand,
}: {
  view: PlayerGameView
  pending: boolean
  error: string | null
  onCommand: CommandHandler
}) {
  const [targetId, setTargetId] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const targets = view.players.filter(
    (player) => player.alive && player.id !== view.me.id,
  )

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!targetId) return
    onCommand({
      type: 'SUBMIT_HUNTER_SHOT',
      actorId: view.me.id,
      targetId,
    })
    setSubmitted(true)
  }

  if (submitted && !error) {
    return (
      <WaitingState
        title="Đã báo mục tiêu cho Quản trò"
        description="Phát súng sẽ được xác nhận ngay khi Quản trò kịp xử lý."
      />
    )
  }

  return (
    <form className="flex flex-col gap-5" onSubmit={submit}>
      <div
        aria-label="Chọn người kéo theo"
        className="grid grid-cols-2 gap-2.5 sm:grid-cols-3"
        role="group"
      >
        {targets.map((player, index) => (
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
      <div className="sticky bottom-0 -mx-1 bg-linear-to-t from-stone-950 via-stone-950/90 px-1 pt-5 pb-safe">
        <CommandButton
          primary
          pending={pending}
          type="submit"
          disabled={!targetId}
        >
          Gửi mục tiêu cho Quản trò
        </CommandButton>
      </div>
    </form>
  )
}
