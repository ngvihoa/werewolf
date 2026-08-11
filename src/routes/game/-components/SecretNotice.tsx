export function SecretNotice({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-lg bg-red-950/30 p-5 ring-1 ring-red-400/20">
      <p className="font-mono text-sm tracking-wide text-red-300 uppercase">
        {label}
      </p>
      <p className="pt-3 text-xl font-medium text-stone-50">{value}</p>
    </div>
  )
}
