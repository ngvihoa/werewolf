import type { Role } from '#/game/domain'

export type RoleFaction = 'VILLAGE' | 'WEREWOLF' | 'WILDCARD'

export type RoleGuide = {
  faction: RoleFaction
  role: Role
  strategy: string
  timing: string
  victory: string
}

export const ROLE_FACTIONS: Record<
  RoleFaction,
  { label: string; shortLabel: string }
> = {
  VILLAGE: { label: 'Phe Dân làng', shortLabel: 'Phe Làng' },
  WEREWOLF: { label: 'Phe Ma sói', shortLabel: 'Phe Sói' },
  WILDCARD: { label: 'Vai trò biến số', shortLabel: 'Biến số' },
}

export const ROLE_GUIDES: readonly RoleGuide[] = [
  {
    role: 'VILLAGER',
    faction: 'VILLAGE',
    timing: 'Ban ngày',
    strategy:
      'Lắng nghe mâu thuẫn, ghi nhớ lá phiếu và buộc mọi người giải thích lựa chọn của họ.',
    victory: 'Loại hết tất cả Ma sói còn sống.',
  },
  {
    role: 'SEER',
    faction: 'VILLAGE',
    timing: 'Mỗi đêm',
    strategy:
      'Tích lũy kết quả soi nhưng đừng lộ diện quá sớm; bạn chỉ biết phe, không biết chính xác vai.',
    victory: 'Giúp phe Làng loại hết Ma sói.',
  },
  {
    role: 'WITCH',
    faction: 'VILLAGE',
    timing: 'Mỗi đêm',
    strategy:
      'Mỗi bình chỉ có một lần dùng. Bạn có thể cứu chính mình và dùng cả hai bình trong cùng một đêm.',
    victory: 'Giúp phe Làng loại hết Ma sói.',
  },
  {
    role: 'PROTECTOR',
    faction: 'VILLAGE',
    timing: 'Mỗi đêm',
    strategy:
      'Có thể bảo vệ bản thân, nhưng không được chọn cùng một người ở hai đêm liên tiếp.',
    victory: 'Giúp phe Làng loại hết Ma sói.',
  },
  {
    role: 'HUNTER',
    faction: 'VILLAGE',
    timing: 'Mỗi đêm · Khi chết',
    strategy:
      'Đánh dấu mục tiêu trước mỗi đêm. Nếu bị loại, phát súng cuối cùng có thể đổi toàn bộ cục diện.',
    victory: 'Giúp phe Làng loại hết Ma sói.',
  },
  {
    role: 'ELDER',
    faction: 'VILLAGE',
    timing: 'Nội tại',
    strategy:
      'Sống sót qua lần cắn đầu tiên của Sói. Bình độc, biểu quyết và nguồn sát thương khác vẫn chí mạng.',
    victory: 'Giúp phe Làng loại hết Ma sói.',
  },
  {
    role: 'CUPID',
    faction: 'VILLAGE',
    timing: 'Đêm đầu tiên',
    strategy:
      'Ghép hai người khác thành tình nhân. Một người chết, người còn lại cũng chết vì đau khổ.',
    victory: 'Phe Làng thắng; đôi tình nhân khác phe có thể thắng riêng.',
  },
  {
    role: 'COURTESAN',
    faction: 'VILLAGE',
    timing: 'Mỗi đêm',
    strategy:
      'Rời nhà để tránh đòn cắn, nhưng sẽ chết nếu ghé Sói hoặc ghé đúng nạn nhân bị Sói hạ.',
    victory: 'Giúp phe Làng loại hết Ma sói.',
  },
  {
    role: 'WEREWOLF',
    faction: 'WEREWOLF',
    timing: 'Mỗi đêm',
    strategy:
      'Phối hợp cùng đàn chọn một mục tiêu ngoài phe Sói, rồi hòa vào cuộc tranh luận khi trời sáng.',
    victory: 'Phe Sói đạt số lượng ngang hoặc hơn những người còn lại.',
  },
  {
    role: 'ALPHA_WEREWOLF',
    faction: 'WEREWOLF',
    timing: 'Mỗi đêm · Một lần cường hóa',
    strategy:
      'Dành cú cắn cường hóa cho thời điểm quan trọng; nó xuyên qua lớp bảo hộ của Bảo vệ.',
    victory: 'Phe Sói đạt số lượng ngang hoặc hơn những người còn lại.',
  },
  {
    role: 'WHITE_WOLF',
    faction: 'WEREWOLF',
    timing: 'Mỗi đêm · Một lần săn riêng',
    strategy:
      'Đi cùng đàn Sói nhưng có thể bí mật hạ một Sói khác đúng một lần. Đừng để đồng đội đọc ra ý đồ.',
    victory: 'Trở thành người sống sót duy nhất.',
  },
  {
    role: 'HYBRID_WOLF',
    faction: 'WILDCARD',
    timing: 'Nội tại chuyển phe',
    strategy:
      'Khởi đầu ở phe Làng. Lần bị Sói cắn thành công đầu tiên không giết bạn mà biến bạn thành Sói.',
    victory: 'Theo phe hiện tại của bạn khi ván kết thúc.',
  },
  {
    role: 'FOOL',
    faction: 'WILDCARD',
    timing: 'Ban ngày',
    strategy:
      'Khiến cả làng nghi ngờ vừa đủ để bị biểu quyết loại, nhưng đừng để Sói giết bạn trong đêm.',
    victory: 'Thắng một mình khi bị loại bởi biểu quyết đã xác nhận.',
  },
  {
    role: 'PIPER',
    faction: 'WILDCARD',
    timing: 'Mỗi đêm',
    strategy:
      'Mỗi đêm mê hoặc một người mới và giữ kín tiến độ trước cả Làng lẫn Sói.',
    victory: 'Mọi người còn sống khác đều đã bị bạn mê hoặc.',
  },
]
