import { useEffect } from 'react'

interface DrainableQuery {
  hasNextPage: boolean
  isFetchingNextPage: boolean
  fetchNextPage: () => unknown
}

interface Options {
  /** Off by default at the call site's discretion — draining is only worth
   * the requests when something client-side depends on seeing every item. */
  enabled?: boolean
  /** How many items are already loaded, so the cap can be enforced. */
  loadedCount?: number
  /** Stop after this many loaded items. Uncapped by default, which is what
   * the club and organizer archives have always done. */
  maxItems?: number
}

/**
 * Keeps pulling the next page of an infinite query until it runs out.
 *
 * Needed wherever a filter or a grouping is computed on the client: with one
 * page loaded, "March" or "Advanced" would silently describe only the first
 * ten rows. The cap keeps that from turning into an unbounded crawl on a
 * large feed.
 */
export function useAutoDrainPages(
  query: DrainableQuery,
  { enabled = true, loadedCount = 0, maxItems = Number.POSITIVE_INFINITY }: Options = {},
) {
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query
  useEffect(() => {
    if (!enabled || !hasNextPage || isFetchingNextPage) return
    if (loadedCount >= maxItems) return
    fetchNextPage()
  }, [enabled, hasNextPage, isFetchingNextPage, fetchNextPage, loadedCount, maxItems])
}
