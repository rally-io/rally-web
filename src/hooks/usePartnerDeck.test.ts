import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/services/api/partnerPools', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/api/partnerPools')>()),
  openTournamentPool: vi.fn(),
  getDeck: vi.fn(),
  swipe: vi.fn(),
  undoSwipe: vi.fn(),
  setLooking: vi.fn(),
}))
vi.mock('@/lib/analytics', () => ({ trackPartner: vi.fn() }))
vi.mock('@/lib/partners/vibrate', () => ({ tick: vi.fn(), buzz: vi.fn() }))

import { trackPartner } from '@/lib/analytics'
import { apiError, makeCard, makeMatch, ok, POOL_STATE } from '@/lib/partners/testCards'
import { tick } from '@/lib/partners/vibrate'
import * as service from '@/services/api/partnerPools'
import type { PartnerCard, PartnerDeckPage, PartnerSwipeResult, SwipeOutcome } from '@/types/partnerPool'
import { REFILL_AT, usePartnerDeck } from './usePartnerDeck'

/* Ported from rally-mobile src/hooks/__tests__/usePartnerDeck.test.ts, case for case. The
   errors are the plain objects the web client rejects with (testCards.apiError). */

const api = vi.mocked(service)

const page = (cards: PartnerCard[], needs_gender = false) => ok<PartnerDeckPage>({ cards, needs_gender })
const NO_MATCH = ok<PartnerSwipeResult>({ matched: false, match: null })
const NETWORK = { code: 'NETWORK_ERROR', message: 'Network error' }
const cardsOf = (...ids: string[]) => ids.map((id) => makeCard({ player_id: id, name: `Player ${id}` }))
const idsOf = (cards: { player_id: string }[]) => cards.map((c) => c.player_id)

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

/** Seven cards: more than REFILL_AT, so opening does not trigger a refill on its own. */
async function openDeck(initial = cardsOf('a', 'b', 'c', 'd', 'e', 'f', 'g')) {
  api.getDeck.mockResolvedValueOnce(page(initial))
  const hook = renderHook(() => usePartnerDeck('t-1'))
  await waitFor(() => expect(hook.result.current.phase).toBe('ready'))
  return hook
}

beforeEach(() => {
  vi.resetAllMocks()
  localStorage.clear()
  api.openTournamentPool.mockResolvedValue(ok(POOL_STATE))
  api.getDeck.mockResolvedValue(page([]))
  api.swipe.mockResolvedValue(NO_MATCH)
  api.undoSwipe.mockResolvedValue(ok({ undone: true }))
  api.setLooking.mockResolvedValue(ok(POOL_STATE))
})

describe('usePartnerDeck — opening', () => {
  it('opens the pool, remembers its id, and deals the first page', async () => {
    const { result } = await openDeck(cardsOf('a', 'b', 'c', 'd', 'e', 'f'))
    expect(api.openTournamentPool).toHaveBeenCalledWith('t-1')
    expect(api.getDeck).toHaveBeenCalledWith('pool-1')
    expect(localStorage.getItem('rally:partners:pool:t-1')).toBe('pool-1')
    expect(idsOf(result.current.cards)).toEqual(['a', 'b', 'c', 'd', 'e', 'f'])
    expect(result.current.poolId).toBe('pool-1')
    expect(result.current.pool?.title).toBe('Summer Cup')
    expect(result.current.matchCount).toBe(2)
    expect(result.current.looking).toBe(true)
    expect(trackPartner).toHaveBeenCalledWith('partner_deck_open', { tournament_id: 't-1', cards: 6 })
  })

  it('passes needs_gender through, with an empty deck', async () => {
    api.getDeck.mockResolvedValueOnce(page([], true))
    const { result } = renderHook(() => usePartnerDeck('t-1'))
    await waitFor(() => expect(result.current.phase).toBe('ready'))
    expect(result.current.needsGender).toBe(true)
    expect(result.current.cards).toEqual([])
  })

  it('POOL_CLOSED on open reads back the pool id this browser remembered, so matches stay reachable', async () => {
    localStorage.setItem('rally:partners:pool:t-1', 'pool-old')
    api.openTournamentPool.mockRejectedValueOnce(apiError(409, 'POOL_CLOSED'))
    const { result } = renderHook(() => usePartnerDeck('t-1'))
    await waitFor(() => expect(result.current.phase).toBe('closed'))
    expect(result.current.poolId).toBe('pool-old')
  })

  it('POOL_CLOSED in a 2xx success:false body is the same closed state', async () => {
    api.openTournamentPool.mockResolvedValueOnce({
      success: false,
      error: { code: 'POOL_CLOSED', message: 'closed', details: null },
    })
    const { result } = renderHook(() => usePartnerDeck('t-1'))
    await waitFor(() => expect(result.current.phase).toBe('closed'))
  })

  it.each(['FEATURE_DISABLED', 'POOL_NOT_FOUND'])('%s on open → the unavailable state', async (code) => {
    api.openTournamentPool.mockRejectedValueOnce(apiError(404, code))
    const { result } = renderHook(() => usePartnerDeck('t-1'))
    await waitFor(() => expect(result.current.phase).toBe('unavailable'))
  })

  it('a code-less 404 (an API without the partner routes) → the unavailable state', async () => {
    api.openTournamentPool.mockRejectedValueOnce({ isNotFound: true, status: 404, message: 'Not Found' })
    const { result } = renderHook(() => usePartnerDeck('t-1'))
    await waitFor(() => expect(result.current.phase).toBe('unavailable'))
  })

  it('any other failure on open is an error the player can retry', async () => {
    api.openTournamentPool.mockRejectedValueOnce(apiError(500, 'SERVER_ERROR'))
    const { result } = renderHook(() => usePartnerDeck('t-1'))
    await waitFor(() => expect(result.current.phase).toBe('error'))
    api.getDeck.mockResolvedValueOnce(page(cardsOf('a')))
    act(() => result.current.retry())
    await waitFor(() => expect(result.current.phase).toBe('ready'))
    expect(idsOf(result.current.cards)).toEqual(['a'])
  })
})

