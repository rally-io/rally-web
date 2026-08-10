import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAppSession } from '@/hooks/useAppSession'
import { useAuthGate } from '@/hooks/useAuthGate'
import { useTournamentParticipants } from '@/hooks/useTournamentParticipants'
import type { TournamentParticipantPair, TournamentParticipantPlayer } from '@/types/api'
import { Avatar } from './Avatar'
import { SignInRequiredPanel } from '@/components/auth/SignInRequiredPanel'

const INITIAL_VISIBLE = 3

function PlayerLine({ player }: { player: TournamentParticipantPlayer }) {
  const name = `${player.first_name ?? ''} ${player.last_name ?? ''}`.trim() || '—'
  return (
    <div className="flex items-center gap-2">
      <Avatar name={name} src={player.avatar_url} size={32} />
      {/* min-w-0 lets this flex child shrink below its content width — without
          it a long name pushes the numeral out of the card instead of
          wrapping. No truncate: sizing keeps every measured name on one line
          with slack to spare, and wrapping (not clipping) is the agreed
          fallback for a longer real-world name. */}
      <span className="flex-1 min-w-0 break-words text-sm text-rally-text">{name}</span>
      {!player.is_guest && player.skill_level != null && (
        <span dir="ltr" className="shrink-0 text-xs font-semibold text-rally-accent tabular-nums">
          {player.skill_level.toFixed(1)}
        </span>
      )}
    </div>
  )
}

function PairCard({ pair, index }: { pair: TournamentParticipantPair; index: number }) {
  return (
    <div className="rounded-2xl bg-rally-surface-2 border border-rally-border p-3 space-y-2.5 hover:border-rally-accent/40 transition-colors">
      <div className="flex items-center gap-2">
        <span className="inline-flex shrink-0 items-center justify-center w-6 h-6 rounded-full bg-rally-accent-dim border border-rally-accent/40 text-xs font-extrabold text-rally-accent">
          {index + 1}
        </span>
        {pair.team_name && (
          <span className="min-w-0 truncate text-[11px] uppercase tracking-wider text-rally-text-muted">
            {pair.team_name}
          </span>
        )}
      </div>
      <PlayerLine player={pair.player_1} />
      {pair.player_2 && <PlayerLine player={pair.player_2} />}
    </div>
  )
}

export function ParticipantsSection({ tournamentId }: { tournamentId: string }) {
  const { t } = useTranslation()
  const { status } = useAppSession()
  const { requireSignIn } = useAuthGate()
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)
  // Tracks the previous `expanded` value so the scroll-restore effect below
  // fires only on the expanded->collapsed transition, never on mount or on
  // expand.
  const wasExpandedRef = useRef(false)

  // The roster endpoint's auth dependency (get_consumer_user) 403s for
  // anyone without a Player row — that's signed-out visitors AND signed-in
  // users who haven't finished onboarding, not just the former. Only fetch
  // once useAppSession confirms a real, complete player session ('ready');
  // every other status withholds the request.
  const { data } = useTournamentParticipants(tournamentId, status === 'ready')

  // Scrolling must happen AFTER React commits the collapsed DOM, not inside
  // the click handler against the still-expanded tree — collapsing shortens
  // the page by ~13 rows, so a scroll position set synchronously in the
  // handler gets clamped near the new (shorter) bottom by the browser,
  // stranding the section above the viewport. Keying on `expanded` and
  // comparing to the previous value (via ref, not state, so this effect
  // itself never re-triggers a render) restricts the scroll to exactly the
  // expanded->collapsed transition — never on mount, never on expand.
  useEffect(() => {
    if (wasExpandedRef.current && !expanded) {
      const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      sectionRef.current?.scrollIntoView?.({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
    }
    wasExpandedRef.current = expanded
  }, [expanded])

  // Session/onboarding status is still resolving on first mount — avoid a
  // flash of either prompt for a visitor who resolves to 'ready' a moment later.
  if (status === 'loading') return null

  if (status === 'signed_out') {
    // There's no confirmed_count on the tournament detail payload either, so
    // we can't tell here whether the roster is empty — prompting is the
    // accepted tradeoff (see task report) rather than firing a second request.
    return (
      <section ref={sectionRef} className="scroll-mt-20">
        <h2 className="font-display text-2xl md:text-3xl font-bold text-rally-text mb-5">
          {t('tournament.participantsTitle')}
        </h2>
        <SignInRequiredPanel
          message={t('tournament.participantsSignInPrompt')}
          ctaLabel={t('auth.gate.sign_in_button')}
          onSignIn={() => {
            void requireSignIn().catch(() => {
              // USER_CANCELLED — section stays as-is.
            })
          }}
        />
      </section>
    )
  }

  if (status === 'profile_incomplete') {
    // Signed in, but no Player row yet — same panel, sign-in-specific copy
    // swapped for onboarding-specific copy, CTA goes straight to the form
    // instead of the auth gate (they're already authenticated).
    return (
      <section ref={sectionRef} className="scroll-mt-20">
        <h2 className="font-display text-2xl md:text-3xl font-bold text-rally-text mb-5">
          {t('tournament.participantsTitle')}
        </h2>
        <SignInRequiredPanel
          message={t('tournament.participantsCompleteProfilePrompt')}
          ctaLabel={t('user_menu.complete_profile')}
          onSignIn={() => navigate('/profile/edit')}
        />
      </section>
    )
  }

  // 'profile_error' (onboarding status failed to load) or anything future
  // and unhandled: stay silent rather than guess — matches this section's
  // existing "never surfaces an error" contract. The fetch above is already
  // withheld for every status except 'ready'.
  if (status !== 'ready') return null

  // Hidden entirely when empty, errored, or the API predates the endpoint.
  if (!data || data.confirmed_count === 0 || data.items.length === 0) return null

  const pairs = expanded ? data.items : data.items.slice(0, INITIAL_VISIBLE)
  const countLabel =
    data.format === 'singles'
      ? t('tournament.participantsCountPlayers', { count: data.confirmed_count })
      : t('tournament.participantsCountPairs', { count: data.confirmed_count })

  function handleToggle() {
    // Scroll restore on collapse is handled by the effect above, once the
    // shrunk DOM has actually committed — see the comment there.
    setExpanded((prev) => !prev)
  }

  return (
    <section ref={sectionRef} className="scroll-mt-20">
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <h2 className="font-display text-2xl md:text-3xl font-bold text-rally-text">
          {t('tournament.participantsTitle')}
        </h2>
        <span className="inline-flex items-center rounded-full border border-rally-accent/30 bg-rally-accent-dim px-3 py-1 text-xs font-semibold text-rally-text">
          {countLabel}
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {pairs.map((pair, i) => (
          <PairCard key={pair.registration_id} pair={pair} index={i} />
        ))}
      </div>
      {data.items.length > INITIAL_VISIBLE && (
        <button
          type="button"
          onClick={handleToggle}
          aria-expanded={expanded}
          className="mt-4 w-full rounded-xl border border-rally-border bg-rally-surface py-2.5 text-sm font-semibold text-rally-text hover:border-rally-accent/40 transition-colors"
        >
          {expanded
            ? t('tournament.participantsShowLess')
            : t('tournament.participantsShowAll', { count: data.items.length })}
        </button>
      )}
    </section>
  )
}
