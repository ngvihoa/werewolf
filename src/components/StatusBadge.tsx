export function StatusBadge({
  ready,
  assigned,
  active = false,
  alive = true,
  showLifeStatus = false,
}: {
  ready: boolean
  assigned: boolean
  active?: boolean
  alive?: boolean
  showLifeStatus?: boolean
}) {
  const label = !alive
    ? 'Đã chết'
    : active
      ? 'Đang hành động'
      : showLifeStatus
        ? 'Còn sống'
        : !assigned
          ? 'Đang chờ'
          : ready
            ? 'Sẵn sàng'
            : 'Xem vai'
  return (
    <span
      className={`rounded-full px-2.5 py-1 font-mono text-sm ring-1 ${
        !alive
          ? 'bg-stone-700/40 text-stone-400 ring-stone-500/20'
          : active
            ? 'bg-red-500/15 text-red-200 ring-red-400/30'
            : ready && assigned
              ? 'bg-emerald-400/10 text-emerald-300 ring-emerald-400/20'
              : 'bg-white/5 text-stone-400 ring-white/10'
      }`}
    >
      {label}
    </span>
  )
}
