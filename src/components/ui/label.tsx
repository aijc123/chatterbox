import type { LabelHTMLAttributes } from 'preact'

import { cn } from '../../lib/cn'

type LabelBase = Omit<LabelHTMLAttributes<HTMLLabelElement>, 'class' | 'className'>

export interface LabelProps extends LabelBase {
  disabled?: boolean
  className?: string
}

export function Label({ disabled, htmlFor, for: forProp, className, children, ...props }: LabelProps) {
  return (
    <label
      htmlFor={htmlFor ?? forProp}
      class={cn(
        'lc-select-none lc-leading-none lc-shrink-0',
        disabled && '!lc-cursor-not-allowed lc-text-ga4',
        className
      )}
      {...props}
    >
      {children}
    </label>
  )
}
