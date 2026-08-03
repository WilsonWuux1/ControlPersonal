import type { ButtonHTMLAttributes, ReactNode } from 'react'
import clsx from 'clsx'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  icon?: ReactNode
}

export function Button({ className, variant = 'primary', icon, children, type = 'button', ...props }: ButtonProps) {
  return (
    <button type={type} className={clsx('button', `button-${variant}`, className)} {...props}>
      {icon}
      <span>{children}</span>
    </button>
  )
}
