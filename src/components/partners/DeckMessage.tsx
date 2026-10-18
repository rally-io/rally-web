import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** A deck state that replaces the cards: closed, unavailable, needs gender, empty, error. */
export function DeckMessage({
  title,
  body,
  testId,
  children,
}: {
  title: string
  body?: string
  testId: string
  children?: ReactNode
}) {
  return (
    <div data-testid={testId} className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <h2 className="font-display text-2xl font-black text-rally-text">{title}</h2>
      {body && <p className="max-w-[320px] text-[15px] text-rally-text-2">{body}</p>}
      {children && <div className="mt-3 flex w-full max-w-[280px] flex-col gap-2.5">{children}</div>}
    </div>
  )
}

export function MessageButton({
  onClick,
  primary = false,
  testId,
  children,
}: {
  onClick: () => void
  primary?: boolean
  testId: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      className={cn(
        'flex min-h-12 items-center justify-center gap-2 rounded-full px-5 text-[15px] font-extrabold transition',
        primary
          ? 'bg-rally-accent text-rally-accent-text hover:brightness-110'
          : 'border border-rally-border text-rally-text hover:border-rally-accent/50',
      )}
    >
      {children}
    </button>
  )
}

export function DeckSpinner({ testId = 'partner-deck-loading' }: { testId?: string }) {
  return (
    <div data-testid={testId} role="status" className="flex flex-1 items-center justify-center py-16">
      <span className="h-9 w-9 animate-spin rounded-full border-[3px] border-rally-border border-t-rally-accent" />
    </div>
  )
}
