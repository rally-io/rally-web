import { useCallback, useEffect, useRef, useState } from 'react'
import { trackPartner } from '@/lib/analytics'
import { classifyPartnerError, type PartnerErrorKind } from '@/lib/partners/errors'
import { recallPoolId, rememberPoolId } from '@/lib/partners/storage'
import { tick } from '@/lib/partners/vibrate'
import {
  getDeck,
  openTournamentPool,
  setLooking as patchLooking,
  swipe as putSwipe,
  undoSwipe,
  unwrap,
} from '@/services/api/partnerPools'
import type {
  PartnerCard,
  PartnerDecision,
  PartnerMatch,
  PartnerPoolSummary,
  PartnerSwipeSource,
  SwipeOutcome,
} from '@/types/partnerPool'

/* The deck's state machine, ported from rally-mobile src/hooks/usePartnerDeck.ts with the
   logic unchanged. Web differences: the service returns the ApiResponse envelope (unwrap),
   haptics are navigator.vibrate (tick), analytics is trackPartner, storage is synchronous. */

/** Ask for more cards once this few are left. */
export const REFILL_AT = 5

export type DeckPhase = 'loading' | 'ready' | 'closed' | 'unavailable' | 'error'
/** A one-off toast the page shows, then clears. */
export type DeckNotice = 'rate_limited' | 'generic'

export interface PartnerDeckState {
  phase: DeckPhase
  pool: PartnerPoolSummary | null
  /** Known even when the pool is closed, if this browser opened it before (storage.ts). */
  poolId: string | null
  looking: boolean
  matchCount: number
  /** The queue; `cards[0]` is on top. */
  cards: PartnerCard[]
  needsGender: boolean
  /** The last page brought nothing new: show the empty state instead of a spinner. */
  exhausted: boolean
  canUndo: boolean
  /** The match to celebrate, until dismissed. */
  match: PartnerMatch | null
  notice: DeckNotice | null
  swipe: (card: PartnerCard, decision: PartnerDecision, source: PartnerSwipeSource) => Promise<SwipeOutcome>
  undo: () => Promise<void>
  setLooking: (looking: boolean) => Promise<void>
  refresh: () => void
  retry: () => void
  dismissMatch: () => void
  clearNotice: () => void
  syncMatchCount: (count: number) => void
}

const noticeFor = (kind: PartnerErrorKind): DeckNotice => (kind === 'rate_limited' ? 'rate_limited' : 'generic')

