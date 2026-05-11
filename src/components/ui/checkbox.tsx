import type { ComponentChildren, InputHTMLAttributes } from 'preact'

import { cn } from '../../lib/cn'
import { Label } from './label'

type CheckboxBase = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'children' | 'class' | 'className'>

export interface CheckboxProps extends CheckboxBase {
  label?: ComponentChildren
  className?: string
}

export function Checkbox({ label, id, disabled, className, ...props }: CheckboxProps) {
  const input = (
    <input
      type='checkbox'
      id={id}
      disabled={disabled}
      class={cn(
        'lc-accent-brand lc-m-0 lc-cursor-pointer disabled:lc-cursor-not-allowed',
        'lc-border-none focus-visible:lc-outline focus-visible:lc-outline-2 focus-visible:lc-outline-solid focus-visible:lc-outline-brand focus-visible:lc-outline-offset-1',
        className
      )}
      {...props}
    />
  )

  if (label === undefined || label === null || label === false) return input

  return (
    <Label
      htmlFor={id}
      disabled={Boolean(disabled)}
      className='lc-inline-flex lc-items-center lc-gap-1 lc-cursor-pointer'
    >
      {input}
      {label}
    </Label>
  )
}
