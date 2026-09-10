import { cn } from '@/lib/utils'

export function inputClass(hasError: boolean): string {
  return cn(
    'w-full rounded-md bg-rally-surface-2 border text-rally-text px-3 py-3',
    'placeholder:text-rally-text-muted focus:outline-none focus:ring-4 focus:ring-rally-accent-dim transition-colors',
    hasError ? 'border-rally-error' : 'border-rally-border focus:border-rally-accent',
  )
}
