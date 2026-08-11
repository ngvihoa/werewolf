export function SelectField({
  id,
  label,
  name,
  value,
  options,
  emptyLabel,
  required = false,
  disabled = false,
  onChange,
}: {
  id: string
  label: string
  name: string
  value: string
  options: { id: string; displayName: string }[]
  emptyLabel: string
  required?: boolean
  disabled?: boolean
  onChange: (value: string) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-base/7 text-stone-400 sm:text-sm/6" htmlFor={id}>
        {label}
      </label>
      <div className="inline-grid grid-cols-[1fr_--spacing(8)]">
        <select
          className="col-span-full row-start-1 appearance-none rounded-md bg-stone-950 px-3 py-2.5 pr-8 text-base text-stone-100 ring-1 ring-white/10 focus-visible:-outline-offset-1 focus-visible:outline-2 focus-visible:outline-red-500 disabled:opacity-40 sm:py-2 sm:text-sm"
          id={id}
          name={name}
          value={value}
          required={required}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">{emptyLabel}</option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.displayName}
            </option>
          ))}
        </select>
        <svg
          aria-hidden="true"
          className="pointer-events-none col-start-2 row-start-1 place-self-center text-stone-500"
          fill="none"
          height="5"
          viewBox="0 0 8 5"
          width="8"
        >
          <path d="M.5.5 4 4 7.5.5" stroke="currentColor" />
        </svg>
      </div>
    </div>
  )
}
