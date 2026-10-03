import type { ClassValue } from 'clsx'

import { twMerge } from 'tailwind-merge'
import { clsx } from 'clsx'

/**
 * Gộp className có điều kiện (clsx) và resolve xung đột Tailwind
 * (twMerge — class sau trong danh sách thắng, thay vì phụ thuộc thứ tự
 * trong CSS generated). Dùng cho mọi component nhận `className` từ ngoài
 * hoặc ghép class theo variant/điều kiện.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
