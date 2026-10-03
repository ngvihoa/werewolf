import type { PlayerGameView } from '#/game/projections/model'
import type { CommandHandler } from './types'
import type { FormEvent } from 'react'

import { queueStepLabel } from '#/game/presentation/labels'
import { WaitingState } from '#/components/ui/WaitingState'
import { PlayerToken } from '#/components/ui/PlayerToken'
import { useState } from 'react'

import { CommandButton } from './CommandButton'

export function NightActionForm({
  view,
  step,
  pending,
  error,
  onCommand,
}: {
  view: PlayerGameView
  step: NonNullable<PlayerGameView['turn']['activeStep']>
  pending: boolean
  error: string | null
  onCommand: CommandHandler
}) {
  const witchResources =
    view.me.abilityState && 'healingPotionAvailable' in view.me.abilityState
      ? view.me.abilityState
      : null
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [heal, setHeal] = useState(false)
  const [enhanced, setEnhanced] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const isWitch = step === 'WITCH_ACTION'
  const isCupid = step === 'CUPID_LINK'
  const targetId = selectedIds[0] ?? ''
  const secondTargetId = selectedIds[1] ?? ''
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
      (step !== 'WHITE_WOLF_KILL' || teammateIds.has(player.id)) &&
      (step !== 'PIPER_CHARM' ||
        !view.turn.charmedPlayerIds.includes(player.id)) &&
      (step !== 'COURTESAN_VISIT' ||
        player.id !== view.turn.lastCourtesanTargetId),
  )
  const nameOf = (id: string) =>
    view.players.find((player) => player.id === id)?.displayName ?? 'Người chơi'

  function toggleTarget(playerId: string) {
    setSelectedIds((current) => {
      if (current.includes(playerId)) {
        return current.filter((id) => id !== playerId)
      }
      if (isCupid) {
        return current.length < 2
          ? [...current, playerId]
          : [current[1], playerId]
      }
      return [playerId]
    })
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isWitch) {
      onCommand({
        type: 'SUBMIT_NIGHT_ACTION',
        action: {
          type: step,
          actorId: view.me.id,
          heal,
          poisonTargetId: targetId || null,
        },
      })
      setSubmitted(true)
      return
    }
    if (isCupid) {
      if (!targetId || !secondTargetId || targetId === secondTargetId) return
      onCommand({
        type: 'SUBMIT_NIGHT_ACTION',
        action: {
          type: step,
          actorId: view.me.id,
          targetIds: [targetId, secondTargetId],
        },
      })
      setSubmitted(true)
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
    setSubmitted(true)
  }

  if (submitted && !error) {
    return (
      <WaitingState
        icon={
          <span aria-hidden="true" className="text-xl">
            ✉
          </span>
        }
        title="Đã gửi hành động"
        description="Quản trò sẽ xem xét và xác nhận. Kết quả đêm sẽ hiện ngay khi mọi người hoàn thành."
      />
    )
  }

  return (
    <form className="flex flex-col gap-5" onSubmit={submit}>
      <div className="border-t border-line pt-5">
        <p className="font-mono text-sm tracking-wide text-accent uppercase">
          {queueStepLabel(step)}
        </p>
        {isCupid ? (
          <p aria-live="polite" className="pt-1 text-sm text-ink-muted">
            {selectedIds.length === 2
              ? `Đã ghép ${nameOf(targetId)} và ${nameOf(secondTargetId)} thành tình nhân.`
              : selectedIds.length === 1
                ? `Đã chọn ${nameOf(targetId)} — chọn tiếp người thứ hai.`
                : 'Chọn hai người khác nhau làm cặp tình nhân.'}
          </p>
        ) : (
          <p className="pt-1 text-sm text-ink-muted">
            {isWitch
              ? 'Chạm vào thẻ đã chọn để bỏ bình độc.'
              : 'Chạm vào thẻ để chọn, chạm lần nữa để bỏ chọn.'}
          </p>
        )}
      </div>
      {isWitch ? (
        <>
          <label className="flex items-center gap-3 text-base/7 text-ink-muted sm:text-sm/6">
            <input
              className="size-5 accent-danger sm:size-4"
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
          <div className="flex flex-col gap-3">
            <p className="text-base/7 text-ink-muted sm:text-sm/6">
              Dùng bình độc
            </p>
            <div
              aria-label="Chọn người đầu độc"
              className="grid auto-rows-fr grid-cols-2 gap-2.5 sm:grid-cols-3"
              role="group"
            >
              {targets.map((player, index) => (
                <PlayerToken
                  key={player.id}
                  displayName={player.displayName}
                  index={index}
                  selectable
                  selected={player.id === targetId}
                  disabled={!witchResources?.poisonPotionAvailable}
                  onSelect={() => toggleTarget(player.id)}
                />
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          <div
            aria-label="Chọn mục tiêu"
            className="grid auto-rows-fr grid-cols-2 gap-2.5 sm:grid-cols-3"
            role="group"
          >
            {targets.map((player, index) => (
              <PlayerToken
                key={player.id}
                displayName={player.displayName}
                index={index}
                selectable
                selected={selectedIds.includes(player.id)}
                onSelect={() => toggleTarget(player.id)}
              />
            ))}
          </div>
          {step === 'WEREWOLF_ATTACK' && view.me.role === 'ALPHA_WEREWOLF' ? (
            <label className="flex items-start gap-3 text-base/7 text-ink-muted sm:text-sm/6">
              <input
                className="mt-1 size-5 accent-danger sm:size-4"
                name="enhanced"
                type="checkbox"
                checked={enhanced}
                disabled={!view.turn.enhancedAttackAvailable}
                onChange={(event) => setEnhanced(event.target.checked)}
              />
              <span>
                Cắn xuyên bảo vệ
                <span className="block text-ink-subtle">
                  Dùng một lần trong cả ván. Phù thủy vẫn có thể cứu mục tiêu.
                </span>
              </span>
            </label>
          ) : null}
          {step === 'WEREWOLF_ATTACK' &&
          view.me.role === 'WEREWOLF' &&
          view.turn.werewolfAttackEnhanced ? (
            <p className="text-sm/6 text-accent">
              Sói Đầu Đàn đang kích hoạt Cắn xuyên bảo vệ.
            </p>
          ) : null}
        </>
      )}
      <div className="sticky bottom-0 -mx-1 bg-linear-to-t from-midnight via-midnight/90 px-1 pt-5 pb-safe">
        <CommandButton
          primary
          pending={pending}
          type="submit"
          disabled={
            isWitch ? false : isCupid ? selectedIds.length !== 2 : !targetId
          }
        >
          Gửi hành động cho Quản trò
        </CommandButton>
      </div>
    </form>
  )
}
