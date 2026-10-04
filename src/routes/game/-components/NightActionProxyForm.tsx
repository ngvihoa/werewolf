import type { CommandHandler } from './types'
import type { NightAction } from '#/game/rules/night-actions'
import type { GameState } from '#/game/orchestration/model'

import { validateNightAction } from '#/game/rules/night-actions'
import { isWerewolfPlayer } from '#/game/domain'
import { PlayerToken } from '#/components/ui/PlayerToken'
import { roleLabel } from '#/game/presentation/labels'
import { STEP_ROLE } from '#/game/rules/transitions'
import { useState } from 'react'

import { CommandButton } from './CommandButton'
import { actionPrompt } from './game-copy'

type QueueStep = GameState['queue'][number]['step']

/**
 * Revamp MODERATED (M2/M5): khối nhập action đêm của quản trò — picker chọn,
 * không ô text. Validate chạy ngay trên máy bằng chính rule engine của game
 * (hàm thuần import trực tiếp) nên target sai luật bị chặn trước khi gửi kèm
 * thông báo; action gửi đi mang actorId của chủ role (proxy input), store tự
 * ghi enteredBy MODERATOR vào audit.
 */
export function NightActionProxyForm({
  state,
  names,
  pending,
  onCommand,
}: {
  state: GameState
  names: Map<string, string>
  pending: boolean
  onCommand: CommandHandler
}) {
  const activeItem = state.queue.find((item) => item.status === 'ACTIVE')
  const step = activeItem?.step
  const owners = step
    ? state.players.filter((player) =>
        step === 'WEREWOLF_ATTACK'
          ? player.alive && isWerewolfPlayer(player)
          : player.alive && player.role === STEP_ROLE[step],
      )
    : []
  const [actorId, setActorId] = useState<string | null>(null)
  const [pickedIds, setPickedIds] = useState<string[]>([])
  const [heal, setHeal] = useState(false)
  const [poisonTargetId, setPoisonTargetId] = useState<string | null>(null)
  const [enhanced, setEnhanced] = useState(false)

  if (!step || owners.length === 0) return null
  const actor = owners.find((owner) => owner.id === actorId) ?? owners[0]
  const livingPlayers = state.players.filter((player) => player.alive)

  const action =
    step && actor
      ? buildAction({
          step,
          actorId: actor.id,
          pickedIds,
          heal,
          poisonTargetId,
          enhanced:
            enhanced &&
            actor.role === 'ALPHA_WEREWOLF' &&
            actor.abilityState.enhancedAttackAvailable,
        })
      : null
  let validationError: string | null
  if (!action) {
    validationError =
      step === 'CUPID_LINK'
        ? 'Chọn đúng hai người thành tình nhân.'
        : 'Chọn mục tiêu để tiếp tục.'
  } else {
    const validation = validateNightAction(action, {
      activeStep: step,
      players: state.players,
      werewolfTargetId:
        state.confirmedNightActions.find(
          (confirmed) => confirmed.type === 'WEREWOLF_ATTACK',
        )?.targetId ?? undefined,
      lastProtectedTargetId: state.lastProtectedTargetId,
      charmedPlayerIds: state.charmedPlayerIds,
      round: state.round,
      loverIds: state.loverIds,
      lastCourtesanTargetId: state.lastCourtesanTargetId,
    })
    validationError = validation.ok ? null : validation.error.message
  }
  const isValid = action !== null && validationError === null

  const togglePick = (playerId: string) => {
    setPickedIds((current) =>
      current.includes(playerId)
        ? current.filter((id) => id !== playerId)
        : step === 'CUPID_LINK' && current.length >= 2
          ? current
          : [...current, playerId],
    )
  }

  return (
    <form
      className="flex flex-col gap-5 rounded-2xl bg-surface-raised p-5 ring-1 ring-accent/30 shadow-lg shadow-black/10"
      onSubmit={(event) => {
        event.preventDefault()
        if (!action || !isValid) return
        onCommand({ type: 'SUBMIT_NIGHT_ACTION', action })
      }}
    >
      <div className="flex flex-col gap-1">
        <p className="font-mono text-sm tracking-wide text-accent uppercase">
          Đêm {state.round} — lượt của vai
        </p>
        <p className="text-base/7 text-ink sm:text-sm/6">
          Gọi{' '}
          <span className="font-medium text-ink">
            {owners.map((owner) => names.get(owner.id) ?? owner.id).join(', ')}
          </span>{' '}
          ({roleLabel(STEP_ROLE[step])}) rồi chọn giúp họ.
        </p>
        <p className="text-sm text-ink-muted">{actionPrompt(step)}</p>
      </div>

      {step === 'WEREWOLF_ATTACK' && owners.length > 1 ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm text-ink-muted">Ai cắn đêm nay?</legend>
          <div className="grid auto-rows-fr grid-cols-2 gap-2.5 sm:grid-cols-3">
            {owners.map((owner, index) => (
              <PlayerToken
                key={owner.id}
                displayName={names.get(owner.id) ?? owner.id}
                index={index}
                selectable
                selected={actor.id === owner.id}
                onSelect={() => setActorId(owner.id)}
              />
            ))}
          </div>
        </fieldset>
      ) : null}

      {step !== 'WITCH_ACTION' ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm text-ink-muted">
            {step === 'CUPID_LINK'
              ? 'Chọn hai người thành tình nhân'
              : 'Chọn mục tiêu'}
          </legend>
          <div className="grid auto-rows-fr grid-cols-2 gap-2.5 sm:grid-cols-3">
            {livingPlayers.map((player, index) => (
              <PlayerToken
                key={player.id}
                displayName={names.get(player.id) ?? player.id}
                index={index}
                selectable
                selected={pickedIds.includes(player.id)}
                onSelect={() => togglePick(player.id)}
              />
            ))}
          </div>
        </fieldset>
      ) : null}

      {step === 'WITCH_ACTION' ? (
        <WitchControls
          players={state.players}
          names={names}
          heal={heal}
          onHeal={setHeal}
          poisonTargetId={poisonTargetId}
          onPoison={setPoisonTargetId}
        />
      ) : null}

      {step === 'WEREWOLF_ATTACK' &&
      owners.some(
        (owner) =>
          owner.role === 'ALPHA_WEREWOLF' &&
          owner.abilityState.enhancedAttackAvailable,
      ) ? (
        <label className="flex items-center gap-3 text-base/7 text-ink-muted sm:text-sm/6">
          <input
            className="size-5 accent-danger sm:size-4"
            type="checkbox"
            checked={enhanced}
            onChange={(event) => setEnhanced(event.target.checked)}
          />
          Cắn xuyên bảo vệ (Sói Đầu Đàn)
        </label>
      ) : null}

      {validationError ? (
        <p className="text-pretty text-sm/6 text-danger">{validationError}</p>
      ) : null}

      <div className="sticky bottom-0 -mx-1 bg-linear-to-t from-midnight via-midnight/90 px-1 pt-5 pb-safe">
        <CommandButton
          primary
          pending={pending}
          type="submit"
          disabled={!isValid}
        >
          Ghi nhận lựa chọn của {roleLabel(STEP_ROLE[step])}
        </CommandButton>
      </div>
    </form>
  )
}

