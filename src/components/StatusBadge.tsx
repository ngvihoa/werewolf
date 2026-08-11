export function StatusBadge({
  ready,
  assigned,
}: {
  ready: boolean
  assigned: boolean
}) {
  const label = !assigned ? 'Đang chờ' : ready ? 'Sẵn sàng' : 'Xem vai'
  return (
    <span
      className={`rounded-full px-2.5 py-1 font-mono text-sm ring-1 ${
        ready && assigned
          ? 'bg-emerald-400/10 text-emerald-300 ring-emerald-400/20'
          : 'bg-white/5 text-stone-400 ring-white/10'
      }`}
    >
      {label}
    </span>
  )
}
