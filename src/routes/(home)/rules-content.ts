import type { RoleFaction } from './-components/role-guide-data'
import type { LucideIcon } from 'lucide-react'

import { MoonStar, Sun, Users, Vote } from 'lucide-react'

export type RoleFilter = 'ALL' | RoleFaction

export type Phase = {
  description: string
  icon: LucideIcon
  number: string
  title: string
}

export const PHASES: readonly Phase[] = [
  {
    number: '01',
    icon: Users,
    title: 'Chuẩn bị',
    description:
      'Tạo phòng 5–15 người, phân vai bí mật và chỉ bắt đầu khi mọi người đã xem vai, sẵn sàng.',
  },
  {
    number: '02',
    icon: MoonStar,
    title: 'Ban đêm',
    description:
      'Các vai thức giấc theo hàng đợi. Mỗi hành động riêng được gửi tới Quản trò để xác nhận.',
  },
  {
    number: '03',
    icon: Sun,
    title: 'Ban ngày',
    description:
      'Kết quả đêm được công bố nhưng vai người chết vẫn bí mật. Cả làng quan sát và tranh luận.',
  },
  {
    number: '04',
    icon: Vote,
    title: 'Biểu quyết',
    description:
      'Cả bàn chọn một người để loại. Hòa lần đầu sẽ bỏ phiếu lại; hòa lần hai không ai bị loại.',
  },
]

export const ROLE_FILTERS: readonly { label: string; value: RoleFilter }[] = [
  { value: 'ALL', label: 'Tất cả 14 vai' },
  { value: 'VILLAGE', label: 'Phe Làng' },
  { value: 'WEREWOLF', label: 'Phe Sói' },
  { value: 'WILDCARD', label: 'Biến số' },
]

export const NIGHT_ORDER = [
  'Thần tình yêu',
  'Thợ săn',
  'Bảo vệ',
  'Tiên tri',
  'Kỹ nữ',
  'Ma sói',
  'Sói Trắng',
  'Phù thủy',
  'Người thổi sáo',
] as const

export const VICTORY_RULES = [
  {
    label: 'Phe Làng',
    description: 'Không còn bất kỳ Ma sói nào sống sót.',
    className: 'text-emerald-300',
  },
  {
    label: 'Phe Sói',
    description:
      'Đàn Sói, không tính Sói Trắng, đạt ngang hoặc hơn tất cả người còn lại.',
    className: 'text-red-300',
  },
  {
    label: 'Thằng ngốc',
    description: 'Bị cả làng biểu quyết loại khỏi ván.',
    className: 'text-amber-300',
  },
  {
    label: 'Người thổi sáo',
    description: 'Mọi người còn sống khác đều đã bị mê hoặc.',
    className: 'text-violet-300',
  },
  {
    label: 'Sói Trắng / Tình nhân',
    description: 'Sống một mình / đôi khác phe là hai người cuối cùng.',
    className: 'text-sky-300',
  },
] as const

// Câu hỏi thường gặp: hiển thị ở trang luật chơi và xuất ra JSON-LD FAQPage
// (Phase 13 — nội dung JSON-LD phải khớp nội dung hiển thị).
export const FAQS: readonly { answer: string; question: string }[] = [
  {
    question: 'Ma Sói là trò chơi gì?',
    answer:
      'Ma Sói (Werewolf) là trò chơi nhóm nhiều người: phe Ma Sói hoạt động bí mật vào ban đêm, phe Làng quan sát, tranh luận và biểu quyết loại nghi phạm vào ban ngày cho đến khi một phe thắng.',
  },
  {
    question: 'Moonveil cần bao nhiêu người chơi?',
    answer:
      'Một ván Moonveil có từ 5 đến 15 người chơi, mỗi người dùng một thiết bị (thường là điện thoại) để nhận vai và gửi hành động bí mật.',
  },
  {
    question: 'Chơi Moonveil có cần Quản trò không?',
    answer:
      'Không bắt buộc. Ở chế độ tự chơi, hệ thống điều phối toàn bộ lượt đêm và xác nhận hành động thay Quản trò. Nếu chơi tại bàn, Quản trò dùng màn hình riêng để dẫn dắt và quyết định từng bước.',
  },
  {
    question: 'Mời bạn bè vào phòng bằng cách nào?',
    answer:
      'Sau khi tạo phòng, bạn chia sẻ mã phòng gồm 6 ký tự. Mỗi người vào Moonveil bằng điện thoại, nhập mã và nhận phiên bí mật riêng của mình.',
  },
  {
    question: 'Moonveil có bao nhiêu vai trò?',
    answer:
      'Moonveil hiện có 14 vai trò chia ba nhóm: Phe Làng, Phe Sói và Biến số. Danh sách vai trò đầy đủ nằm ngay trên trang này.',
  },
] as const
