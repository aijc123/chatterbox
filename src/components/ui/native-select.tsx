import type { SelectHTMLAttributes } from 'preact'

import { cn } from '../../lib/cn'

type NativeSelectBase = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size' | 'class' | 'className'>

export interface NativeSelectProps extends NativeSelectBase {
  className?: string
}

export function NativeSelect({ disabled, className, children, ...props }: NativeSelectProps) {
  return (
    <select
      disabled={disabled}
      class={cn(
        'lc-box-border lc-pr-1 lc-pl-0.5 lc-py-px',
        'lc-border lc-border-solid lc-border-ga4 lc-rounded',
        'lc-bg-bg1 lc-text-inherit lc-outline-none lc-leading-none lc-min-h-5',
        'lc-cursor-pointer disabled:lc-cursor-not-allowed disabled:lc-opacity-60',
        'lc-transition focus:lc-border-brand',
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
}
