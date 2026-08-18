import type { PlayerGameView } from '#/game/projections/model'
import type { GameState } from '#/game/orchestration/model'

import { queueStepLabel } from '#/game/presentation/labels'

export function playerName(players: PlayerGameView['players'], id: string) {
  return players.find((player) => player.id === id)?.displayName ?? 'Người chơi'
}

export function moderatorPhaseTitle(
  phase: GameState['phase'],
  step?: GameState['queue'][number]['step'],
) {
  if (phase === 'NIGHT' && step) return `Gọi ${queueStepLabel(step)}`
  return (
    {
      NIGHT: 'Điều phối hàng đợi đêm',
      NIGHT_RESOLUTION: 'Kiểm tra kết quả đêm',
      DAY: 'Mở thảo luận ban ngày',
      VOTE: 'Ghi nhận biểu quyết',
      VOTE_RESOLUTION: 'Xác nhận biểu quyết',
      HUNTER_SHOT: 'Phát súng cuối cùng của Thợ săn',
      GAME_OVER: 'Ván chơi đã kết thúc',
      SETUP: 'Chuẩn bị',
      ROLE_REVEAL: 'Xem vai',
      READY_CHECK: 'Sẵn sàng',
    } as const
  )[phase]
}

export function moderatorPhaseDescription(phase: GameState['phase']) {
  return (
    {
      NIGHT: 'Chỉ người có vai đang được gọi mới có thể gửi hành động.',
      NIGHT_RESOLUTION: 'Kết quả chưa công khai cho tới khi Quản trò xác nhận.',
      DAY: 'Cho người chơi thảo luận, sau đó mở biểu quyết khi sẵn sàng.',
      VOTE: 'Nhập kết quả cuối cùng của bàn chơi.',
      VOTE_RESOLUTION: 'Kiểm tra người bị loại hoặc yêu cầu biểu quyết lại.',
      HUNTER_SHOT: 'Chờ Thợ săn chọn mục tiêu, sau đó xác nhận phát bắn.',
      GAME_OVER: 'Điều kiện thắng đã được kiểm tra tự động.',
      SETUP: '',
      ROLE_REVEAL: '',
      READY_CHECK: '',
    } as const
  )[phase]
}

export function playerWaitingTitle(phase: PlayerGameView['phase']) {
  if (phase === 'DAY') return 'Cùng bàn thảo luận'
  if (phase === 'VOTE') return 'Bàn đang biểu quyết'
  if (phase === 'NIGHT_RESOLUTION' || phase === 'VOTE_RESOLUTION') {
    return 'Chờ Quản trò xác nhận'
  }
  if (phase === 'HUNTER_SHOT') return 'Thợ săn đang chọn mục tiêu'
  return 'Giữ im lặng và chờ lượt'
}

export function actionSummary(
  action: NonNullable<GameState['pendingNightAction']>,
  names: Map<string, string>,
) {
  if (action.type === 'WITCH_ACTION') {
    const choices = [
      action.heal ? 'dùng bình cứu' : null,
      action.poisonTargetId
        ? `đầu độc ${names.get(action.poisonTargetId) ?? 'người chơi'}`
        : null,
    ].filter(Boolean)
    return `${names.get(action.actorId) ?? 'Phù thủy'}: ${choices.join(' và ') || 'không dùng bình nào'}`
  }
  if (action.type === 'WEREWOLF_ATTACK' && action.enhanced) {
    return `${names.get(action.actorId) ?? 'Sói Đầu Đàn'} chọn ${names.get(action.targetId) ?? 'người chơi'} bằng Cắn xuyên bảo vệ`
  }
  return `${names.get(action.actorId) ?? 'Người chơi'} chọn ${names.get(action.targetId) ?? 'người chơi'}`
}
