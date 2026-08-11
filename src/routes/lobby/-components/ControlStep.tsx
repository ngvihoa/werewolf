export function ControlStep({
  done,
  number,
  label,
}: {
  done: boolean
  number: string
  label: string
}) {
  return (
    <li className="grid grid-cols-[auto_1fr_auto] items-center gap-3 py-4 first:pt-0 last:pb-0">
      <span className="font-mono text-sm text-stone-600">{number}</span>
      <p className="text-base text-stone-300 sm:text-sm">{label}</p>
      <span
        className={`size-2 rounded-full ${done ? 'bg-emerald-400' : 'bg-stone-700'}`}
      />
    </li>
  )
}
