import type { PlayerGameView } from '#/game/projections/model'
import type { CommandHandler } from './types'
import type { FormEvent } from 'react'

import { useState } from 'react'

import { CommandButton } from './CommandButton'
import { SelectField } from './SelectField'

export function HunterShotForm({
  view,
  pending,
  onCommand,
}: {
  view: PlayerGameView
  pending: boolean
  onCommand: CommandHandler
}) {
  const [targetId, setTargetId] = useState('')
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
  }

  return (
    <form className="flex flex-col gap-5" onSubmit={submit}>
      <SelectField
        id="hunter-shot-target"
        label="Chọn người kéo theo"
        name="targetId"
        value={targetId}
        options={targets}
        emptyLabel="Chọn một người chơi"
        required
        onChange={setTargetId}
      />
      <CommandButton primary pending={pending} type="submit">
        Gửi mục tiêu cho Quản trò
      </CommandButton>
    </form>
  )
}
