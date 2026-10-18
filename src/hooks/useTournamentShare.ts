import { useCallback, useEffect, useRef } from 'react'
import { getTournamentShareLink } from '@/services/api/tournaments'

/** What a share did: the native sheet shared, the link was copied instead, the viewer closed
    the sheet, or neither the sheet nor the clipboard worked. */
export type ShareResult = 'shared' | 'copied' | 'dismissed' | 'failed'

export interface ShareRequest {
  title: string
  text: string
  /** Used when the short link cannot be fetched. Defaults to this page's URL. */
  fallbackUrl?: string
}

export async function fetchShareUrl(tournamentId: string): Promise<string | null> {
  try {
    const result = await getTournamentShareLink(tournamentId)
    return result.success && result.data?.share_url ? result.data.share_url : null
  } catch {
    return null
  }
}

/**
 * Shares the same link the manager copies from the CRM. A failed fetch never blocks the
 * share: it falls back to `fallbackUrl`, else this page's own URL.
 *
 * Call `prefetch` on intent (hover, touch start, focus) rather than on click: iOS Safari only
 * allows `navigator.share` inside the tap's user activation, and awaiting a network call first
 * can spend it. If the activation is lost anyway, the share falls back to copying the link.
 */
export function useTournamentShare(tournamentId: string) {
  // The in-flight prefetch is kept so a tap that beats it reuses the request instead of
  // starting a second one; `resolved` lets a later tap share without awaiting at all.
  const pendingRef = useRef<Promise<string | null> | null>(null)
  const resolvedRef = useRef<string | null>(null)

  useEffect(() => {
    pendingRef.current = null
    resolvedRef.current = null
  }, [tournamentId])

  const prefetch = useCallback((): Promise<string | null> => {
    if (!pendingRef.current) {
      const pending = fetchShareUrl(tournamentId)
      pendingRef.current = pending
      void pending.then((url) => {
        if (pendingRef.current === pending) resolvedRef.current = url
      })
    }
    return pendingRef.current
  }, [tournamentId])

  const share = useCallback(
    async ({ title, text, fallbackUrl }: ShareRequest): Promise<ShareResult> => {
      const url = resolvedRef.current ?? (await prefetch()) ?? fallbackUrl ?? window.location.href
      if (navigator.share) {
        try {
          await navigator.share({ title, text, url })
          return 'shared'
        } catch (err) {
          // Dismissing the sheet is not an error. Anything else (Safari's NotAllowedError
          // after a lost activation) would otherwise be a silent no-op, so copy instead.
          if ((err as { name?: string } | null)?.name === 'AbortError') return 'dismissed'
        }
      }
      try {
        await navigator.clipboard.writeText(url)
      } catch {
        return 'failed'
      }
      return 'copied'
    },
    [prefetch],
  )

  return { prefetch, share }
}
