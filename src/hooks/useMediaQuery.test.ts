import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import i18n from '@/i18n'
import { useDrawerSide, useMediaQuery, useReducedMotion } from './useMediaQuery'

/** A matchMedia whose answers the test sets, firing `change` like a browser. */
function fakeMatchMedia(initial: Record<string, boolean>) {
  const state = { ...initial }
  const listeners = new Map<string, Set<() => void>>()
  const matchMedia = vi.fn((query: string) => ({
    get matches() {
      return state[query] ?? false
    },
    media: query,
    addEventListener: (_: 'change', fn: () => void) => {
      if (!listeners.has(query)) listeners.set(query, new Set())
      listeners.get(query)!.add(fn)
    },
    removeEventListener: (_: 'change', fn: () => void) => listeners.get(query)?.delete(fn),
  }))
  vi.stubGlobal('matchMedia', matchMedia)
  return {
    set(query: string, matches: boolean) {
      state[query] = matches
      act(() => listeners.get(query)?.forEach((fn) => fn()))
    },
    listenerCount: (query: string) => listeners.get(query)?.size ?? 0,
  }
}

afterEach(async () => {
  vi.unstubAllGlobals()
  await act(() => i18n.changeLanguage('en'))
})

describe('useMediaQuery', () => {
  it('follows the query as it starts and stops matching, and unsubscribes on unmount', () => {
    const mm = fakeMatchMedia({ '(min-width: 640px)': false })
    const { result, unmount } = renderHook(() => useMediaQuery('(min-width: 640px)'))
    expect(result.current).toBe(false)
    mm.set('(min-width: 640px)', true)
    expect(result.current).toBe(true)
    unmount()
    expect(mm.listenerCount('(min-width: 640px)')).toBe(0)
  })

  it('without matchMedia (jsdom) nothing matches', () => {
    vi.stubGlobal('matchMedia', undefined)
    const { result } = renderHook(() => useMediaQuery('(min-width: 640px)'))
    expect(result.current).toBe(false)
  })

  it('useReducedMotion reads prefers-reduced-motion', () => {
    fakeMatchMedia({ '(prefers-reduced-motion: reduce)': true })
    const { result } = renderHook(() => useReducedMotion())
    expect(result.current).toBe(true)
  })
})

describe('useDrawerSide', () => {
  it('bottom on a phone; the end side from 640 px: right in English, left in Hebrew', async () => {
    const mm = fakeMatchMedia({ '(min-width: 640px)': false })
    const { result } = renderHook(() => useDrawerSide())
    expect(result.current).toBe('bottom')
    mm.set('(min-width: 640px)', true)
    expect(result.current).toBe('right')
    await act(() => i18n.changeLanguage('he'))
    expect(result.current).toBe('left')
  })
})
