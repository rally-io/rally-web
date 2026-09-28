import { cn } from '@/lib/utils'

export function inputClass(hasError: boolean): string {
  return cn(
    // 16px on phones: iOS zooms the page into any input under 16px on focus and
    // leaves it zoomed. Same fix ui/input.tsx got on 2026-09-17.
    'w-full rounded-md bg-rally-surface-2 border text-rally-text px-3 py-3 text-base sm:text-sm',
    'placeholder:text-rally-text-muted focus:outline-none focus:ring-4 focus:ring-rally-accent-dim transition-colors',
    hasError ? 'border-rally-error' : 'border-rally-border focus:border-rally-accent',
  )
}
