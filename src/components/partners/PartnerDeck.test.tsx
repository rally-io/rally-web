import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PartnerDeckState } from '@/hooks/usePartnerDeck'

/* Ported from rally-mobile's PartnerDeckScreen.test.tsx. This component's job is wiring, so
   every child with its own tests is a recorder: the tests read the props the deck hands down
   and call the callbacks the way the child would. PartnerActions, the messages, the toast and
   the note dialog stay real. */

const h = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const props: Record<string, any> = {}
  const recorder = (key: string) =>
    function Recorder(p: Record<string, unknown>) {
      props[key] = p
      return null
    }
  return { props, recorder, swipeTop: vi.fn(), topElement: vi.fn(), motion: { reduced: false }, prefetch: vi.fn(), share: vi.fn() }
})

vi.mock('@/hooks/usePartnerDeck', () => ({ usePartnerDeck: vi.fn() }))
vi.mock('@/hooks/useMediaQuery', () => ({ useReducedMotion: () => h.motion.reduced }))
vi.mock('@/hooks/useTournamentShare', () => ({
  useTournamentShare: () => ({ prefetch: h.prefetch, share: h.share }),
}))
vi.mock('@/lib/partners/storage', () => ({
  hasSeenWhatsAppNote: vi.fn(),
  markWhatsAppNoteSeen: vi.fn(),
  hasSeenSwipeHint: vi.fn(),
  markSwipeHintSeen: vi.fn(),
}))
vi.mock('@/lib/partners/vibrate', () => ({ tick: vi.fn(), buzz: vi.fn() }))
vi.mock('@/lib/analytics', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/analytics')>()),
  trackPartner: vi.fn(),
}))
vi.mock('@/services/api/partnerPools', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/api/partnerPools')>()),
  getMatches: vi.fn(),
}))
vi.mock('./PartnerCardStack', async () => {
  const { forwardRef, useImperativeHandle } = await import('react')
  return {
    PartnerCardStack: forwardRef(function Stack(p: Record<string, unknown>, ref) {
      h.props.stack = p
      useImperativeHandle(ref, () => ({ swipeTop: h.swipeTop, topElement: h.topElement }))
      return null
    }),
  }
})
vi.mock('./PartnerDetailDrawer', () => ({ PartnerDetailDrawer: h.recorder('detail') }))
vi.mock('./PartnerSearchDrawer', () => ({ PartnerSearchDrawer: h.recorder('search') }))
vi.mock('./PartnerMatchesDrawer', () => ({ PartnerMatchesDrawer: h.recorder('matches') }))
vi.mock('./PartnerMatchDialog', () => ({ PartnerMatchDialog: h.recorder('match') }))

import i18n from '@/i18n'
import { usePartnerDeck } from '@/hooks/usePartnerDeck'
import { trackPartner } from '@/lib/analytics'
import { buildWhatsAppLink } from '@/lib/partners/matchActions'
import { hasSeenSwipeHint, hasSeenWhatsAppNote, markSwipeHintSeen, markWhatsAppNoteSeen } from '@/lib/partners/storage'
import { makeCard, makeMatch, ok } from '@/lib/partners/testCards'
import { buzz } from '@/lib/partners/vibrate'
import { getMatches } from '@/services/api/partnerPools'
import { PartnerDeck } from './PartnerDeck'

const NOA = makeCard()
const MATCH = makeMatch()
const POOL = { id: 'pool-1', kind: 'tournament', tournament_id: 't-1', title: 'Summer Cup', is_open: true }
const VIEWER = { side: 'left_side', name: 'Dana Levi', avatarUrl: 'https://cdn/a-clean.jpg' }

function makeDeck(overrides: Partial<PartnerDeckState> = {}): PartnerDeckState {
  return {
    phase: 'ready',
    pool: POOL,
    poolId: 'pool-1',
    looking: true,
    matchCount: 0,
    cards: [NOA],
    needsGender: false,
    exhausted: false,
    canUndo: false,
    match: null,
    notice: null,
    swipe: vi.fn(async () => ({ ok: true, matched: false })),
    undo: vi.fn(async () => {}),
    setLooking: vi.fn(async () => {}),
    refresh: vi.fn(),
    retry: vi.fn(),
    dismissMatch: vi.fn(),
    clearNotice: vi.fn(),
    syncMatchCount: vi.fn(),
    ...overrides,
  }
}

