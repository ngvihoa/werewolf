import type { PlayerGameView } from '#/game/projections/model'
import type { GameState } from '#/game/orchestration/model'
import type { Role } from '../domain'

export function phaseLabel(phase: PlayerGameView['phase']) {
  return {
    NIGHT: 'Ban đêm',
    NIGHT_RESOLUTION: 'Kết thúc đêm',
    DAY: 'Ban ngày',
    VOTE: 'Biểu quyết',
    VOTE_RESOLUTION: 'Kết quả biểu quyết',
    HUNTER_SHOT: 'Phát súng cuối cùng',
    GAME_OVER: 'Kết thúc ván',
    LOBBY: 'Sảnh',
    SETUP: 'Chuẩn bị',
    ROLE_REVEAL: 'Xem vai',
    READY_CHECK: 'Sẵn sàng',
  }[phase]
}

export function queueStepLabel(step: GameState['queue'][number]['step']) {
  return {
    HUNTER_MARK: 'Thợ săn chọn mục tiêu',
    PROTECTOR_PROTECT: 'Bảo vệ chọn người bảo hộ',
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
    PROTECTOR: 'Bảo vệ',
    HUNTER: 'Thợ săn',
  }[role]
}

export function roleDescription(role: Role) {
  return {
    VILLAGER: 'Quan sát, thảo luận và tìm ra Ma sói vào ban ngày.',
    WEREWOLF: 'Mỗi đêm chọn một người chơi để tấn công.',
    SEER: 'Mỗi đêm soi một người để biết họ thuộc phe nào.',
    WITCH: 'Bạn có một bình cứu và một bình độc dùng trong cả ván.',
    PROTECTOR:
      'Mỗi đêm bảo hộ một người khỏi Ma sói, không chọn cùng một người hai đêm liên tiếp.',
    HUNTER:
      'Mỗi đêm chọn trước một mục tiêu; nếu chết trong đêm, bạn kéo người đó theo cùng.',
  }[role]
}
