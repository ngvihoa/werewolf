import type { ReactNode } from 'react'

import { Loader2 } from 'lucide-react'
import { cn } from '#/lib/cn'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'md' | 'lg'

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-danger-strong text-white ring-1 ring-danger-strong hover:bg-danger hover:ring-danger',
  secondary:
    'bg-surface text-ink ring-1 ring-line-strong hover:bg-surface-raised',
  ghost: 'text-ink-muted hover:bg-surface hover:text-ink',
  danger:
    'text-accent ring-1 ring-line-strong hover:bg-danger/10 hover:ring-danger/40',
}

const SIZE_CLASSES: Record<ButtonSize, string> = {
  md: 'min-h-11 px-4 text-sm',
  lg: 'min-h-14 px-5 text-base',
}

export function Button({
  children,
  variant = 'secondary',
  size = 'md',
  pending = false,
  pendingLabel = 'Đang cập nhật...',
  fullWidth = false,
  disabled = false,
  type = 'button',
  onClick,
  className = '',
}: {
  children: ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  pending?: boolean
  pendingLabel?: string
  fullWidth?: boolean
  disabled?: boolean
  type?: 'button' | 'submit'
  onClick?: () => void
  className?: string
}) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 disabled:cursor-not-allowed disabled:opacity-40',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        fullWidth && 'w-full',
        className,
      )}
      type={type}
      disabled={pending || disabled}
      onClick={onClick}
    >
      {pending ? (
        <Loader2
          aria-hidden="true"
          className="size-4 animate-spin motion-reduce:animate-none"
        />
      ) : null}
      {pending ? pendingLabel : children}
    </button>
  )
}
