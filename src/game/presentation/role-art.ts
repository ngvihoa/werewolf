import type { Role } from '../domain'

/**
 * Ảnh chibi của vai (WebP 512², nền trong suốt) — bộ duy nhất dùng cho cả
 * thẻ vai lẫn avatar token. Đổi bộ art lần sau chỉ cần sửa hàm này.
 */
export function roleArtUrl(role: Role): string {
  return `/role/chibi/${role.toLowerCase()}.webp`
}