function renderDeck(deck: PartnerDeckState) {
  const handlers = { onRegisterTogether: vi.fn(), onOpenTournament: vi.fn(), onEditProfile: vi.fn() }
  const ui = (d: PartnerDeckState) => {
    vi.mocked(usePartnerDeck).mockReturnValue(d)
    return (
      <MemoryRouter>
        <PartnerDeck tournamentId="t-1" viewer={VIEWER} {...handlers} />
      </MemoryRouter>
    )
  }
  const utils = render(ui(deck))
  return { ...handlers, rerenderWith: (d: PartnerDeckState) => utils.rerender(ui(d)) }
}

const toast = () => screen.queryByTestId('partner-toast')

beforeEach(() => {
  vi.clearAllMocks()
  for (const key of Object.keys(h.props)) delete h.props[key]
  h.motion.reduced = false
  vi.mocked(hasSeenWhatsAppNote).mockReturnValue(true)
  vi.mocked(hasSeenSwipeHint).mockReturnValue(true)
  h.prefetch.mockResolvedValue('https://rally.link/t-1')
  h.share.mockResolvedValue('shared')
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('PartnerDeck — the deck', () => {
  it('shows a spinner while the pool opens; the back link leads to the tournament', () => {
    renderDeck(makeDeck({ phase: 'loading', pool: null, poolId: null, cards: [] }))
    expect(screen.getByTestId('partner-deck-loading')).toBeInTheDocument()
    expect(screen.queryByTestId('partner-search-button')).toBeNull()
    expect(screen.queryByRole('switch')).toBeNull()
    expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute('href', '/tournaments/t-1')
  })

  it('titles the page and names the tournament under it', () => {
    renderDeck(makeDeck())
    expect(screen.getByRole('heading', { level: 1, name: 'Find a partner' })).toBeInTheDocument()
    expect(screen.getByText('Summer Cup')).toBeInTheDocument()
  })

  it('a match buzzes once, when it lands', () => {
    const deck = makeDeck()
    const { rerenderWith } = renderDeck(deck)
    expect(buzz).not.toHaveBeenCalled()
    const matched = { ...deck, match: MATCH }
    rerenderWith(matched)
    rerenderWith({ ...matched })
    expect(buzz).toHaveBeenCalledTimes(1)
  })

  it('deals the cards and you to the stack, with the keys on; a swipe there is a deck swipe', () => {
    const deck = makeDeck()
    renderDeck(deck)
    expect(h.props.stack.cards).toEqual([NOA])
    expect(h.props.stack.viewer).toEqual(VIEWER)
    expect(h.props.stack.keysEnabled).toBe(true)
    act(() => h.props.stack.onSwipe(NOA, 'like'))
    expect(deck.swipe).toHaveBeenCalledWith(NOA, 'like', 'deck')
  })

  it('X and the ball send the top card off through the stack, so it animates', () => {
    renderDeck(makeDeck())
    fireEvent.click(screen.getByTestId('partner-pass'))
    fireEvent.click(screen.getByTestId('partner-like'))
    expect(h.swipeTop.mock.calls).toEqual([['pass'], ['like']])
    expect(screen.getByTestId('partner-like')).toHaveAttribute('aria-keyshortcuts', 'ArrowRight')
  })

  it('undo calls the hook', () => {
    const deck = makeDeck({ canUndo: true })
    renderDeck(deck)
    fireEvent.click(screen.getByTestId('partner-undo'))
    expect(deck.undo).toHaveBeenCalledTimes(1)
  })

  it('says which arrow does what, left to right in both languages', () => {
    renderDeck(makeDeck())
    const hint = screen.getByTestId('partner-keys-hint')
    expect(hint).toHaveAttribute('dir', 'ltr')
    expect(hint.textContent).toBe('← Pass · → Like')
  })

  it('a clicked card opens the detail drawer and rests the keys; a swipe there closes it and is a detail swipe', () => {
    const deck = makeDeck()
    renderDeck(deck)
    expect(h.props.detail.card).toBeNull()
    act(() => h.props.stack.onOpen(NOA))
    expect(h.props.detail.card).toEqual(NOA)
    expect(h.props.stack.keysEnabled).toBe(false)
    act(() => h.props.detail.onSwipe(NOA, 'pass'))
    expect(h.props.detail.card).toBeNull()
    expect(deck.swipe).toHaveBeenCalledWith(NOA, 'pass', 'detail')
  })

  it("closing the detail drawer with its card gone hands focus to the stack's new top card", () => {
    renderDeck(makeDeck())
    const top = document.createElement('div')
    h.topElement.mockReturnValue(top)
    expect(h.props.detail.returnFocusFallback()).toBe(top)
  })

  it('the detail drawer closes when its card leaves the deck', () => {
    const { rerenderWith } = renderDeck(makeDeck())
    act(() => h.props.stack.onOpen(NOA))
    rerenderWith(makeDeck({ cards: [makeCard({ player_id: 'p-2' })] }))
    expect(h.props.detail.card).toBeNull()
  })

  it('the switch sets "looking"', () => {
    const deck = makeDeck({ looking: true })
    renderDeck(deck)
    const toggle = screen.getByRole('switch', { name: 'Looking for a partner' })
    expect(toggle).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(toggle)
    expect(deck.setLooking).toHaveBeenCalledWith(false)
  })

  it('search opens from the header and rests the keys; a like there is a search swipe', async () => {
    const deck = makeDeck()
    renderDeck(deck)
    expect(h.props.search.open).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: 'Search players' }))
    expect(h.props.search.open).toBe(true)
    expect(h.props.search.poolId).toBe('pool-1')
    expect(h.props.search.tournamentId).toBe('t-1')
    expect(h.props.stack.keysEnabled).toBe(false)
    await act(async () => {
      await h.props.search.onSwipe(NOA, 'like')
    })
    expect(deck.swipe).toHaveBeenCalledWith(NOA, 'like', 'search')
    act(() => h.props.search.onClose())
    expect(h.props.search.open).toBe(false)
  })

  it('the matches pill shows the count and opens the list, which keeps the count fresh', () => {
    const deck = makeDeck({ matchCount: 2 })
    renderDeck(deck)
    // Phones see only the count; the full phrase is the button's name at every width.
    expect(screen.getByTestId('partner-matches-button')).toHaveAccessibleName('2 matches')
    expect(h.props.matches.open).toBe(false)
    fireEvent.click(screen.getByTestId('partner-matches-button'))
    expect(h.props.matches.open).toBe(true)
    expect(h.props.matches.onLoaded).toBe(deck.syncMatchCount)
    expect(h.props.stack.keysEnabled).toBe(false)
  })
})