describe('usePartnerDeck — swiping', () => {
  it('a like takes the card off at once, PUTs it, and ticks once', async () => {
    const { result } = await openDeck()
    await act(async () => {
      await result.current.swipe(result.current.cards[0], 'like', 'deck')
    })
    expect(api.swipe).toHaveBeenCalledWith('pool-1', 'a', 'like')
    expect(result.current.cards[0].player_id).toBe('b')
    expect(tick).toHaveBeenCalledTimes(1)
    expect(trackPartner).toHaveBeenCalledWith('partner_swipe', {
      tournament_id: 't-1', decision: 'like', ring: 1, source: 'deck',
    })
    expect(result.current.canUndo).toBe(false)
  })

  it('a match is held for the celebration and counted (the page buzzes for it)', async () => {
    const match = makeMatch({ player: makeCard({ player_id: 'a' }) })
    api.swipe.mockResolvedValueOnce(ok({ matched: true, match }))
    const { result } = await openDeck()
    let outcome: SwipeOutcome | undefined
    await act(async () => {
      outcome = await result.current.swipe(result.current.cards[0], 'like', 'deck')
    })
    expect(outcome).toEqual({ ok: true, matched: true })
    expect(result.current.match).toBe(match)
    expect(result.current.matchCount).toBe(3)
    expect(trackPartner).toHaveBeenCalledWith('partner_match', { tournament_id: 't-1', source: 'deck' })
    act(() => result.current.dismissMatch())
    expect(result.current.match).toBeNull()
  })

  it('a player who left the pool is dropped for good, with no toast', async () => {
    api.swipe.mockRejectedValueOnce(apiError(409, 'PLAYER_UNAVAILABLE'))
    const { result } = await openDeck()
    let outcome: SwipeOutcome | undefined
    await act(async () => {
      outcome = await result.current.swipe(result.current.cards[0], 'like', 'deck')
    })
    expect(outcome).toEqual({ ok: false, matched: false })
    expect(idsOf(result.current.cards)).not.toContain('a')
    expect(result.current.notice).toBeNull()
  })

  it('a pass refused with UNDO_NOT_ALLOWED stays removed and seen, with no toast', async () => {
    api.swipe.mockRejectedValueOnce(apiError(409, 'UNDO_NOT_ALLOWED'))
    const { result } = await openDeck()
    await act(async () => {
      await result.current.swipe(result.current.cards[0], 'pass', 'deck')
    })
    expect(idsOf(result.current.cards)).not.toContain('a')
    expect(result.current.notice).toBeNull()
    api.getDeck.mockResolvedValueOnce(page(cardsOf('a', 'h')))
    await act(async () => {
      result.current.refresh()
    })
    await waitFor(() => expect(idsOf(result.current.cards)).toContain('h'))
    expect(idsOf(result.current.cards)).not.toContain('a')
  })

  it('rate limited: the card comes back on top and the page is told to say "slow down"', async () => {
    api.swipe.mockRejectedValueOnce(apiError(429, 'RATE_LIMITED'))
    const { result } = await openDeck()
    await act(async () => {
      await result.current.swipe(result.current.cards[0], 'pass', 'deck')
    })
    expect(result.current.cards[0].player_id).toBe('a')
    expect(result.current.notice).toBe('rate_limited')
    expect(result.current.canUndo).toBe(false)
    act(() => result.current.clearNotice())
    expect(result.current.notice).toBeNull()
  })

  it('a network failure restores the card and asks for the generic toast', async () => {
    api.swipe.mockRejectedValueOnce(NETWORK)
    const { result } = await openDeck()
    await act(async () => {
      await result.current.swipe(result.current.cards[0], 'like', 'deck')
    })
    expect(result.current.cards[0].player_id).toBe('a')
    expect(result.current.notice).toBe('generic')
  })

  it('a failed swipe from search does not push that player into the deck', async () => {
    api.swipe.mockRejectedValueOnce(NETWORK)
    const { result } = await openDeck()
    await act(async () => {
      await result.current.swipe(makeCard({ player_id: 'zz' }), 'like', 'search')
    })
    expect(idsOf(result.current.cards)).not.toContain('zz')
  })

  it('POOL_CLOSED mid-deck switches to the closed state and keeps the pool id', async () => {
    api.swipe.mockRejectedValueOnce(apiError(409, 'POOL_CLOSED'))
    const { result } = await openDeck()
    await act(async () => {
      await result.current.swipe(result.current.cards[0], 'like', 'deck')
    })
    expect(result.current.phase).toBe('closed')
    expect(result.current.poolId).toBe('pool-1')
  })
})

