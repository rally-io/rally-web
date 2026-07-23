import { useMemo } from 'react'

export type DevicePlatform = 'ios' | 'android' | 'desktop'

/**
 * Best-effort store targeting for download CTAs:
 * - Android devices → Google Play
 * - iPhone/iPad (incl. iPadOS reporting as Mac w/ touch) → App Store
 * - anything else → 'desktop' (show both store options)
 */
export function useDevicePlatform(): DevicePlatform {
  return useMemo(() => {
    if (typeof navigator === 'undefined') return 'desktop'
    const ua = navigator.userAgent
    if (/android/i.test(ua)) return 'android'
    const isIos =
      /iPhone|iPad|iPod/.test(ua) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    if (isIos) return 'ios'
    return 'desktop'
  }, [])
}