describe('PartnerDeck — when there is no card to show', () => {
  const EMPTY = { cards: [], exhausted: true }

  it("everyone seen: Invite a partner shares the tournament's link and counts a share that went out", async () => {
    renderDeck(makeDeck(EMPTY))
    expect(h.prefetch).toHaveBeenCalled()
    await act(async () => fireEvent.click(screen.getByTestId('partner-empty-invite')))
    expect(h.share).toHaveBeenCalledWith({
      title: 'Summer Cup',
      text: "I'm looking for a partner for Summer Cup on Rally. Want to play together?",
      fallbackUrl: `${window.location.origin}/tournaments/t-1`,
    })
    expect(trackPartner).toHaveBeenCalledWith('partner_invite', { tournament_id: 't-1' })
    expect(toast()).toBeNull()
  })

  it('no share sheet: the link is copied, said so, and counted', async () => {
    h.share.mockResolvedValue('copied')
    renderDeck(makeDeck(EMPTY))
    await act(async () => fireEvent.click(screen.getByTestId('partner-empty-invite')))
    expect(toast()).toHaveTextContent(i18n.t('tournament.tournamentLinkCopied'))
    expect(trackPartner).toHaveBeenCalledWith('partner_invite', { tournament_id: 't-1' })
  })

  it('a dismissed sheet is not counted; a failed one says so', async () => {
    h.share.mockResolvedValueOnce('dismissed').mockResolvedValueOnce('failed')
    renderDeck(makeDeck(EMPTY))
    await act(async () => fireEvent.click(screen.getByTestId('partner-empty-invite')))
    expect(toast()).toBeNull()
    await act(async () => fireEvent.click(screen.getByTestId('partner-empty-invite')))
    expect(toast()).toHaveTextContent('Something went wrong. Try again.')
    expect(trackPartner).not.toHaveBeenCalled()
  })

  it('everyone seen: Check again refreshes, and search is offered', () => {
    const deck = makeDeck(EMPTY)
    renderDeck(deck)
    expect(screen.getByTestId('partner-deck-empty')).toHaveTextContent("You've seen everyone")
    expect(screen.queryByTestId('partner-empty-undo')).toBeNull()
    fireEvent.click(screen.getByTestId('partner-empty-refresh'))
    expect(deck.refresh).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByTestId('partner-empty-search'))
    expect(h.props.search.open).toBe(true)
  })

  it('a pass on the last card can still be undone from the empty state', () => {
    const deck = makeDeck({ ...EMPTY, canUndo: true })
    renderDeck(deck)
    fireEvent.click(screen.getByTestId('partner-empty-undo'))
    expect(deck.undo).toHaveBeenCalledTimes(1)
  })

  it('a refill on its way shows the spinner, not the empty state', () => {
    renderDeck(makeDeck({ cards: [], exhausted: false }))
    expect(screen.getByTestId('partner-deck-loading')).toBeInTheDocument()
    expect(screen.queryByTestId('partner-deck-empty')).toBeNull()
    expect(h.prefetch).not.toHaveBeenCalled()
  })

  it("a mixed tournament without the viewer's gender asks for it; Check again re-fetches", () => {
    const deck = makeDeck({ ...EMPTY, needsGender: true })
    const { onEditProfile } = renderDeck(deck)
    expect(screen.getByTestId('partner-deck-needs-gender')).toHaveTextContent('Add your gender')
    fireEvent.click(screen.getByTestId('partner-edit-profile'))
    expect(onEditProfile).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByTestId('partner-needs-gender-refresh'))
    expect(deck.refresh).toHaveBeenCalledTimes(1)
  })

  it('closed: offers the matches when the pool id is known, and the way back', () => {
    const { onOpenTournament } = renderDeck(makeDeck({ phase: 'closed', pool: null, poolId: 'pool-1', cards: [] }))
    expect(screen.getByTestId('partner-deck-closed')).toBeInTheDocument()
    expect(screen.queryByRole('switch')).toBeNull()
    expect(screen.queryByTestId('partner-matches-button')).toBeNull()
    fireEvent.click(screen.getByTestId('partner-closed-matches'))
    expect(h.props.matches.open).toBe(true)
    fireEvent.click(screen.getByTestId('partner-closed-tournament'))
    expect(onOpenTournament).toHaveBeenCalledTimes(1)
  })

  it('closed with no known pool id: no matches button, and the list never opens', () => {
    renderDeck(makeDeck({ phase: 'closed', pool: null, poolId: null, cards: [] }))
    expect(screen.queryByTestId('partner-closed-matches')).toBeNull()
    expect(h.props.matches.open).toBe(false)
  })

  it('unavailable: says so and leads back to the tournament', () => {
    const { onOpenTournament } = renderDeck(makeDeck({ phase: 'unavailable', pool: null, poolId: null, cards: [] }))
    expect(screen.getByTestId('partner-deck-unavailable')).toHaveTextContent('Not available')
    fireEvent.click(screen.getByTestId('partner-unavailable-tournament'))
    expect(onOpenTournament).toHaveBeenCalledTimes(1)
  })

  it('error: the retry button reopens the pool', () => {
    const deck = makeDeck({ phase: 'error', pool: null, poolId: null, cards: [] })
    renderDeck(deck)
    fireEvent.click(screen.getByTestId('partner-deck-retry'))
    expect(deck.retry).toHaveBeenCalledTimes(1)
  })
})

