import { useState } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/services/api/partnerPools', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/api/partnerPools')>()),
  searchPlayers: vi.fn(),
}))
vi.mock('@/lib/analytics', () => ({ trackPartner: vi.fn() }))

import { trackPartner } from '@/lib/analytics'
import { makeSearchResult, ok } from '@/lib/partners/testCards'
import { searchPlayers } from '@/services/api/partnerPools'
import type { PartnerSearchResult, SwipeOutcome } from '@/types/partnerPool'
import { PartnerSearchDrawer, SEARCH_DEBOUNCE_MS } from './PartnerSearchDrawer'

/* Ported from rally-mobile's PartnerSearchSheet.test.tsx. */

type OnSwipe = (card: PartnerSearchResult, decision: 'like' | 'pass') => Promise<SwipeOutcome>

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

function renderSearch(onSwipe = vi.fn<OnSwipe>(async () => ({ ok: true, matched: false }))) {
  const onClose = vi.fn()
  const utils = render(<PartnerSearchDrawer open poolId="pool-1" tournamentId="t-1" onClose={onClose} onSwipe={onSwipe} />)
  return { ...utils, onSwipe, onClose }
}

const input = () => screen.getByTestId('partner-search-input')

/** Type, then let the debounce run out and the answer arrive. */
async function typeAndWait(text: string) {
  fireEvent.change(input(), { target: { value: text } })
  await act(async () => {
    vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS)
  })
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.mocked(searchPlayers).mockReset()
  vi.mocked(trackPartner).mockReset()
})
afterEach(() => vi.useRealTimers())

