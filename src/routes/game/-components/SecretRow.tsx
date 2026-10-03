import { useState } from 'react'
import { Eye } from 'lucide-react'
import { cn } from '#/lib/cn'

/**
 * Một kết quả riêng trong khối lịch sử — dạng dòng thay vì card: nhãn luôn
 * hiện (tra lại được "đã soi ai"), giá trị giữ kín tới khi chạm vào dòng.
 * Giá trị kín KHÔNG render vào DOM (chống nhìn trộm + chống đọc devtools).
 * Cả dòng là touch target; màu giá trị do caller chọn theo ngữ nghĩa.
 */
export function SecretRow({
  label,
  value,
  valueTone = 'neutral',
}: {
  label: string
  value: string
  valueTone?: 'neutral' | 'danger' | 'success'
}) {
  const [revealed, setRevealed] = useState(false)
  return (
    <button
      aria-pressed={revealed}
      className="-mx-2 flex min-h-11 w-[calc(100%+1rem)] items-center justify-between gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
      type="button"
      onClick={() => setRevealed((current) => !current)}
    >
      <span className="min-w-0 flex-1 truncate text-sm/6 text-ink-muted">
        {label}
      </span>
      {revealed ? (
        <span
          className={cn(
            'shrink-0 max-w-[55%] text-right text-sm font-semibold',
            valueTone === 'danger' && 'text-danger',
            valueTone === 'success' && 'text-success',
            valueTone === 'neutral' && 'text-ink',
          )}
        >
          {value}
        </span>
      ) : (
        <>
          <Eye aria-hidden="true" className="size-4 shrink-0 text-ink-subtle" />
          <span className="sr-only">Đang giữ kín — chạm để mở</span>
        </>
      )}
    </button>
  )
}