describe('PartnerDeck — messages', () => {
  it('a notice from the hook shows as a toast, then is cleared', () => {
    const deck = makeDeck({ notice: 'rate_limited' })
    renderDeck(deck)
    expect(toast()).toHaveTextContent("You're swiping fast! Take a short break and try again.")
    expect(deck.clearNotice).toHaveBeenCalledTimes(1)
  })

  it('any other failure is the generic toast', () => {
    renderDeck(makeDeck({ notice: 'generic' }))
    expect(toast()).toHaveTextContent('Something went wrong. Try again.')
  })

  it('the WhatsApp note shows on the first deck ever and is remembered; Got it closes it', () => {
    vi.mocked(hasSeenWhatsAppNote).mockReturnValue(false)
    renderDeck(makeDeck())
    expect(screen.getByRole('dialog', { name: 'Before you start' })).toHaveTextContent(
      'If you match, your partner can message you on WhatsApp.',
    )
    expect(markWhatsAppNoteSeen).toHaveBeenCalledTimes(1)
    expect(h.props.stack.keysEnabled).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: 'Got it' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(h.props.stack.keysEnabled).toBe(true)
  })

  it('the note never shows again once seen', () => {
    renderDeck(makeDeck())
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(markWhatsAppNoteSeen).not.toHaveBeenCalled()
  })

  it('note and hint wait for the first deck that opens, and are checked once', () => {
    vi.mocked(hasSeenWhatsAppNote).mockReturnValue(false)
    const { rerenderWith } = renderDeck(makeDeck({ phase: 'loading', pool: null, poolId: null, cards: [] }))
    expect(hasSeenWhatsAppNote).not.toHaveBeenCalled()
    rerenderWith(makeDeck())
    rerenderWith(makeDeck({ cards: [NOA, makeCard({ player_id: 'p-2' })] }))
    expect(hasSeenWhatsAppNote).toHaveBeenCalledTimes(1)
    expect(hasSeenSwipeHint).toHaveBeenCalledTimes(1)
  })

  it('the swipe hint plays on the first deck ever, and is remembered once done', () => {
    vi.mocked(hasSeenSwipeHint).mockReturnValue(false)
    renderDeck(makeDeck())
    expect(h.props.stack.hint).toBe(true)
    act(() => h.props.stack.onHintDone())
    expect(markSwipeHintSeen).toHaveBeenCalledTimes(1)
    expect(h.props.stack.hint).toBe(false)
  })

  it('the hint never plays once seen', () => {
    renderDeck(makeDeck())
    expect(h.props.stack.hint).toBe(false)
  })

  it('the hint waits for the WhatsApp note to close, then plays', () => {
    vi.mocked(hasSeenWhatsAppNote).mockReturnValue(false)
    vi.mocked(hasSeenSwipeHint).mockReturnValue(false)
    renderDeck(makeDeck())
    expect(h.props.stack.hint).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: 'Got it' }))
    expect(h.props.stack.hint).toBe(true)
  })

  it('the hint holds while a drawer covers the card', () => {
    vi.mocked(hasSeenSwipeHint).mockReturnValue(false)
    renderDeck(makeDeck())
    act(() => h.props.stack.onOpen(NOA))
    expect(h.props.stack.hint).toBe(false)
  })

  it('under reduced motion the hint never plays, and stays unseen', () => {
    h.motion.reduced = true
    vi.mocked(hasSeenSwipeHint).mockReturnValue(false)
    renderDeck(makeDeck())
    expect(h.props.stack.hint).toBe(false)
    expect(h.props.stack.reducedMotion).toBe(true)
    expect(markSwipeHintSeen).not.toHaveBeenCalled()
  })
})