describe('PartnerSearchDrawer', () => {
  it('caps the query at the 64 characters the API accepts, and focuses it', () => {
    renderSearch()
    expect(input()).toHaveAttribute('maxLength', '64')
    expect(document.activeElement).toBe(input())
  })

  it('waits for 2 letters and 300 ms of quiet before it searches', async () => {
    vi.mocked(searchPlayers).mockResolvedValue(ok([makeSearchResult()]))
    renderSearch()
    fireEvent.change(input(), { target: { value: 'N' } })
    expect(screen.getByTestId('partner-search-hint').textContent).toBe('Type at least 2 letters')
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(searchPlayers).not.toHaveBeenCalled()

    fireEvent.change(input(), { target: { value: 'No' } })
    act(() => {
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS - 1)
    })
    expect(searchPlayers).not.toHaveBeenCalled()
    await act(async () => {
      vi.advanceTimersByTime(1)
    })
    expect(searchPlayers).toHaveBeenCalledWith('pool-1', 'No')
    expect(screen.getByTestId('partner-search-row-p-1')).toBeTruthy()
    expect(trackPartner).toHaveBeenCalledWith('partner_search', { tournament_id: 't-1', query_length: 2, results: 1 })
  })

  it('an answer to an older query never replaces a newer one', async () => {
    const first = deferred<ReturnType<typeof ok<PartnerSearchResult[]>>>()
    vi.mocked(searchPlayers)
      .mockReturnValueOnce(first.promise)
      .mockResolvedValueOnce(ok([makeSearchResult({ player_id: 'p-2', name: 'Dana Cohen' })]))
    renderSearch()
    await typeAndWait('No')
    await typeAndWait('Da')
    expect(screen.getByTestId('partner-search-row-p-2')).toBeTruthy()
    await act(async () => {
      first.resolve(ok([makeSearchResult({ player_id: 'p-1' })]))
    })
    expect(screen.queryByTestId('partner-search-row-p-1')).toBeNull()
    expect(screen.getByTestId('partner-search-row-p-2')).toBeTruthy()
  })

  it('shows where the viewer stands with each player', async () => {
    vi.mocked(searchPlayers).mockResolvedValue(
      ok([
        makeSearchResult({ player_id: 'm', my_decision: 'like', matched: true }),
        makeSearchResult({ player_id: 'l', my_decision: 'like' }),
        makeSearchResult({ player_id: 'p', my_decision: 'pass' }),
        makeSearchResult({ player_id: 'n' }),
      ]),
    )
    renderSearch()
    await typeAndWait('No')
    expect(screen.getByTestId('partner-search-status-m').textContent).toBe('Matched')
    expect(screen.getByTestId('partner-search-status-l').textContent).toBe('Liked')
    expect(screen.getByTestId('partner-search-status-p').textContent).toBe('Passed')
    // A pass can still become a like from here: that is what search is for.
    expect(screen.getByTestId('partner-search-like-p')).toBeTruthy()
    expect(screen.getByTestId('partner-search-like-n')).toBeTruthy()
    expect(screen.queryByTestId('partner-search-like-l')).toBeNull()
    expect(screen.queryByTestId('partner-search-like-m')).toBeNull()
  })

  it('like goes through the deck and updates the row', async () => {
    vi.mocked(searchPlayers).mockResolvedValue(ok([makeSearchResult({ player_id: 'p', my_decision: 'pass' })]))
    const { onSwipe } = renderSearch(vi.fn<OnSwipe>(async () => ({ ok: true, matched: true })))
    await typeAndWait('No')
    await act(async () => {
      fireEvent.click(screen.getByTestId('partner-search-like-p'))
    })
    expect(onSwipe).toHaveBeenCalledWith(expect.objectContaining({ player_id: 'p' }), 'like')
    expect(screen.getByTestId('partner-search-status-p').textContent).toBe('Matched')
  })

  it('a like the server did not record leaves the row as it was', async () => {
    vi.mocked(searchPlayers).mockResolvedValue(ok([makeSearchResult({ player_id: 'n' })]))
    const { onSwipe } = renderSearch(vi.fn<OnSwipe>(async () => ({ ok: false, matched: false })))
    await typeAndWait('No')
    await act(async () => {
      fireEvent.click(screen.getByTestId('partner-search-like-n'))
    })
    expect(onSwipe).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('partner-search-like-n')).toBeTruthy()
    expect(screen.queryByTestId('partner-search-status-n')).toBeNull()
  })

  it('no results, and a failed search, each say so', async () => {
    vi.mocked(searchPlayers).mockResolvedValueOnce(ok([])).mockRejectedValueOnce({ code: 'NETWORK_ERROR' })
    renderSearch()
    await typeAndWait('Zz')
    expect(screen.getByTestId('partner-search-empty').textContent).toBe('No players found')
    await typeAndWait('Zzz')
    expect(screen.getByTestId('partner-search-error').textContent).toBe('Something went wrong. Try again.')
  })

  it('closing clears the query', async () => {
    vi.mocked(searchPlayers).mockResolvedValue(ok([]))
    const { rerender, onSwipe, onClose } = renderSearch()
    await typeAndWait('Zz')
    rerender(<PartnerSearchDrawer open={false} poolId="pool-1" tournamentId="t-1" onClose={onClose} onSwipe={onSwipe} />)
    rerender(<PartnerSearchDrawer open poolId="pool-1" tournamentId="t-1" onClose={onClose} onSwipe={onSwipe} />)
    expect(input()).toHaveValue('')
  })

  it('opening focuses the query, and closing gives focus back to what opened it', () => {
    function Harness() {
      const [open, setOpen] = useState(false)
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Open search
          </button>
          <PartnerSearchDrawer open={open} poolId="pool-1" tournamentId="t-1" onClose={() => setOpen(false)} onSwipe={vi.fn<OnSwipe>()} />
        </>
      )
    }
    render(<Harness />)
    const opener = screen.getByRole('button', { name: 'Open search' })
    opener.focus()
    fireEvent.click(opener)
    expect(input()).toHaveFocus()
    fireEvent.keyDown(input(), { key: 'Escape' })
    // Radix hands focus back in a setTimeout(0) after the dialog unmounts.
    act(() => {
      vi.advanceTimersByTime(0)
    })
    expect(opener).toHaveFocus()
  })
})
