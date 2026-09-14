import { cn } from '@/lib/utils'

export function RallyWordmark({ className }: { className?: string }) {
  return (
    <img
      src="/rally-logo.jpg"
      alt="Rally"
      className={cn('h-12 sm:h-14 w-auto rounded-lg shadow-md', className)}
    />
  )
}
