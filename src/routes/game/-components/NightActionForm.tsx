import type { PlayerGameView } from '#/game/projections/model'
import type { CommandHandler } from './types'
import type { FormEvent } from 'react'

import { queueStepLabel } from '#/game/presentation/labels'
import { useState } from 'react'

import { CommandButton } from './CommandButton'
import { SelectField } from './SelectField'

export function NightActionForm({
  view,
  step,
  pending,
  onCommand,
}: {
  view: PlayerGameView
  step: NonNullable<PlayerGameView['turn']['activeStep']>
  pending: boolean
  onCommand: CommandHandler
}) {
  const [targetId, setTargetId] = useState('')
  const [heal, setHeal] = useState(false)
  const [poisonTargetId, setPoisonTargetId] = useState('')
  const targets = view.players.filter(
    (player) => player.alive && player.id !== view.me.id,
  )

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (step === 'WITCH_ACTION') {
      onCommand({
        type: 'SUBMIT_NIGHT_ACTION',
        action: {
          type: step,
          actorId: view.me.id,
          heal,
          poisonTargetId: poisonTargetId || null,
        },
      })
      return
    }
    if (!targetId) return
    onCommand({
      type: 'SUBMIT_NIGHT_ACTION',
      action: { type: step, actorId: view.me.id, targetId },
    })
  }

  return (
    <form className="flex flex-col gap-5" onSubmit={submit}>
      <div className="border-t border-white/10 pt-5">
        <p className="font-mono text-sm tracking-wide text-stone-500 uppercase">
          {queueStepLabel(step)}
        </p>
      </div>
      {step === 'WITCH_ACTION' ? (
        <>
          <label className="flex items-center gap-3 text-base/7 text-stone-300 sm:text-sm/6">
            <input
              className="size-5 accent-red-600 sm:size-4"
              name="heal"
              type="checkbox"
              checked={heal}
              disabled={
                !view.me.abilityState?.healingPotionAvailable ||
                !view.turn.werewolfTargetId
              }
              onChange={(event) => setHeal(event.target.checked)}
            />
            Dùng bình cứu
          </label>
          <SelectField
            id="poison-target"
            label="Dùng bình độc"
            name="poisonTargetId"
            value={poisonTargetId}
            disabled={!view.me.abilityState?.poisonPotionAvailable}
            options={targets}
            emptyLabel="Không dùng bình độc"
            onChange={setPoisonTargetId}
          />
        </>
      ) : (
        <SelectField
          id="night-target"
          label="Chọn mục tiêu"
          name="targetId"
          value={targetId}
          options={targets}
          emptyLabel="Chọn một người chơi"
          required
          onChange={setTargetId}
        />
      )}
      <CommandButton primary pending={pending} type="submit">
        Gửi hành động cho Quản trò
      </CommandButton>
    </form>
  )
}
