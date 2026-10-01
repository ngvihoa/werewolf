import type { ReactNode } from 'react'

import { Button } from '#/components/ui/Button'

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
    <Button
      variant={primary ? 'primary' : 'secondary'}
      size={primary ? 'lg' : 'md'}
      fullWidth={primary}
      pending={pending}
      disabled={disabled}
      type={type}
      onClick={onClick}
    >
      {children}
    </Button>
  )
}