describe('usePartnerDeck — undo', () => {
  it('undo brings the last pass back on top', async () => {
    const { result } = await openDeck()
    await act(async () => {
      await result.current.swipe(result.current.cards[0], 'pass', 'deck')
    })
    expect(result.current.canUndo).toBe(true)
    await act(async () => {
      await result.current.undo()
    })
    expect(api.undoSwipe).toHaveBeenCalledWith('pool-1', 'a')
    expect(result.current.cards[0].player_id).toBe('a')
    expect(result.current.canUndo).toBe(false)
  })

  it('undo waits until the pass has landed', async () => {
    const put = deferred<ReturnType<typeof ok<PartnerSwipeResult>>>()
    api.swipe.mockReturnValueOnce(put.promise)
    const { result } = await openDeck()
    let pending: Promise<SwipeOutcome> | undefined
    act(() => {
      pending = result.current.swipe(result.current.cards[0], 'pass', 'deck')
    })
    expect(result.current.canUndo).toBe(false)
    await act(async () => {
      await result.current.undo()
    })
    expect(api.undoSwipe).not.toHaveBeenCalled()
    await act(async () => {
      put.resolve(NO_MATCH)
      await pending
    })
    expect(result.current.canUndo).toBe(true)
  })

  it('only the most recent swipe can be undone: a like after a pass clears it', async () => {
    const { result } = await openDeck()
    await act(async () => {
      await result.current.swipe(result.current.cards[0], 'pass', 'deck')
    })
    await act(async () => {
      await result.current.swipe(result.current.cards[0], 'like', 'deck')
    })
    expect(result.current.canUndo).toBe(false)
  })

  it('UNDO_NOT_ALLOWED forgets the undo without a toast', async () => {
    api.undoSwipe.mockRejectedValueOnce(apiError(409, 'UNDO_NOT_ALLOWED'))
    const { result } = await openDeck()
    await act(async () => {
      await result.current.swipe(result.current.cards[0], 'pass', 'deck')
    })
    await act(async () => {
      await result.current.undo()
    })
    expect(result.current.notice).toBeNull()
    expect(result.current.canUndo).toBe(false)
    expect(result.current.cards[0].player_id).toBe('b')
  })
})

