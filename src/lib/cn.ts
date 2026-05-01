import { type ClassValue, clsx } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

const twMerge = extendTailwindMerge({
  prefix: 'lc-',
})

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
