import type { ReactNode } from 'react'

export function PrimaryButton({
  pending,
  children,
}: {
  pending: boolean
  children: ReactNode
}) {
  return (
    <button
      className="rounded-md bg-red-700 px-3 py-2.5 text-sm font-medium text-white ring-1 ring-red-700 transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 sm:py-2"
      type="submit"
      disabled={pending}
    >
      {pending ? 'Đang xử lý...' : children}
    </button>
  )
}