export function usePartnerDeck(tournamentId: string): PartnerDeckState {
  const [phase, setPhase] = useState<DeckPhase>('loading')
  const [pool, setPool] = useState<PartnerPoolSummary | null>(null)
  const [poolId, setPoolId] = useState<string | null>(null)
  const [looking, setLookingState] = useState(true)
  const [matchCount, setMatchCount] = useState(0)
  const [cards, setCards] = useState<PartnerCard[]>([])
  const [needsGender, setNeedsGender] = useState(false)
  const [exhausted, setExhausted] = useState(false)
  const [lastPass, setLastPass] = useState<PartnerCard | null>(null)
  const [pendingPassId, setPendingPassId] = useState<string | null>(null)
  const [match, setMatch] = useState<PartnerMatch | null>(null)
  const [notice, setNotice] = useState<DeckNotice | null>(null)
  const [attempt, setAttempt] = useState(0)

  /* Async callbacks read these, not state: a swipe's catch runs after later swipes may
     already have changed the queue. Every queue change goes through updateCards. */
  const poolIdRef = useRef<string | null>(null)
  const cardsRef = useRef<PartnerCard[]>([])
  const seenRef = useRef(new Set<string>())
  const loadingMoreRef = useRef(false)
  /** Counts swipes, so a failed undo can tell whether a newer swipe has replaced it. */
  const swipeSeqRef = useRef(0)

  const updateCards = useCallback((next: (prev: PartnerCard[]) => PartnerCard[]) => {
    cardsRef.current = next(cardsRef.current)
    setCards(cardsRef.current)
  }, [])

  /** A closed or vanished pool replaces the whole deck body. True when it did. */
  const failPool = useCallback((kind: PartnerErrorKind): boolean => {
    if (kind === 'closed') {
      setPhase('closed')
      return true
    }
    if (kind === 'unavailable') {
      setPhase('unavailable')
      return true
    }
    return false
  }, [])

  useEffect(() => {
    let current = true
    setPhase('loading')
    setPool(null)
    setPoolId(null)
    setMatch(null)
    setNotice(null)
    setLastPass(null)
    setExhausted(false)
    setNeedsGender(false)
    poolIdRef.current = null
    seenRef.current = new Set()
    updateCards(() => [])

    void (async () => {
      try {
        const state = unwrap(await openTournamentPool(tournamentId))
        if (!current) return
        poolIdRef.current = state.pool.id
        setPoolId(state.pool.id)
        rememberPoolId(tournamentId, state.pool.id)
        setPool(state.pool)
        setLookingState(state.me.looking)
        setMatchCount(state.match_count)

        const page = unwrap(await getDeck(state.pool.id))
        if (!current) return
        page.cards.forEach((c) => seenRef.current.add(c.player_id))
        updateCards(() => page.cards)
        setNeedsGender(page.needs_gender)
        setExhausted(page.cards.length === 0)
        setPhase('ready')
        trackPartner('partner_deck_open', { tournament_id: tournamentId, cards: page.cards.length })
      } catch (error) {
        if (!current) return
        const kind = classifyPartnerError(error)
        // POST answers POOL_CLOSED with no pool id: fall back to the one remembered on open.
        if (kind === 'closed') setPoolId(poolIdRef.current ?? recallPoolId(tournamentId))
        if (!failPool(kind)) setPhase('error')
      }
    })()

    return () => {
      current = false
    }
  }, [tournamentId, attempt, updateCards, failPool])

  const loadMore = useCallback(async () => {
    const id = poolIdRef.current
    if (!id || loadingMoreRef.current) return
    loadingMoreRef.current = true
    try {
      const page = unwrap(await getDeck(id))
      // The server only skips players already SWIPED; cards still queued here come back.
      const fresh = page.cards.filter((c) => !seenRef.current.has(c.player_id))
      fresh.forEach((c) => seenRef.current.add(c.player_id))
      updateCards((prev) => [...prev, ...fresh])
      setNeedsGender(page.needs_gender)
      setExhausted(fresh.length === 0)
    } catch (error) {
      // A failed refill is quiet while cards remain; with none left, show the empty state
      // (its "Check again" retries).
      if (!failPool(classifyPartnerError(error)) && cardsRef.current.length === 0) setExhausted(true)
    } finally {
      loadingMoreRef.current = false
    }
  }, [updateCards, failPool])

  useEffect(() => {
    if (phase === 'ready' && cards.length <= REFILL_AT && !exhausted) void loadMore()
  }, [phase, cards.length, exhausted, loadMore])

  const swipe = useCallback(
    async (card: PartnerCard, decision: PartnerDecision, source: PartnerSwipeSource): Promise<SwipeOutcome> => {
      const id = poolIdRef.current
      if (!id) return { ok: false, matched: false }
      swipeSeqRef.current += 1
      const wasSeen = seenRef.current.has(card.player_id)
      seenRef.current.add(card.player_id)
      const wasQueued = cardsRef.current.some((c) => c.player_id === card.player_id)
      tick()
      updateCards((prev) => prev.filter((c) => c.player_id !== card.player_id))
      // Only the most recent swipe can be undone, and only a pass.
      setLastPass(decision === 'pass' ? card : null)
      if (decision === 'pass') setPendingPassId(card.player_id)
      trackPartner('partner_swipe', { tournament_id: tournamentId, decision, ring: card.ring, source })

      try {
        const result = unwrap(await putSwipe(id, card.player_id, decision))
        if (result.matched && result.match) {
          setMatch(result.match)
          setMatchCount((n) => n + 1)
          trackPartner('partner_match', { tournament_id: tournamentId, source })
        }
        return { ok: true, matched: result.matched }
      } catch (error) {
        setLastPass((prev) => (prev?.player_id === card.player_id ? null : prev))
        const kind = classifyPartnerError(error)
        if (!failPool(kind) && kind !== 'player_gone' && kind !== 'undo_refused') {
          // Not recorded: a failed search like can still be dealt later.
          if (!wasSeen) seenRef.current.delete(card.player_id)
          // Not recorded: put the card back on top, unless it never was in the deck.
          if (wasQueued) updateCards((prev) => [card, ...prev.filter((c) => c.player_id !== card.player_id)])
          setNotice(noticeFor(kind))
        }
        return { ok: false, matched: false }
      } finally {
        setPendingPassId((prev) => (prev === card.player_id ? null : prev))
      }
    },
    [tournamentId, updateCards, failPool],
  )

  const undo = useCallback(async () => {
    const id = poolIdRef.current
    const card = lastPass
    if (!id || !card || pendingPassId === card.player_id) return
    const seq = swipeSeqRef.current
    setLastPass(null)
    try {
      unwrap(await undoSwipe(id, card.player_id))
      updateCards((prev) => [card, ...prev.filter((c) => c.player_id !== card.player_id)])
    } catch (error) {
      const kind = classifyPartnerError(error)
      if (!failPool(kind) && kind !== 'undo_refused' && kind !== 'player_gone') {
        // Temporary failure: the server still holds the pass, so keep the undo (unless a newer swipe replaced it).
        if (swipeSeqRef.current === seq) setLastPass(card)
        setNotice(noticeFor(kind))
      }
    }
  }, [lastPass, pendingPassId, updateCards, failPool])

  const setLooking = useCallback(
    async (next: boolean) => {
      const id = poolIdRef.current
      if (!id) return
      setLookingState(next)
      try {
        const state = unwrap(await patchLooking(id, next))
        setLookingState(state.me.looking)
      } catch (error) {
        setLookingState(!next)
        const kind = classifyPartnerError(error)
        if (!failPool(kind)) setNotice(noticeFor(kind))
      }
    },
    [failPool],
  )

  const refresh = useCallback(() => {
    setExhausted(false)
    void loadMore()
  }, [loadMore])
  const retry = useCallback(() => setAttempt((n) => n + 1), [])
  const dismissMatch = useCallback(() => setMatch(null), [])
  const clearNotice = useCallback(() => setNotice(null), [])
  const syncMatchCount = useCallback((count: number) => setMatchCount(count), [])

  return {
    phase,
    pool,
    poolId,
    looking,
    matchCount,
    cards,
    needsGender,
    exhausted,
    canUndo: phase === 'ready' && lastPass !== null && pendingPassId !== lastPass.player_id,
    match,
    notice,
    swipe,
    undo,
    setLooking,
    refresh,
    retry,
    dismissMatch,
    clearNotice,
    syncMatchCount,
  }
}
