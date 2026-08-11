import type { ReactNode } from 'react'

export function CommandButton({
  children,
  pending,
  primary = false,
  disabled = false,
  type = 'button',
  onClick,
}: {
  children: ReactNode
  pending: boolean
  primary?: boolean
  disabled?: boolean
  type?: 'button' | 'submit'
  onClick?: () => void
}) {
  return (
    <button
      className={
        primary
          ? 'rounded-md bg-red-700 px-3 py-2 text-sm font-medium text-white ring-1 ring-red-700 hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500'
          : 'rounded-md bg-white/5 px-3 py-2 text-sm font-medium text-stone-200 ring-1 ring-white/10 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500'
      }
      type={type}
      disabled={pending || disabled}
      onClick={onClick}
    >
      {pending ? 'Đang cập nhật...' : children}
    </button>
  )
}
