import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { trackPageView } from '@/lib/analytics'

// The first page load is already counted by the pixel base code in
// index.html; only later route changes are tracked here. Module-level so a
// StrictMode double-mount (dev) cannot count the landing page twice.
let lastTracked: string | null = null

/** Fires a Meta Pixel PageView on every SPA route change. Renders nothing. */
export default function RouteTracker() {
  const { pathname, search } = useLocation()

  useEffect(() => {
    const key = pathname + search
    if (lastTracked === null) {
      lastTracked = key
      return
    }
    if (key === lastTracked) return
    lastTracked = key
    trackPageView()
  }, [pathname, search])

  return null
}
