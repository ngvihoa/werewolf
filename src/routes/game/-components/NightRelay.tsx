import type { GameState } from '#/game/orchestration/model'

import { getSeerResult } from '#/game/rules/night-actions'

/**
 * Revamp MODERATED (§4.2): mảng truyền đạt thông tin đêm trên màn quản trò —
 * thứ duy nhất phải chảy từ hệ thống ra miệng quản trò giữa đêm. Bối cảnh
 * Phù thủy ("Sói đã chọn ai") hiện khi tới lượt Phù thủy; card kết quả soi
 * hiện sau khi step Tiên tri được ghi nhận, để quản trò đọc/lật màn hình.
 */
export function NightRelay({
  state,
  names,
}: {
  state: GameState
  names: Map<string, string>
}) {
  const activeItem = state.queue.find((item) => item.status === 'ACTIVE')
  const werewolfTargetId = state.confirmedNightActions.find(
    (action) => action.type === 'WEREWOLF_ATTACK',
  )?.targetId
  const seerAction = state.confirmedNightActions.find(
    (action) => action.type === 'SEER_INSPECT',
  )
  const seer = seerAction
    ? state.players.find((player) => player.id === seerAction.actorId)
    : null
  const seerTarget = seerAction
    ? state.players.find((player) => player.id === seerAction.targetId)
    : null

  return (
    <>
      {activeItem?.step === 'WITCH_ACTION' && werewolfTargetId ? (
        <div className="flex flex-col gap-1 rounded-2xl bg-danger/10 p-5 ring-1 ring-danger/25">
          <p className="font-mono text-sm tracking-wide text-danger uppercase">
            Báo Phù thủy
          </p>
          <p className="text-base/7 text-ink sm:text-sm/6">
            Sói đã chọn:{' '}
            <span className="font-medium">
              {names.get(werewolfTargetId) ?? 'người chơi'}
            </span>
            . Hỏi Phù thủy dùng bình cứu hay bình độc.
          </p>
        </div>
      ) : null}
      {seerAction && seer && seerTarget ? (
        <div className="flex flex-col gap-1 rounded-2xl bg-accent/10 p-5 ring-1 ring-accent/30">
          <p className="font-mono text-sm tracking-wide text-accent uppercase">
            Báo Tiên tri
          </p>
          <p className="text-base/7 text-ink sm:text-sm/6">
            {names.get(seer.id) ?? 'Tiên tri'} soi{' '}
            <span className="font-medium">
              {names.get(seerTarget.id) ?? 'người chơi'}
            </span>
            :{' '}
            <span className="font-medium">
              {getSeerResult(seerTarget) === 'WEREWOLF' ? 'SÓI' : 'NGƯỜI'}
            </span>
            .
          </p>
        </div>
      ) : null}
    </>
  )
}
