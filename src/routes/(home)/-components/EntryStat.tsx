export function EntryStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 px-4 first:pl-0 last:pr-0">
      <p className="font-mono text-lg tabular-nums text-stone-200">{value}</p>
      <p className="truncate text-sm text-stone-500">{label}</p>
    </div>
  )
}
