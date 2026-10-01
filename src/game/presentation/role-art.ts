import type { Role } from '../domain'

/**
 * Ảnh chibi của vai (WebP 512², nền trong suốt) — bộ duy nhất dùng cho cả
 * thẻ vai lẫn avatar token. Đổi bộ art lần sau chỉ cần sửa hàm này.
 */
export function roleArtUrl(role: Role): string {
  return `/role/chibi/${role.toLowerCase()}.webp`
}

/*
 * Màu nhận diện từng vai — lấy theo tông chủ đạo của ảnh chibi, gom nhóm
 * chùng theo phe (Sói dải đỏ, Làng dải lạnh, trung lập dải ấm/tím). Dùng
 * làm lớp màu mờ sau nhân vật trên mặt ngửa của lá bài.
 */
const ROLE_ACCENTS: Record<Role, string> = {
  VILLAGER: '#8ab87a',
  SEER: '#9a8fd6',
  WITCH: '#b78fd0',
  PROTECTOR: '#7aa8c9',
  HUNTER: '#a8b86a',
  ELDER: '#8fc0ad',
  WEREWOLF: '#d97a6a',
  ALPHA_WEREWOLF: '#d05a52',
  WHITE_WOLF: '#9ab4c9',
  HYBRID_WOLF: '#c98fb8',
  FOOL: '#e0c26a',
  PIPER: '#d98fb0',
  CUPID: '#e89aae',
  COURTESAN: '#d97a8e',
}

export function roleAccentColor(role: Role): string {
  return ROLE_ACCENTS[role]
}
