import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Heart, Search } from 'lucide-react'
import { useReducedMotion } from '@/hooks/useMediaQuery'
import { usePartnerDeck } from '@/hooks/usePartnerDeck'
import { useTournamentShare } from '@/hooks/useTournamentShare'
import { trackPartner } from '@/lib/analytics'
import { buildWhatsAppLink, registerStateOf } from '@/lib/partners/matchActions'
import { hasSeenSwipeHint, hasSeenWhatsAppNote, markSwipeHintSeen, markWhatsAppNoteSeen } from '@/lib/partners/storage'
import { buzz } from '@/lib/partners/vibrate'
import { cn } from '@/lib/utils'
import { getMatches, unwrap } from '@/services/api/partnerPools'
import type { ExistingPartner } from '@/types/partner'
import type { PartnerCard, PartnerMatch } from '@/types/partnerPool'
import { DeckMessage, DeckSpinner, MessageButton } from './DeckMessage'
import { DeckToast, type DeckToastMessage } from './DeckToast'
import { PartnerActions } from './PartnerActions'
import type { CourtViewer } from './PartnerCard'
import { PartnerCardStack, type PartnerCardStackHandle } from './PartnerCardStack'
import { PartnerDeckHeader } from './PartnerDeckHeader'
import { PartnerDetailDrawer } from './PartnerDetailDrawer'
import { PartnerMatchDialog } from './PartnerMatchDialog'
import { PartnerMatchesDrawer } from './PartnerMatchesDrawer'
import { PartnerNoteDialog } from './PartnerNoteDialog'
import { PartnerSearchDrawer } from './PartnerSearchDrawer'

/** Where a match action was clicked, for analytics: the celebration or the matches list. */
type MatchActionSource = 'match' | 'matches'

interface PartnerDeckProps {
  tournamentId: string
  /** You, on each card's court. Undefined until the profile loads. */
  viewer?: CourtViewer
  /** The fresh check passed: go and register with this partner picked. */
  onRegisterTogether: (partner: ExistingPartner) => void
  onOpenTournament: () => void
  onEditProfile: () => void
}

/**
 * The partner finder for one tournament, ported from rally-mobile's PartnerDeckScreen. All state
 * lives in usePartnerDeck; this wires it to the stack, the drawers and the dialogs. Web
 * differences: failures are toasts rather than a dialog, there is no hardware back button (each
 * overlay closes on Escape), and the arrow keys swipe.
 */