function WitchControls({
  players,
  names,
  heal,
  onHeal,
  poisonTargetId,
  onPoison,
}: {
  players: GameState['players']
  names: Map<string, string>
  heal: boolean
  onHeal: (heal: boolean) => void
  poisonTargetId: string | null
  onPoison: (targetId: string | null) => void
}) {
  const witch = players.find((player) => player.role === 'WITCH')
  const healAvailable =
    witch?.role === 'WITCH' ? witch.abilityState.healingPotionAvailable : false
  const poisonAvailable =
    witch?.role === 'WITCH' ? witch.abilityState.poisonPotionAvailable : false
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="text-sm text-ink-muted">Hành động của Phù thủy</legend>
      <label className="flex items-center gap-3 text-base/7 text-ink-muted sm:text-sm/6">
        <input
          className="size-5 accent-danger sm:size-4"
          type="checkbox"
          disabled={!healAvailable}
          checked={heal}
          onChange={(event) => onHeal(event.target.checked)}
        />
        Dùng bình cứu cho nạn nhân Sói
        {healAvailable ? '' : ' (đã dùng)'}
      </label>
      {poisonAvailable ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-ink-muted">
            Nạn nhân của bình độc (bỏ trống nếu không dùng)
          </p>
          <div className="grid auto-rows-fr grid-cols-2 gap-2.5 sm:grid-cols-3">
            {players
              .filter((player) => player.alive)
              .map((player, index) => (
                <PlayerToken
                  key={player.id}
                  displayName={names.get(player.id) ?? player.id}
                  index={index}
                  selectable
                  selected={poisonTargetId === player.id}
                  onSelect={() =>
                    onPoison(poisonTargetId === player.id ? null : player.id)
                  }
                />
              ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-ink-muted">Bình độc đã dùng.</p>
      )}
    </fieldset>
  )
}

function buildAction(input: {
  step: QueueStep
  actorId: string
  pickedIds: string[]
  heal: boolean
  poisonTargetId: string | null
  enhanced: boolean
}): NightAction | null {
  const { step, actorId, pickedIds, heal, poisonTargetId, enhanced } = input
  if (step === 'WITCH_ACTION') {
    return {
      type: 'WITCH_ACTION',
      actorId,
      heal,
      poisonTargetId,
    }
  }
  if (step === 'CUPID_LINK') {
    if (pickedIds.length !== 2) return null
    return {
      type: 'CUPID_LINK',
      actorId,
      targetIds: [pickedIds[0], pickedIds[1]],
    }
  }
  const targetId = pickedIds[0]
  if (!targetId) return null
  switch (step) {
    case 'HUNTER_MARK':
      return { type: 'HUNTER_MARK', actorId, targetId }
    case 'PROTECTOR_PROTECT':
      return { type: 'PROTECTOR_PROTECT', actorId, targetId }
    case 'SEER_INSPECT':
      return { type: 'SEER_INSPECT', actorId, targetId }
    case 'WEREWOLF_ATTACK':
      return { type: 'WEREWOLF_ATTACK', actorId, targetId, enhanced }
    case 'WHITE_WOLF_KILL':
      return { type: 'WHITE_WOLF_KILL', actorId, targetId }
    case 'PIPER_CHARM':
      return { type: 'PIPER_CHARM', actorId, targetId }
    case 'COURTESAN_VISIT':
      return { type: 'COURTESAN_VISIT', actorId, targetId }
    default:
      return null
  }
}
