import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useTournamentShare, type ShareResult } from './useTournamentShare'

const mockGetShareLink = vi.fn()
vi.mock('@/services/api/tournaments', () => ({
  getTournamentShareLink: (id: string) => mockGetShareLink(id),
}))

const SHORT = 'https://link.rallypadel.app/abc123'
const REQUEST = { title: 'Summer Open', text: 'Join me', fallbackUrl: 'https://rallypadel.app/tournaments/t-1' }

const originalShare = navigator.share
let writeText: ReturnType<typeof vi.fn>

function setShare(value: unknown) {
  Object.defineProperty(navigator, 'share', { value, configurable: true })
}

async function shareOnce(hook: { current: ReturnType<typeof useTournamentShare> }): Promise<ShareResult> {
  let result: ShareResult | undefined
  await act(async () => {
    result = await hook.current.share(REQUEST)
  })
  return result!
}

beforeEach(() => {
  mockGetShareLink.mockReset()
  mockGetShareLink.mockResolvedValue({ success: true, data: { share_url: SHORT } })
  writeText = vi.fn().mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
  setShare(undefined)
})

afterEach(() => {
  setShare(originalShare)
})

describe('useTournamentShare', () => {
  it('shares the short link through the native sheet', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    setShare(share)
    const { result } = renderHook(() => useTournamentShare('t-1'))
    expect(await shareOnce(result)).toBe('shared')
    expect(share).toHaveBeenCalledWith({ title: 'Summer Open', text: 'Join me', url: SHORT })
  })

  it('a prefetch and the share that follows make one request', async () => {
    setShare(vi.fn().mockResolvedValue(undefined))
    const { result } = renderHook(() => useTournamentShare('t-1'))
    act(() => {
      void result.current.prefetch()
    })
    await shareOnce(result)
    expect(mockGetShareLink).toHaveBeenCalledTimes(1)
  })

  it('a dismissed sheet copies nothing', async () => {
    setShare(vi.fn().mockRejectedValue(Object.assign(new Error('x'), { name: 'AbortError' })))
    const { result } = renderHook(() => useTournamentShare('t-1'))
    expect(await shareOnce(result)).toBe('dismissed')
    expect(writeText).not.toHaveBeenCalled()
  })

  it('a refused sheet (lost activation) copies the link instead', async () => {
    setShare(vi.fn().mockRejectedValue(Object.assign(new Error('x'), { name: 'NotAllowedError' })))
    const { result } = renderHook(() => useTournamentShare('t-1'))
    expect(await shareOnce(result)).toBe('copied')
    expect(writeText).toHaveBeenCalledWith(SHORT)
  })

  it('copies when the browser has no share sheet', async () => {
    const { result } = renderHook(() => useTournamentShare('t-1'))
    expect(await shareOnce(result)).toBe('copied')
    expect(writeText).toHaveBeenCalledWith(SHORT)
  })

  it('uses the fallback URL when the short link cannot be fetched', async () => {
    mockGetShareLink.mockRejectedValue({ status: 500 })
    const { result } = renderHook(() => useTournamentShare('t-1'))
    await shareOnce(result)
    expect(writeText).toHaveBeenCalledWith(REQUEST.fallbackUrl)
  })

  it('reports a failure when the clipboard is refused too', async () => {
    writeText.mockRejectedValue(new Error('denied'))
    const { result } = renderHook(() => useTournamentShare('t-1'))
    expect(await shareOnce(result)).toBe('failed')
  })

  it('fetches a new link for another tournament', async () => {
    const { result, rerender } = renderHook(({ id }) => useTournamentShare(id), { initialProps: { id: 't-1' } })
    await shareOnce(result)
    rerender({ id: 't-2' })
    await shareOnce(result)
    expect(mockGetShareLink).toHaveBeenNthCalledWith(2, 't-2')
  })
})
