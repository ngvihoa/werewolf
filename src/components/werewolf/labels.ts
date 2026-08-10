import type { PlayerGameView } from '#/game/projections/model'
import type { GameState } from '#/game/orchestration/model'

type Role = 'VILLAGER' | 'WEREWOLF' | 'SEER' | 'WITCH'

export function phaseLabel(phase: PlayerGameView['phase']) {
  return {
    NIGHT: 'Ban đêm',
    NIGHT_RESOLUTION: 'Kết thúc đêm',
    DAY: 'Ban ngày',
    VOTE: 'Biểu quyết',
    VOTE_RESOLUTION: 'Kết quả biểu quyết',
    GAME_OVER: 'Kết thúc ván',
    LOBBY: 'Sảnh',
    SETUP: 'Chuẩn bị',
    ROLE_REVEAL: 'Xem vai',
    READY_CHECK: 'Sẵn sàng',
  }[phase]
}

export function queueStepLabel(step: GameState['queue'][number]['step']) {
  return {
    SEER_INSPECT: 'Tiên tri soi',
    WEREWOLF_ATTACK: 'Ma sói tấn công',
    WITCH_ACTION: 'Phù thủy hành động',
  }[step]
}

export function queueStatusLabel(status: GameState['queue'][number]['status']) {
  return {
    PENDING: 'Chờ',
    ACTIVE: 'Đang gọi',
    WAITING_MODERATOR_CONFIRMATION: 'Chờ duyệt',
    COMPLETED: 'Xong',
    SKIPPED: 'Bỏ qua',
  }[status]
}

export function roleLabel(role: Role) {
  return {
    VILLAGER: 'Dân làng',
    WEREWOLF: 'Ma sói',
    SEER: 'Tiên tri',
    WITCH: 'Phù thủy',
  }[role]
}

export function roleDescription(role: Role) {
  return {
    VILLAGER: 'Quan sát, thảo luận và tìm ra Ma sói vào ban ngày.',
    WEREWOLF: 'Mỗi đêm chọn một người chơi để tấn công.',
    SEER: 'Mỗi đêm soi một người để biết họ thuộc phe nào.',
    WITCH: 'Bạn có một bình cứu và một bình độc dùng trong cả ván.',
  }[role]
}
