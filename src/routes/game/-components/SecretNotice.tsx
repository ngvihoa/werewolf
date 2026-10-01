import { useState } from 'react'

export function SecretNotice({
  label,
  value,
  concealable = false,
  hiddenLabel = 'Kết quả soi được giữ kín',
}: {
  label: string
  value: string
  concealable?: boolean
  hiddenLabel?: string
}) {
  const [revealed, setRevealed] = useState(!concealable)

  return (
    <div className="rounded-2xl bg-danger/10 p-5 ring-1 ring-danger/20">
      <p className="font-mono text-sm tracking-wide text-accent uppercase">
        {revealed ? label : hiddenLabel}
      </p>
      {revealed ? (
        <p className="pt-3 text-xl font-medium text-ink">{value}</p>
      ) : (
        <p className="pt-3 text-sm/6 text-ink-muted">
          Chỉ mở khi không có người khác nhìn màn hình.
        </p>
      )}
      {concealable ? (
        <button
          aria-expanded={revealed}
          className="mt-4 min-h-11 rounded-xl bg-surface px-3 py-2 text-sm font-medium text-ink ring-1 ring-line-strong transition-colors hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
          type="button"
          onClick={() => setRevealed((current) => !current)}
        >
          {revealed ? 'Ẩn kết quả' : 'Xem kết quả'}
        </button>
      ) : null}
    </div>
  )
}
