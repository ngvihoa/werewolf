import type { InputHTMLAttributes } from 'react'

export function TextField({
  id,
  label,
  mono = false,
  ...inputProps
}: {
  id: string
  label: string
  mono?: boolean
} & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-stone-700" htmlFor={id}>
        {label}
      </label>
      <input
        {...inputProps}
        className={`rounded-md bg-white px-3 py-2.5 text-base text-stone-950 shadow-sm ring-1 ring-stone-950/10 placeholder:text-stone-400 focus-visible:-outline-offset-1 focus-visible:outline-2 focus-visible:outline-red-700 sm:py-2 sm:text-sm ${mono ? 'font-mono tracking-[0.16em] uppercase' : ''}`}
        id={id}
        required
      />
    </div>
  )
}
