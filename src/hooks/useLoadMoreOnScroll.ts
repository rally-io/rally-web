import { useEffect, useState } from 'react'

import type { DrainableQuery } from './useAutoDrainPages'

interface Options {
  /** How far below the viewport the sentinel may sit and still count as
   * reached — a head start so the next page is usually in by the time the
   * reader scrolls to it. */
  rootMargin?: string
}

/**
 * Fetches the next page of an infinite query when a sentinel element scrolls
 * into view — infinite scroll, replacing a "load more" button.
 *
 * Returns a callback ref; render an empty element with it right after the
 * list. The observer is rebuilt whenever a page finishes loading, and
 * `observe()` re-delivers the current intersection, so a sentinel that is
 * still visible after a short page (a wide grid, a filtered feed) keeps
 * pulling until the viewport is filled or the feed runs out.
 *
 * Duplicate calls are harmless: `useAutoDrainPages` may be draining the
 * same query for a client-side filter, and React Query's default
 * `cancelRefetch: true` would otherwise restart its in-flight fetch.
 */
export function useLoadMoreOnScroll(
  query: DrainableQuery,
  { rootMargin = '0px 0px 480px 0px' }: Options = {},
) {
  const [sentinel, setSentinel] = useState<HTMLElement | null>(null)
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query

  useEffect(() => {
    if (!sentinel || !hasNextPage || isFetchingNextPage) return
    if (typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) fetchNextPage({ cancelRefetch: false })
      },
      { rootMargin },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [sentinel, hasNextPage, isFetchingNextPage, fetchNextPage, rootMargin])

  return setSentinel
}