describe('usePartnerDeck — refill and looking', () => {
  it(`refills at ${REFILL_AT} cards, skips ids it already dealt, and stops when nothing is new`, async () => {
    const { result } = await openDeck(cardsOf('a', 'b', 'c', 'd', 'e', 'f'))
    // c and d are still queued: the server does not know about them until they are swiped.
    api.getDeck.mockResolvedValueOnce(page(cardsOf('c', 'd', 'x')))
    await act(async () => {
      await result.current.swipe(result.current.cards[0], 'like', 'deck') // 5 left → refill
    })
    await waitFor(() => expect(idsOf(result.current.cards)).toEqual(['b', 'c', 'd', 'e', 'f', 'x']))
    // The next page (the default: empty) brings nothing new.
    await act(async () => {
      await result.current.swipe(result.current.cards[0], 'like', 'deck')
    })
    await waitFor(() => expect(result.current.exhausted).toBe(true))
    const calls = api.getDeck.mock.calls.length
    await act(async () => {
      await result.current.swipe(result.current.cards[0], 'like', 'deck')
    })
    expect(api.getDeck.mock.calls.length).toBe(calls)
  })

  it('"Check again" asks once more after the deck ran dry', async () => {
    const { result } = await openDeck(cardsOf('a'))
    await waitFor(() => expect(result.current.exhausted).toBe(true)) // the refill brought nothing
    api.getDeck.mockResolvedValueOnce(page(cardsOf('n')))
    act(() => result.current.refresh())
    await waitFor(() => expect(idsOf(result.current.cards)).toEqual(['a', 'n']))
  })

  it('the looking switch is optimistic and reverts when the PATCH fails', async () => {
    api.setLooking.mockRejectedValueOnce(NETWORK)
    const { result } = await openDeck()
    await act(async () => {
      await result.current.setLooking(false)
    })
    expect(api.setLooking).toHaveBeenCalledWith('pool-1', false)
    expect(result.current.looking).toBe(true)
    expect(result.current.notice).toBe('generic')
  })
})

describe('usePartnerDeck — fix round 1', () => {
  it('a temporary undo failure keeps the undo available, and a retry brings the card back', async () => {
    api.undoSwipe.mockRejectedValueOnce(NETWORK)
    const { result } = await openDeck()
    await act(async () => {
      await result.current.swipe(result.current.cards[0], 'pass', 'deck')
    })
    await act(async () => {
      await result.current.undo()
    })
    expect(result.current.notice).toBe('generic')
    expect(result.current.canUndo).toBe(true)
    expect(result.current.cards[0].player_id).toBe('b')
    await act(async () => {
      await result.current.undo()
    })
    expect(result.current.cards[0].player_id).toBe('a')
    expect(result.current.canUndo).toBe(false)
  })

  it('a failed undo is not restored when another swipe happened while it was in flight', async () => {
    const del = deferred<ReturnType<typeof ok<{ undone: boolean }>>>()
    api.undoSwipe.mockReturnValueOnce(del.promise)
    const { result } = await openDeck()
    await act(async () => {
      await result.current.swipe(result.current.cards[0], 'pass', 'deck')
    })
    let undoing: Promise<void> | undefined
    act(() => {
      undoing = result.current.undo()
    })
    await act(async () => {
      await result.current.swipe(result.current.cards[0], 'pass', 'deck')
    })
    await act(async () => {
      del.reject(NETWORK)
      await undoing
    })
    expect(result.current.canUndo).toBe(true)
    expect(api.undoSwipe).toHaveBeenCalledTimes(1)
    expect(result.current.cards[0].player_id).toBe('c')
  })

  it('a search like on a player never dealt keeps them out of a refill already in flight', async () => {
    const { result } = await openDeck(cardsOf('a', 'b', 'c', 'd', 'e', 'f'))
    const refill = deferred<ReturnType<typeof page>>()
    api.getDeck.mockReturnValueOnce(refill.promise)
    const put = deferred<ReturnType<typeof ok<PartnerSwipeResult>>>()
    api.swipe.mockResolvedValueOnce(NO_MATCH).mockReturnValueOnce(put.promise)
    let searching: Promise<SwipeOutcome> | undefined
    await act(async () => {
      await result.current.swipe(result.current.cards[0], 'like', 'deck') // 5 left → refill in flight
    })
    act(() => {
      searching = result.current.swipe(makeCard({ player_id: 'z' }), 'like', 'search')
    })
    await act(async () => {
      refill.resolve(page(cardsOf('z', 'y')))
      put.resolve(NO_MATCH)
      await searching
    })
    await waitFor(() => expect(idsOf(result.current.cards)).toContain('y'))
    expect(idsOf(result.current.cards)).not.toContain('z')
  })
})
