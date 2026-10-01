import type { PlayerGameView } from '#/game/projections/model'
import type { CommandHandler } from './types'

import { InlineError } from '#/components/InlineError'
import { RoleCard } from '#/components/RoleCard'

import { actionPrompt, playerName, playerWaitingTitle } from './game-copy'
import { GameResultDialog } from './GameResultDialog'
import { NightActionForm } from './NightActionForm'
import { HunterShotForm } from './HunterShotForm'
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
  const canSubmit = view.turn.canAct
  const seerResults = [...view.privateHistory]
    .reverse()
    .filter((entry) => entry.event.type === 'SEER_RESULT_RECORDED')
  const witchActions = [...view.privateHistory]
    .reverse()
    .filter(
      (entry) =>
        entry.event.type === 'OWN_NIGHT_ACTION_CONFIRMED' &&
        entry.event.action.type === 'WITCH_ACTION',
    )

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <h2 className="text-balance text-3xl font-medium tracking-tight text-ink">
          {canSubmit && activeStep
            ? actionPrompt(activeStep)
            : canSubmit
              ? 'Đến lượt bạn hành động'
              : !view.me.alive
                ? 'Bạn đang quan sát'
                : playerWaitingTitle(view.phase)}
        </h2>
        <p className="text-pretty text-base/7 text-ink-muted sm:text-sm/6">
          Thông tin trên màn hình này chỉ dành cho bạn. Mở thẻ khi cần xem lại
          vai trò.
        </p>
      </div>

      {view.me.role ? <RoleCard role={view.me.role} /> : null}
      {view.me.role === 'HYBRID_WOLF' &&
      view.me.abilityState !== null &&
      'converted' in view.me.abilityState &&
      view.me.abilityState.converted ? (
        <p className="rounded-2xl bg-danger/10 px-4 py-3 text-sm/6 text-ink ring-1 ring-danger/25">
          Bạn đã bị cắn và chuyển sang phe Ma sói. Từ đêm tiếp theo, bạn hành
          động cùng đàn Sói.
        </p>
      ) : null}
      {view.isCharmed ? (
        <p className="rounded-2xl bg-violet-400/10 px-4 py-3 text-sm/6 text-violet-200 ring-1 ring-violet-300/20">
          Bạn đã bị Người thổi sáo mê hoặc.
        </p>
      ) : null}
      {view.lover ? (
        <p className="rounded-2xl bg-rose-400/10 px-4 py-3 text-sm/6 text-rose-200 ring-1 ring-rose-300/20">
          Tình nhân của bạn là {view.lover.displayName}. Nếu một trong hai chết,
          người còn lại cũng sẽ chết theo.
        </p>
      ) : null}

      {view.turn.werewolfTeammates.length > 0 ? (
        <SecretNotice
          label="Đồng đội Ma sói"
          value={view.turn.werewolfTeammates
            .map((player) => player.displayName)
            .join(', ')}
        />
      ) : null}

      {view.turn.werewolfTargetId ? (
        <SecretNotice
          label="Mục tiêu của Ma sói"
          value={playerName(view.players, view.turn.werewolfTargetId)}
        />
      ) : null}
      {view.turn.hunterShotTargetId ? (
        <SecretNotice
          label="Mục tiêu phát súng cuối"
          value={playerName(view.players, view.turn.hunterShotTargetId)}
        />
      ) : null}
      {seerResults.length > 0 ? (
        <section className="flex flex-col gap-4">
          <div>
            <p className="font-mono text-sm tracking-wide text-accent uppercase">
              Lịch sử soi
            </p>
            <p className="pt-2 text-sm/6 text-ink-muted">
              Kết quả mới nhất hiển thị trước. Mỗi kết quả được giữ kín riêng.
            </p>
          </div>
          {seerResults.map((entry, index) =>
            entry.event.type === 'SEER_RESULT_RECORDED' ? (
              <SecretNotice
                key={entry.sequence}
                concealable
                label={`Lần soi ${seerResults.length - index}: ${playerName(view.players, entry.event.targetPlayerId)}`}
                value={
                  entry.event.result === 'WEREWOLF'
                    ? 'MA SÓI'
                    : 'KHÔNG PHẢI MA SÓI'
                }
              />
            ) : null,
          )}
        </section>
      ) : null}
      {witchActions.length > 0 ? (
        <section className="flex flex-col gap-4">
          <div>
            <p className="font-mono text-sm tracking-wide text-accent uppercase">
              Lịch sử dùng bình
            </p>
            <p className="pt-2 text-sm/6 text-ink-muted">
              Chỉ những hành động đã được Quản trò xác nhận mới xuất hiện tại
              đây.
            </p>
          </div>
          {witchActions.map((entry, index) => {
            if (
              entry.event.type !== 'OWN_NIGHT_ACTION_CONFIRMED' ||
              entry.event.action.type !== 'WITCH_ACTION'
            ) {
              return null
            }

            const action = entry.event.action
            const uses = [
              action.heal
                ? `Đã dùng bình cứu cho ${entry.event.healedTargetId ? playerName(view.players, entry.event.healedTargetId) : 'nạn nhân của Ma sói'}`
                : null,
              action.poisonTargetId
                ? `Đã dùng bình độc với ${playerName(view.players, action.poisonTargetId)}`
                : null,
            ].filter((use): use is string => use !== null)

            return (
              <SecretNotice
                key={entry.sequence}
                concealable
                hiddenLabel="Lịch sử dùng bình được giữ kín"
                label={`Lượt Phù thủy ${witchActions.length - index}`}
                value={
                  uses.length > 0 ? uses.join(' · ') : 'Không dùng bình nào'
                }
              />
            )
          })}
        </section>
      ) : null}
      {canSubmit && activeStep ? (
        <NightActionForm
          view={view}
          step={activeStep}
          pending={pending}
          error={error}
          onCommand={onCommand}
        />
      ) : null}
      {canSubmit && view.phase === 'HUNTER_SHOT' ? (
        <HunterShotForm
          view={view}
          pending={pending}
          error={error}
          onCommand={onCommand}
        />
      ) : null}
      {view.phase === 'GAME_OVER' ? <GameOver winner={view.winner} /> : null}
      {view.phase === 'GAME_OVER' && view.winner && view.me.role ? (
        <GameResultDialog
          winner={view.winner}
          role={view.me.role}
          hybridConverted={
            view.me.role === 'HYBRID_WOLF' &&
            view.me.abilityState !== null &&
            'converted' in view.me.abilityState &&
            view.me.abilityState.converted
          }
          isLover={view.lover !== null}
        />
      ) : null}
      {error ? <InlineError message={error} /> : null}
    </div>
  )
}
