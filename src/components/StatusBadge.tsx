export function StatusBadge({
  ready,
  assigned,
  active = false,
}: {
  ready: boolean
  assigned: boolean
  active?: boolean
}) {
  const label = active
    ? 'Đang hành động'
    : !assigned
      ? 'Đang chờ'
      : ready
        ? 'Sẵn sàng'
        : 'Xem vai'
  return (
    <span
      className={`rounded-full px-2.5 py-1 font-mono text-sm ring-1 ${
        active
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
