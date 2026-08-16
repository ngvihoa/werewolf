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
    <div className="rounded-lg bg-red-950/30 p-5 ring-1 ring-red-400/20">
      <p className="font-mono text-sm tracking-wide text-red-300 uppercase">
        {revealed ? label : hiddenLabel}
      </p>
      {revealed ? (
        <p className="pt-3 text-xl font-medium text-stone-50">{value}</p>
      ) : (
        <p className="pt-3 text-sm/6 text-stone-400">
          Chỉ mở khi không có người khác nhìn màn hình.
        </p>
      )}
      {concealable ? (
        <button
          aria-expanded={revealed}
          className="mt-4 rounded-md bg-white/5 px-3 py-2 text-sm font-medium text-stone-200 ring-1 ring-white/10 transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
          type="button"
          onClick={() => setRevealed((current) => !current)}
        >
          {revealed ? 'Ẩn kết quả' : 'Xem kết quả'}
        </button>
      ) : null}
    </div>
  )
}
