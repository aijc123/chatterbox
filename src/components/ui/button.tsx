import type { ButtonHTMLAttributes } from 'preact'

import { cn } from '../../lib/cn'

type ButtonVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'link'
type ButtonSize = 'sm' | 'default' | 'lg' | 'icon'

type ButtonBase = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'size' | 'class' | 'className'>

export interface ButtonProps extends ButtonBase {
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
}

const BASE_CLASS = [
  'lc-inline-flex lc-items-center lc-justify-center',
  'lc-gap-1 lc-rounded',
  'lc-cursor-pointer disabled:lc-cursor-not-allowed disabled:lc-opacity-50',
  'lc-leading-[1.2] lc-select-none lc-whitespace-nowrap lc-box-border',
  'lc-transition [&:not(:disabled):hover]:lc-brightness-[.96] [&:not(:disabled):active]:lc-brightness-[.9]',
].join(' ')

const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: 'lc-px-1.5 lc-py-px lc-min-h-[18px]',
  default: 'lc-px-2.5 lc-py-1 lc-min-h-6',
  lg: 'lc-px-3.5 lc-py-1.5 lc-min-h-7',
  icon: 'lc-p-0 lc-w-6 lc-h-6',
}

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  default: 'lc-bg-brand lc-text-white lc-border lc-border-solid lc-border-brand',
  secondary: 'lc-bg-ga1s lc-text-inherit lc-border lc-border-solid lc-border-ga4',
  destructive: 'lc-bg-transparent lc-text-danger lc-border lc-border-solid lc-border-danger',
  outline: 'lc-bg-transparent lc-text-inherit lc-border lc-border-solid lc-border-ga4',
  ghost: 'lc-bg-transparent lc-text-inherit lc-border lc-border-solid lc-border-transparent',
  link: 'lc-bg-transparent lc-text-link lc-border lc-border-solid lc-border-transparent lc-underline lc-underline-offset-2 lc-p-0 lc-min-h-[auto]',
}

export function Button({
  variant = 'default',
  size = 'default',
  type = 'button',
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      class={cn(BASE_CLASS, SIZE_CLASS[size], VARIANT_CLASS[variant], className)}
      data-variant={variant}
      data-size={size}
      {...props}
    >
      {children}
    </button>
  )
}
