import type { PlayerGameView } from '#/game/projections/model'
import type { CommandHandler } from './types'

import { phaseLabel, roleLabel } from '#/game/presentation/labels'
import { InlineError } from '#/components/InlineError'
import { RoleCard } from '#/components/RoleCard'

import { playerName, playerWaitingTitle } from './game-copy'
import { NightActionForm } from './NightActionForm'
import { SecretNotice } from './SecretNotice'
import { GameOver } from './GameOver'

export function PlayerGamePanel({
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
  const activeStep = view.turn.activeStep
  const canSubmit = view.turn.canAct && view.me.alive
  const latestSeerResult = [...view.privateHistory]
    .reverse()
    .find((entry) => entry.event.type === 'SEER_RESULT_RECORDED')

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <p className="font-mono text-sm tracking-wide text-red-300 uppercase">
          {phaseLabel(view.phase)} · Vòng {String(view.round).padStart(2, '0')}
        </p>
        <h2 className="text-balance text-3xl font-medium tracking-tight text-stone-50">
          {!view.me.alive
            ? 'Bạn đang quan sát'
            : canSubmit
              ? 'Đến lượt bạn hành động'
              : playerWaitingTitle(view.phase)}
        </h2>
        <p className="text-pretty text-base/7 text-stone-400 sm:text-sm/6">
          Vai của bạn là{' '}
          {view.me.role ? roleLabel(view.me.role) : 'chưa xác định'}. Thông tin
          trên màn hình này chỉ dành cho bạn.
        </p>
      </div>

      {view.me.role ? <RoleCard role={view.me.role} /> : null}

      {view.turn.werewolfTargetId ? (
        <SecretNotice
          label="Mục tiêu của Ma sói"
          value={playerName(view.players, view.turn.werewolfTargetId)}
        />
      ) : null}
      {latestSeerResult?.event.type === 'SEER_RESULT_RECORDED' ? (
        <SecretNotice
          label={`Kết quả soi ${playerName(view.players, latestSeerResult.event.targetPlayerId)}`}
          value={
            latestSeerResult.event.result === 'WEREWOLF'
              ? 'MA SÓI'
              : 'KHÔNG PHẢI MA SÓI'
          }
        />
      ) : null}
      {canSubmit && activeStep ? (
        <NightActionForm
          view={view}
          step={activeStep}
          pending={pending}
          onCommand={onCommand}
        />
      ) : null}
      {view.phase === 'GAME_OVER' ? <GameOver winner={view.winner} /> : null}
      {error ? <InlineError message={error} /> : null}
    </div>
  )
}