describe('PartnerDeck — a match', () => {
  it('the celebration gets the match and the tournament name, and rests the keys; Keep swiping dismisses it', () => {
    const deck = makeDeck({ match: MATCH })
    renderDeck(deck)
    expect(h.props.match.match).toBe(MATCH)
    expect(h.props.match.tournamentTitle).toBe('Summer Cup')
    expect(h.props.stack.keysEnabled).toBe(false)
    act(() => h.props.match.onClose())
    expect(deck.dismissMatch).toHaveBeenCalledTimes(1)
  })

  it('Register together re-checks the match, then hands the partner over', async () => {
    vi.mocked(getMatches).mockResolvedValue(ok([MATCH]))
    const deck = makeDeck({ match: MATCH })
    const { onRegisterTogether } = renderDeck(deck)
    act(() => h.props.match.onRegisterTogether(MATCH))
    await waitFor(() =>
      expect(onRegisterTogether).toHaveBeenCalledWith({ type: 'existing', id: 'p-1', displayName: 'Noa Levi', avatarUrl: null }),
    )
    expect(getMatches).toHaveBeenCalledWith('pool-1')
    expect(trackPartner).toHaveBeenCalledWith('partner_register_together', { tournament_id: 't-1', from: 'match' })
    expect(deck.dismissMatch).toHaveBeenCalled()
  })

  it('one request at a time: a second click while the check runs does nothing', async () => {
    let resolve!: (value: ReturnType<typeof ok<typeof MATCH[]>>) => void
    vi.mocked(getMatches).mockReturnValue(new Promise((r) => (resolve = r)))
    const { onRegisterTogether } = renderDeck(makeDeck({ match: MATCH }))
    act(() => h.props.match.onRegisterTogether(MATCH))
    act(() => h.props.match.onRegisterTogether(MATCH))
    await act(async () => resolve(ok([MATCH])))
    expect(getMatches).toHaveBeenCalledTimes(1)
    expect(onRegisterTogether).toHaveBeenCalledTimes(1)
  })

  it('already registered together since the match loaded: says so instead', async () => {
    vi.mocked(getMatches).mockResolvedValue(ok([makeMatch({ can_register_together: false, registered_together: true })]))
    const { onRegisterTogether } = renderDeck(makeDeck())
    fireEvent.click(screen.getByTestId('partner-matches-button'))
    act(() => h.props.matches.onRegisterTogether(MATCH))
    await waitFor(() => expect(toast()).toHaveTextContent("You're already registered with Noa Levi"))
    expect(onRegisterTogether).not.toHaveBeenCalled()
  })

  it('the match is gone (one of them registered with someone else): cannot register', async () => {
    vi.mocked(getMatches).mockResolvedValue(ok([]))
    const { onRegisterTogether } = renderDeck(makeDeck({ match: MATCH }))
    act(() => h.props.match.onRegisterTogether(MATCH))
    await waitFor(() => expect(toast()).toHaveTextContent("You can't register together anymore"))
    expect(onRegisterTogether).not.toHaveBeenCalled()
  })

  it('the check fails: the generic toast', async () => {
    vi.mocked(getMatches).mockRejectedValue({ status: 500 })
    renderDeck(makeDeck({ match: MATCH }))
    act(() => h.props.match.onRegisterTogether(MATCH))
    await waitFor(() => expect(toast()).toHaveTextContent('Something went wrong. Try again.'))
  })

  it('WhatsApp opens the link with the tournament line in a new tab, and is counted', () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    renderDeck(makeDeck({ match: MATCH }))
    act(() => h.props.match.onWhatsApp(MATCH))
    expect(open).toHaveBeenCalledWith(
      buildWhatsAppLink('https://wa.me/972501234567', 'Hi! We matched on Rally for Summer Cup. Register together?'),
      '_blank',
      'noopener,noreferrer',
    )
    expect(trackPartner).toHaveBeenCalledWith('partner_whatsapp_tap', { tournament_id: 't-1', from: 'match' })
  })

  it('from a closed pool, whose title is unknown, WhatsApp uses the short line', () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    renderDeck(makeDeck({ phase: 'closed', pool: null, poolId: 'pool-1', cards: [] }))
    fireEvent.click(screen.getByTestId('partner-closed-matches'))
    act(() => h.props.matches.onWhatsApp(MATCH))
    expect(open).toHaveBeenCalledWith(
      buildWhatsAppLink('https://wa.me/972501234567', 'Hi! We matched on Rally. Register together?'),
      '_blank',
      'noopener,noreferrer',
    )
    expect(trackPartner).toHaveBeenCalledWith('partner_whatsapp_tap', { tournament_id: 't-1', from: 'matches' })
  })
})
