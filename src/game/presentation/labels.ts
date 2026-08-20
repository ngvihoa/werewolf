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
    PIPER_CHARM: 'Người thổi sáo mê hoặc',
    CUPID_LINK: 'Thần tình yêu ghép đôi',
    COURTESAN_VISIT: 'Kỹ nữ đến thăm',
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
    ALPHA_WEREWOLF: 'Sói Đầu Đàn',
    SEER: 'Tiên tri',
    WITCH: 'Phù thủy',
    PROTECTOR: 'Bảo vệ',
    HUNTER: 'Thợ săn',
    ELDER: 'Già làng',
    FOOL: 'Thằng ngốc',
    PIPER: 'Người thổi sáo',
    CUPID: 'Thần tình yêu',
    COURTESAN: 'Kỹ nữ',
  }[role]
}

export function roleDescription(role: Role) {
  return {
    VILLAGER: 'Quan sát, thảo luận và tìm ra Ma sói vào ban ngày.',
    WEREWOLF: 'Mỗi đêm chọn một người chơi để tấn công.',
    ALPHA_WEREWOLF: 'Cùng đàn Sói tấn công và có một lần cắn xuyên qua Bảo vệ.',
    SEER: 'Mỗi đêm soi một người để biết họ thuộc phe nào.',
    WITCH: 'Bạn có một bình cứu và một bình độc dùng trong cả ván.',
    PROTECTOR:
      'Mỗi đêm bảo hộ một người khỏi Ma sói, không chọn cùng một người hai đêm liên tiếp.',
    HUNTER:
      'Mỗi đêm chọn trước một mục tiêu; nếu chết trong đêm, bạn kéo người đó theo cùng.',
    ELDER:
      'Sống sót qua lần cắn chí mạng đầu tiên của Ma sói; những nguồn sát thương khác vẫn hạ gục bạn ngay.',
    FOOL: 'Thắng một mình nếu bị loại bởi biểu quyết đã được Quản trò xác nhận.',
    PIPER:
      'Mỗi đêm mê hoặc một người mới; thắng khi mọi người còn sống khác đều đã bị mê hoặc.',
    CUPID:
      'Đêm đầu tiên ghép hai người khác thành tình nhân; một người chết thì người kia chết theo.',
    COURTESAN:
      'Mỗi đêm đến thăm một người khác; tránh đòn cắn tại nhà nhưng gặp nguy hiểm nếu đến nơi Sói xuất hiện.',
  }[role]
}
