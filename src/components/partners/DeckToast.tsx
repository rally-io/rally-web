import { useEffect, useRef } from 'react'

export const TOAST_MS = 4000

export interface DeckToastMessage {
  /** a new id restarts the timer, so the same text twice shows twice */
  id: number
  text: string
}

/** A short line above the action row that leaves on its own: rate limits, failures, "Link copied". */
export function DeckToast({ toast, onDone }: { toast: DeckToastMessage | null; onDone: () => void }) {
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => onDoneRef.current(), TOAST_MS)
    return () => clearTimeout(timer)
  }, [toast])

  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex justify-center px-4">
      {toast && (
        <p
          key={toast.id}
          data-testid="partner-toast"
          className="max-w-[380px] rounded-2xl border border-rally-border bg-rally-surface-2 px-4 py-3 text-center text-sm font-semibold text-rally-text shadow-lg"
        >
          {toast.text}
        </p>
      )}
    </div>
  )
}
