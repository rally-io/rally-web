import { useCallback, useRef } from 'react'

/**
 * For a Radix dialog opened from state rather than a `Trigger`. On close Radix focuses the
 * trigger, so with none focus falls to `<body>`. Spread the result on the dialog's Content: it
 * remembers what had focus as the dialog opened and gives focus back to it on close. When that
 * element has left the page, focus goes to `fallback()` instead, if there is one.
 *
 * Nothing inside the dialog may use `autoFocus`: when focus is already inside as the dialog
 * mounts, Radix skips `onOpenAutoFocus` and the opener is never recorded. Radix focuses the
 * first tabbable element by default.
 */
export function useReturnFocus(fallback?: () => HTMLElement | null) {
  const opener = useRef<HTMLElement | null>(null)

  const onOpenAutoFocus = useCallback(() => {
    // Radix fires this before it moves focus in, so activeElement is still the opener.
    const active = document.activeElement
    opener.current = active instanceof HTMLElement && active !== document.body ? active : null
  }, [])

  const onCloseAutoFocus = useCallback(
    (event: Event) => {
      const previous = opener.current
      opener.current = null
      const target = previous?.isConnected ? previous : (fallback?.() ?? null)
      if (!target) return
      event.preventDefault()
      target.focus({ preventScroll: true })
    },
    [fallback],
  )

  return { onOpenAutoFocus, onCloseAutoFocus }
}
