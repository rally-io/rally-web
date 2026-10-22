import { useCallback, useSyncExternalStore } from 'react'
import { useRtl } from './useRtl'

/**
 * Whether a media query matches now, kept live. No `matchMedia` (jsdom, old browsers) reads as
 * no match, the same as LeagueBackdrop.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia?.(query)
      if (!list) return () => {}
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    [query],
  )
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia?.(query).matches ?? false,
    () => false,
  )
}

/** The player asked their system for less motion. */
export function useReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)')
}

export type DrawerSide = 'bottom' | 'left' | 'right'

/** Drawers rise from the bottom on a phone; from 640 px they slide in from the end side. */
export function useDrawerSide(): DrawerSide {
  const wide = useMediaQuery('(min-width: 640px)')
  const { isRTL } = useRtl()
  if (!wide) return 'bottom'
  return isRTL ? 'left' : 'right'
}
