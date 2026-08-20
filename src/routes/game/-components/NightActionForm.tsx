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
  const witchResources =
    view.me.abilityState && 'healingPotionAvailable' in view.me.abilityState
      ? view.me.abilityState
      : null
  const [targetId, setTargetId] = useState('')
  const [secondTargetId, setSecondTargetId] = useState('')
  const [heal, setHeal] = useState(false)
  const [poisonTargetId, setPoisonTargetId] = useState('')
  const [enhanced, setEnhanced] = useState(false)
  const teammateIds = new Set(
    view.turn.werewolfTeammates.map((player) => player.id),
  )
  const targets = view.players.filter(
    (player) =>
      player.alive &&
      (step === 'PROTECTOR_PROTECT' || player.id !== view.me.id) &&
      (step !== 'PROTECTOR_PROTECT' ||
        player.id !== view.turn.lastProtectedTargetId) &&
      (step !== 'WEREWOLF_ATTACK' || !teammateIds.has(player.id)) &&
      (step !== 'PIPER_CHARM' ||
        !view.turn.charmedPlayerIds.includes(player.id)) &&
      (step !== 'COURTESAN_VISIT' ||
        player.id !== view.turn.lastCourtesanTargetId),
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
    if (step === 'CUPID_LINK') {
      if (!targetId || !secondTargetId || targetId === secondTargetId) return
      onCommand({
        type: 'SUBMIT_NIGHT_ACTION',
        action: {
          type: step,
          actorId: view.me.id,
          targetIds: [targetId, secondTargetId],
        },
      })
      return
    }
    if (!targetId) return
    onCommand({
      type: 'SUBMIT_NIGHT_ACTION',
      action:
        step === 'WEREWOLF_ATTACK'
          ? { type: step, actorId: view.me.id, targetId, enhanced }
          : { type: step, actorId: view.me.id, targetId },
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
                !witchResources?.healingPotionAvailable ||
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
            disabled={!witchResources?.poisonPotionAvailable}
            options={targets}
            emptyLabel="Không dùng bình độc"
            onChange={setPoisonTargetId}
          />
        </>
      ) : (
        <>
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
          {step === 'CUPID_LINK' ? (
            <SelectField
              id="second-night-target"
              label="Chọn người yêu thứ hai"
              name="secondTargetId"
              value={secondTargetId}
              options={targets.filter((player) => player.id !== targetId)}
              emptyLabel="Chọn một người chơi khác"
              required
              onChange={setSecondTargetId}
            />
          ) : null}
          {step === 'WEREWOLF_ATTACK' && view.me.role === 'ALPHA_WEREWOLF' ? (
            <label className="flex items-start gap-3 text-base/7 text-stone-300 sm:text-sm/6">
              <input
                className="mt-1 size-5 accent-red-600 sm:size-4"
                name="enhanced"
                type="checkbox"
                checked={enhanced}
                disabled={!view.turn.enhancedAttackAvailable}
                onChange={(event) => setEnhanced(event.target.checked)}
              />
              <span>
                Cắn xuyên bảo vệ
                <span className="block text-stone-500">
                  Dùng một lần trong cả ván. Phù thủy vẫn có thể cứu mục tiêu.
                </span>
              </span>
            </label>
          ) : null}
          {step === 'WEREWOLF_ATTACK' &&
          view.me.role === 'WEREWOLF' &&
          view.turn.werewolfAttackEnhanced ? (
            <p className="text-sm/6 text-red-300">
              Sói Đầu Đàn đang kích hoạt Cắn xuyên bảo vệ.
            </p>
          ) : null}
        </>
      )}
      <CommandButton primary pending={pending} type="submit">
        Gửi hành động cho Quản trò
      </CommandButton>
    </form>
  )
}