export function PartnerDeck({ tournamentId, viewer, onRegisterTogether, onOpenTournament, onEditProfile }: PartnerDeckProps) {
  const { t } = useTranslation()
  const reducedMotion = useReducedMotion()
  const deck = usePartnerDeck(tournamentId)
  const { phase, pool, poolId, match, notice, clearNotice, dismissMatch } = deck
  const { prefetch, share } = useTournamentShare(tournamentId)
  const lookingLabelId = useId()

  const stackRef = useRef<PartnerCardStackHandle>(null)
  const registeringRef = useRef(false)
  const firstReadyRef = useRef(false)
  const toastIdRef = useRef(0)
  const [detailCard, setDetailCard] = useState<PartnerCard | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [matchesOpen, setMatchesOpen] = useState(false)
  const [noteOpen, setNoteOpen] = useState(false)
  // The swipe hint has never played in this browser (checked on the first deck that opens).
  const [hintPending, setHintPending] = useState(false)
  const [toast, setToast] = useState<DeckToastMessage | null>(null)

  const showToast = useCallback((text: string) => {
    toastIdRef.current += 1
    setToast({ id: toastIdRef.current, text })
  }, [])

  // One toast per failed action, cleared so it shows once.
  useEffect(() => {
    if (!notice) return
    showToast(t(notice === 'rate_limited' ? 'partners.error.rateLimited' : 'partners.error.generic'))
    clearNotice()
  }, [notice, clearNotice, showToast, t])

  // A match lands with a buzz. `match` is set once per matching swipe, so this fires once each.
  useEffect(() => {
    if (match) buzz()
  }, [match])

  // The one-time WhatsApp note, then the one-time swipe hint: both checked once, on the first
  // deck that opens. The note counts as seen once shown, as in the app.
  useEffect(() => {
    if (phase !== 'ready' || firstReadyRef.current) return
    firstReadyRef.current = true
    if (!hasSeenWhatsAppNote()) {
      setNoteOpen(true)
      markWhatsAppNoteSeen()
    }
    if (!hasSeenSwipeHint()) setHintPending(true)
  }, [phase])
  const hintDone = useCallback(() => {
    setHintPending(false)
    markSwipeHintSeen()
  }, [])

  // The drawer's card can leave the deck while it is open (dragged away, or liked from search):
  // close it, or its footer would send a second swipe for that player.
  useEffect(() => {
    if (detailCard && !deck.cards.some((c) => c.player_id === detailCard.player_id)) setDetailCard(null)
  }, [detailCard, deck.cards])

  // The list needs a pool id; on a closed pool it is the remembered one.
  const matchesVisible = matchesOpen && poolId !== null
  const covered = noteOpen || match !== null || detailCard !== null || searchOpen || matchesVisible
  // The hint plays only on a card nothing covers, and never under reduced motion, where it
  // stays pending. The arrow keys rest while anything covers the card.
  const showHint = hintPending && !reducedMotion && !covered
  const showEmpty = deck.cards.length === 0 && !deck.needsGender && deck.exhausted && phase === 'ready'

  // Fetch the share link as soon as the empty state offers it, so Invite can share inside the
  // click (iOS Safari needs that: useTournamentShare).
  useEffect(() => {
    if (showEmpty) void prefetch()
  }, [showEmpty, prefetch])

  const registerTogether = async (m: PartnerMatch, from: MatchActionSource) => {
    if (!poolId || registeringRef.current) return
    registeringRef.current = true
    try {
      // Re-check first: the partner may have registered since this match loaded.
      const fresh = unwrap(await getMatches(poolId)).find((x) => x.player.player_id === m.player.player_id)
      const state = fresh ? registerStateOf(fresh) : 'none'
      if (state === 'register') {
        trackPartner('partner_register_together', { tournament_id: tournamentId, from })
        dismissMatch()
        onRegisterTogether({
          type: 'existing',
          id: m.player.player_id,
          displayName: m.player.name,
          avatarUrl: m.player.avatar_url,
        })
        return
      }
      showToast(
        state === 'already' ? t('partners.match.alreadyRegistered', { name: m.player.name }) : t('partners.match.cannotRegister'),
      )
    } catch {
      showToast(t('partners.error.generic'))
    } finally {
      registeringRef.current = false
    }
  }

  const openWhatsApp = (m: PartnerMatch, from: MatchActionSource) => {
    if (!m.whatsapp_url) return
    trackPartner('partner_whatsapp_tap', { tournament_id: tournamentId, from })
    // A closed pool never told this deck its title: use the line without it.
    const text = pool ? t('partners.whatsappText', { tournament: pool.title }) : t('partners.whatsappTextShort')
    window.open(buildWhatsAppLink(m.whatsapp_url, text), '_blank', 'noopener,noreferrer')
  }

  // The deck ran out: bring a friend in. The link opens the tournament page (not the deck), where
  // they can register with the sharer or open the finder themselves. Counted only when it went out.
  const invite = async () => {
    const result = await share({
      title: pool?.title ?? t('partners.title'),
      text: t('partners.inviteMessage', { name: pool?.title ?? '' }),
      fallbackUrl: `${window.location.origin}/tournaments/${tournamentId}`,
    })
    if (result === 'shared' || result === 'copied') trackPartner('partner_invite', { tournament_id: tournamentId })
    if (result === 'copied') showToast(t('tournament.tournamentLinkCopied'))
    if (result === 'failed') showToast(t('partners.error.generic'))
  }

  const renderBody = (): ReactNode => {
    if (phase === 'loading') return <DeckSpinner />
    if (phase === 'error') {
      return (
        <DeckMessage testId="partner-deck-error" title={t('partners.error.title')} body={t('partners.error.generic')}>
          <MessageButton testId="partner-deck-retry" onClick={deck.retry} primary>
            {t('partners.error.retry')}
          </MessageButton>
        </DeckMessage>
      )
    }
    if (phase === 'unavailable') {
      return (
        <DeckMessage testId="partner-deck-unavailable" title={t('partners.unavailable.title')} body={t('partners.unavailable.body')}>
          <MessageButton testId="partner-unavailable-tournament" onClick={onOpenTournament} primary>
            {t('partners.closed.backToTournament')}
          </MessageButton>
        </DeckMessage>
      )
    }
    if (phase === 'closed') {
      return (
        <DeckMessage testId="partner-deck-closed" title={t('partners.closed.title')} body={t('partners.closed.body')}>
          {poolId && (
            <MessageButton testId="partner-closed-matches" onClick={() => setMatchesOpen(true)} primary>
              {t('partners.closed.openMatches')}
            </MessageButton>
          )}
          <MessageButton testId="partner-closed-tournament" onClick={onOpenTournament}>
            {t('partners.closed.backToTournament')}
          </MessageButton>
        </DeckMessage>
      )
    }
    if (deck.cards.length > 0) {
      return (
        <>
          <PartnerCardStack
            ref={stackRef}
            cards={deck.cards}
            reducedMotion={reducedMotion}
            viewer={viewer}
            hint={showHint}
            onHintDone={hintDone}
            keysEnabled={!covered}
            onSwipe={(card, decision) => void deck.swipe(card, decision, 'deck')}
            onOpen={setDetailCard}
          />
          <div className="pt-5">
            <PartnerActions
              onPass={() => stackRef.current?.swipeTop('pass')}
              onLike={() => stackRef.current?.swipeTop('like')}
              onUndo={() => void deck.undo()}
              canUndo={deck.canUndo}
              keyShortcuts
            />
            {/* The keys are physical in both languages, so the hint reads left to right; each
                label is isolated so a Hebrew word cannot pull the arrows around it. */}
            <p dir="ltr" data-testid="partner-keys-hint" className="mt-3 hidden text-center text-xs text-rally-text-muted md:block">
              ← <bdi>{t('partners.pass')}</bdi> · → <bdi>{t('partners.like')}</bdi>
            </p>
          </div>
        </>
      )
    }
    if (deck.needsGender) {
      return (
        <DeckMessage testId="partner-deck-needs-gender" title={t('partners.needsGender.title')} body={t('partners.needsGender.body')}>
          <MessageButton testId="partner-edit-profile" onClick={onEditProfile} primary>
            {t('partners.needsGender.action')}
          </MessageButton>
          <MessageButton testId="partner-needs-gender-refresh" onClick={deck.refresh}>
            {t('partners.empty.refresh')}
          </MessageButton>
        </DeckMessage>
      )
    }
    if (deck.exhausted) {
      return (
        <DeckMessage testId="partner-deck-empty" title={t('partners.empty.title')} body={t('partners.empty.body')}>
          <MessageButton testId="partner-empty-refresh" onClick={deck.refresh} primary>
            {t('partners.empty.refresh')}
          </MessageButton>
          <MessageButton testId="partner-empty-invite" onClick={() => void invite()}>
            {t('partners.empty.invite')}
          </MessageButton>
          <MessageButton testId="partner-empty-search" onClick={() => setSearchOpen(true)}>
            {t('partners.search')}
          </MessageButton>
          {deck.canUndo && (
            <MessageButton testId="partner-empty-undo" onClick={() => void deck.undo()}>
              {t('partners.undo')}
            </MessageButton>
          )}
        </DeckMessage>
      )
    }
    // The queue ran dry and a refill is on its way.
    return <DeckSpinner />
  }

  return (
    <div data-testid="partner-deck" className="flex flex-1 flex-col">
      <PartnerDeckHeader tournamentId={tournamentId} subtitle={pool?.title}>
        {phase === 'ready' && (
          <>
            {/* Below sm the pill shows only the count, or "Find a partner" gets clipped at 375px. */}
            <button
              type="button"
              onClick={() => setMatchesOpen(true)}
              aria-label={t('partners.matchesCount', { count: deck.matchCount })}
              data-testid="partner-matches-button"
              className="flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border border-rally-border px-3 text-[13px] font-extrabold text-rally-text transition hover:border-rally-accent/50"
            >
              <Heart aria-hidden className="h-4 w-4 fill-rally-accent text-rally-accent" />
              <span aria-hidden className="sm:hidden">
                {deck.matchCount}
              </span>
              <span aria-hidden className="hidden sm:inline">
                {t('partners.matchesCount', { count: deck.matchCount })}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label={t('partners.search')}
              data-testid="partner-search-button"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-rally-text transition hover:bg-rally-surface-2"
            >
              <Search aria-hidden className="h-5 w-5" />
            </button>
          </>
        )}
      </PartnerDeckHeader>

      {phase === 'ready' && (
        <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl bg-rally-surface-2 px-4 py-2.5">
          <span id={lookingLabelId} className="text-[15px] font-bold text-rally-text">
            {t('partners.looking')}
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={deck.looking}
            aria-labelledby={lookingLabelId}
            onClick={() => void deck.setLooking(!deck.looking)}
            data-testid="partner-looking-switch"
            className={cn(
              'relative h-7 w-12 shrink-0 rounded-full transition-colors',
              deck.looking ? 'bg-rally-accent' : 'bg-rally-border',
            )}
          >
            <span
              aria-hidden
              className={cn(
                'absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all',
                deck.looking ? 'start-6' : 'start-1',
              )}
            />
          </button>
        </div>
      )}

      <div className="flex flex-1 flex-col">{renderBody()}</div>

      {/* Overlays, bottom to top. */}
      <PartnerDetailDrawer
        card={detailCard}
        onClose={() => setDetailCard(null)}
        onSwipe={(card, decision) => {
          setDetailCard(null)
          void deck.swipe(card, decision, 'detail')
        }}
        returnFocusFallback={() => stackRef.current?.topElement() ?? null}
      />
      <PartnerSearchDrawer
        open={searchOpen}
        poolId={poolId}
        tournamentId={tournamentId}
        onClose={() => setSearchOpen(false)}
        onSwipe={(card, decision) => deck.swipe(card, decision, 'search')}
      />
      <PartnerMatchesDrawer
        open={matchesVisible}
        poolId={poolId}
        onClose={() => setMatchesOpen(false)}
        onRegisterTogether={(m) => void registerTogether(m, 'matches')}
        onWhatsApp={(m) => openWhatsApp(m, 'matches')}
        onLoaded={deck.syncMatchCount}
      />
      <PartnerMatchDialog
        match={match}
        tournamentTitle={pool?.title ?? ''}
        onRegisterTogether={(m) => void registerTogether(m, 'match')}
        onWhatsApp={(m) => openWhatsApp(m, 'match')}
        onClose={dismissMatch}
      />
      <PartnerNoteDialog open={noteOpen} onClose={() => setNoteOpen(false)} />
      <DeckToast toast={toast} onDone={() => setToast(null)} />
    </div>
  )
}
