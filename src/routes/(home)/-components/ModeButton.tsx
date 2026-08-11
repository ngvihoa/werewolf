import type { ReactNode } from 'react'

export function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      className={`border-b-2 px-2 py-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-red-700 ${active ? 'border-red-700 text-stone-950' : 'border-transparent text-stone-500 hover:text-stone-800'}`}
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  )
}
