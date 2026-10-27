import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Gift } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useAuthGate } from '@/hooks/useAuthGate'
import { trackElections, trackLead } from '@/lib/analytics'
import { cn } from '@/lib/utils'
import { BallotBox } from '@/features/elections/BallotBox'
import { BrandLogo } from '@/features/elections/BrandLogo'
import { ChainBallot } from '@/features/elections/ChainBallot'
import { ClubBallot } from '@/features/elections/ClubBallot'
import { Countdown } from '@/features/elections/Countdown'
import { LivePoll } from '@/features/elections/LivePoll'
import { ThankYou } from '@/features/elections/ThankYou'
import {
  ELECTION_WINNER_DATE,
  WHATSAPP_COMMUNITY_URL,
  getBrand,
  getClub,
  isVotingOpen,
} from '@/features/elections/config'
import { draftVote, pendingVote } from '@/features/elections/pendingVote'
import { isAlreadyVoted, useElectionVote } from '@/features/elections/useElectionVote'
import type { ElectionVote } from '@/features/elections/types'
import '@/features/elections/elections.css'

type Step = 'intro' | 'club' | 'chain' | 'review'
const STEPS: Step[] = ['intro', 'club', 'chain', 'review']

/** Minimum time the "slip into the ball" animation stays on screen. */
const DROP_MS = 1500

/**
 * /elections: "בחירות 2026", vote for Israel's best padel club and chain.
 *
 * Vote first, sign in last: the visitor fills both ballots anonymously and is
 * asked to sign in only when casting. The ballot is parked in localStorage
 * (pendingVote) so it survives the Google redirect and the email-verification
 * tab; once a signed-in session with no recorded vote shows up, it is cast
 * automatically.
 */
export default function ElectionsPage() {
  const { t } = useTranslation()
  const { session, user } = useAuth()
  const { requireSignIn } = useAuthGate()
  const { userId, myVote, submit } = useElectionVote()
  const [params, setParams] = useSearchParams()

  const stepParam = params.get('step') as Step | null
  const step: Step = stepParam && STEPS.includes(stepParam) ? stepParam : 'intro'

  const [clubId, setClubId] = useState<string | null>(
    () => pendingVote.get()?.club_id ?? draftVote.get().club_id,
  )
  const [chainId, setChainId] = useState<string | null>(
    () => pendingVote.get()?.chain_id ?? draftVote.get().chain_id,
  )

  useEffect(() => {
    draftVote.set(clubId, chainId)
  }, [clubId, chainId])

  const [phase, setPhase] = useState<'idle' | 'dropping' | 'done' | 'error'>('idle')
  const [result, setResult] = useState<{
    vote: ElectionVote | null
    already: boolean
  } | null>(null)
  const submittingRef = useRef(false)

  // Deep link to a later step without a club picked (refresh, shared URL): start over.
  const effectiveStep: Step = step !== 'intro' && step !== 'club' && !clubId ? 'club' : step

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [effectiveStep, phase])

  const goto = (next: Step) => {
    if (next === 'club' && step === 'intro') trackElections('start')
    setParams(next === 'intro' ? {} : { step: next })
  }

  const castVote = useCallback(
    async (vote: ElectionVote) => {
      if (submittingRef.current) return
      submittingRef.current = true
      setPhase('dropping')
      const started = Date.now()
      const settle = () =>
        new Promise((r) => setTimeout(r, Math.max(0, DROP_MS - (Date.now() - started))))
      try {
        const saved = await submit.mutateAsync(vote)
        pendingVote.clear()
        trackElections('vote', {
          club: vote.club_id,
          chain: vote.chain_id ?? 'none',
        })
        trackLead('elections', {
          segment: 'vote',
          email: user?.email ?? undefined,
        })
        await settle()
        setResult({ vote: saved ?? vote, already: false })
        setPhase('done')
      } catch (err) {
        pendingVote.clear()
        await settle()
        if (isAlreadyVoted(err)) {
          const fresh = await myVote.refetch()
          setResult({ vote: fresh.data ?? null, already: true })
          setPhase('done')
        } else {
          setPhase('error')
          submittingRef.current = false
        }
      }
    },
    [submit, user, myVote],
  )

  // Back from sign-in (modal, Google redirect, or the verification link): cast the parked ballot.
  useEffect(() => {
    if (!userId || !myVote.isSuccess || submittingRef.current) return
    if (myVote.data) {
      pendingVote.clear()
      return
    }
    const parked = pendingVote.get()
    if (parked && isVotingOpen()) void castVote(parked)
  }, [userId, myVote.isSuccess, myVote.data, castVote])

  const onCast = async () => {
    if (!clubId) return
    const vote: ElectionVote = { club_id: clubId, chain_id: chainId }
    pendingVote.set(vote)
    if (!session) {
      trackElections('signin_prompt')
      try {
        await requireSignIn()
        // Signed in inside the modal: the effect above casts it once my-vote has loaded.
      } catch (err) {
        // Sign-up by email continues on the verification page, and the link in the
        // email brings the voter back here to cast the parked ballot: keep it.
        if (!(err instanceof Error && err.message === 'LEFT_FOR_AUTH_PAGE')) pendingVote.clear()
      }
      return
    }
    void castVote(vote)
  }

  let body: ReactNode
  let wide = false
  // the club step widens on large screens to fit its photo rail beside the list
  let railWide = false
  if (phase === 'dropping') {
    body = (
      <div className="elx-step-in flex min-h-[70svh] flex-col items-center justify-center text-center">
        <BallotBox dropping label={getClub(clubId)?.name} />
        <p className="mt-6 font-display text-xl font-black">{t('elections.counting')}</p>
      </div>
    )
  } else if (phase === 'done' && result) {
    body = <ThankYou vote={result.vote} already={result.already} />
  } else if (userId && myVote.data) {
    body = <ThankYou vote={myVote.data} already />
  } else if (!isVotingOpen()) {
    body = <Closed />
  } else if (effectiveStep === 'intro') {
    wide = true
    body = <Intro onStart={() => goto('club')} />
  } else if (effectiveStep === 'club') {
    railWide = true
    body = (
      <BallotStep
        index={1}
        title={t('elections.club.title')}
        subtitle={t('elections.club.subtitle')}
        onBack={() => goto('intro')}
        footer={
          <StickyBar>
            <PickedLine brandId={getClub(clubId)?.brand} name={getClub(clubId)?.name} />
            <PrimaryButton disabled={!clubId} onClick={() => goto('chain')}>
              {clubId ? t('elections.club.next') : t('elections.club.pick_first')}
            </PrimaryButton>
          </StickyBar>
        }
      >
        <ClubBallot
          selected={clubId}
          onSelect={(id) => {
            setClubId(id)
            trackElections('pick_club', { club: id })
          }}
        />
      </BallotStep>
    )
  } else if (effectiveStep === 'chain') {
    body = (
      <BallotStep
        index={2}
        title={t('elections.chain.title')}
        subtitle={t('elections.chain.subtitle')}
        onBack={() => goto('club')}
        footer={
          <StickyBar>
            <PickedLine brandId={chainId ?? undefined} name={getBrand(chainId)?.name} />
            <PrimaryButton disabled={!chainId} onClick={() => goto('review')}>
              {chainId ? t('elections.chain.next') : t('elections.chain.pick_first')}
            </PrimaryButton>
            <button
              type="button"
              onClick={() => {
                setChainId(null)
                goto('review')
              }}
              className="mt-2 w-full text-center text-[13px] text-white/55 underline underline-offset-4"
            >
              {t('elections.chain.skip')}
            </button>
          </StickyBar>
        }
      >
        <ChainBallot
          selected={chainId}
          onSelect={(id) => {
            setChainId(id)
            trackElections('pick_chain', { chain: id })
          }}
        />
      </BallotStep>
    )
  } else {
    body = (
      <Review
        clubId={clubId}
        chainId={chainId}
        signedIn={!!session}
        error={phase === 'error'}
        busy={submit.isPending}
        onEdit={goto}
        onCast={onCast}
      />
    )
  }

  return (
    <div className="elx">
      <div
        className={cn(
          'relative mx-auto flex min-h-[100svh] max-w-md flex-col px-4 pb-4',
          wide
            ? 'md:max-w-6xl md:px-8'
            : railWide
              ? 'md:max-w-3xl lg:max-w-6xl lg:px-8'
              : 'md:max-w-3xl',
        )}
      >
        <header className="flex items-center justify-between py-4 [@media(max-width:767px)_and_(max-height:700px)]:py-3">
          <Link to="/" className="flex items-center gap-2" aria-label="Rally">
            <img
              src="/rally-logo.jpg"
              alt=""
              className="h-9 w-9 rounded-xl border border-white/10"
            />
            <span className="font-display text-xl font-black">Rally</span>
          </Link>
          <span className="rounded-full border border-white/15 px-3 py-1 font-display text-[12px] font-bold text-white/80">
            {t('elections.badge')}
          </span>
        </header>
        {body}
      </div>
    </div>
  )
}

function Intro({ onStart }: { onStart: () => void }) {
  const { t } = useTranslation()
  // Mobile: one column with a sticky CTA; spare height on tall phones is split
  // above and below the content (mt-auto / mb-auto), and short phones get tighter
  // type and gaps. Desktop (md+): headline + prize + CTA in the first column, a
  // large live poll filling the second.
  return (
    <div className="flex flex-1 flex-col md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] md:items-center md:gap-x-14 md:pb-16 md:pt-6">
      <div className="mt-auto md:col-start-1 md:row-start-1 md:mt-0">
        <h1 className="hero-rise hero-rise-1 text-center font-display text-[52px] font-black leading-[0.95] [@media(max-width:767px)_and_(max-height:700px)]:text-[42px] md:text-start md:text-[96px]">
          {t('elections.hero.title')}
        </h1>
        <div className="mt-3 text-center [@media(max-width:767px)_and_(max-height:700px)]:mt-2 md:mt-5 md:text-start">
          <span className="elx-sticker px-5 py-2.5 font-display text-[22px] font-black leading-tight [@media(max-width:767px)_and_(max-height:700px)]:py-2 [@media(max-width:767px)_and_(max-height:700px)]:text-[19px] md:px-7 md:py-3.5 md:text-[32px]">
            {t('elections.hero.sticker')}
          </span>
        </div>
        <p className="hero-rise hero-rise-2 mx-auto mt-4 max-w-[22rem] text-center text-[15px] leading-relaxed text-white/80 [@media(max-width:767px)_and_(max-height:700px)]:mt-2 [@media(max-width:767px)_and_(max-height:700px)]:text-[14px] [@media(max-width:767px)_and_(max-height:700px)]:leading-snug md:mx-0 md:mt-7 md:max-w-md md:text-start md:text-[20px]">
          {t('elections.hero.sub')}
        </p>
      </div>

      <div className="hero-rise hero-rise-3 mt-5 [@media(max-width:767px)_and_(max-height:700px)]:mt-3 md:col-start-2 md:row-span-2 md:row-start-1 md:mt-0">
        <LivePoll />
      </div>

      <div className="mb-auto md:col-start-1 md:row-start-2 md:mb-0 md:mt-8 md:self-start">
        <div className="hero-rise hero-rise-4 mt-4 flex items-center gap-3 rounded-2xl border border-rally-accent/30 bg-rally-accent/10 px-4 py-3 [@media(max-width:767px)_and_(max-height:700px)]:mt-3 [@media(max-width:767px)_and_(max-height:700px)]:py-2.5 md:mt-0 md:max-w-md md:px-5 md:py-4">
          <Gift className="h-6 w-6 shrink-0 text-rally-accent md:h-8 md:w-8" />
          <p className="text-[14px] leading-snug md:text-[17px]">
            <span className="font-bold">{t('elections.hero.prize')}</span>{' '}
            <span className="text-white/70">
              {t('elections.hero.prize_date', { date: ELECTION_WINNER_DATE })}
            </span>
          </p>
        </div>
        <div className="mt-6 hidden max-w-md md:block">
          <Countdown className="mb-3 justify-start" />
          <PrimaryButton onClick={onStart}>{t('elections.hero.cta')}</PrimaryButton>
        </div>
      </div>

      <StickyBar className="md:hidden">
        <div className="mb-2">
          <Countdown />
        </div>
        <PrimaryButton onClick={onStart}>{t('elections.hero.cta')}</PrimaryButton>
      </StickyBar>
    </div>
  )
}

function BallotStep({
  index,
  title,
  subtitle,
  onBack,
  footer,
  children,
}: {
  index: 1 | 2
  title: string
  subtitle: string
  onBack: () => void
  footer: ReactNode
  children: ReactNode
}) {
  const { t } = useTranslation()
  // The footer is a position:fixed bar. It must sit outside .elx-step-in: a
  // (filled) transform animation makes its node the containing block for fixed
  // descendants, which would pin the bar under the list instead of the screen.
  return (
    <div>
      <div className="elx-step-in">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            aria-label={t('elections.back')}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 rtl:rotate-180"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex flex-1 gap-1.5" aria-hidden>
            {[1, 2].map((i) => (
              <span
                key={i}
                className={cn(
                  'h-1.5 flex-1 rounded-full',
                  i <= index ? 'bg-rally-accent' : 'bg-white/15',
                )}
              />
            ))}
          </div>
        </div>
        <p className="mt-5 text-[13px] font-bold text-rally-accent">
          {t('elections.step', { index, total: 2 })}
        </p>
        <h1 className="mt-1 font-display text-[30px] font-black leading-tight">{title}</h1>
        <p className="mb-5 mt-1 text-[14px] text-white/70">{subtitle}</p>
        {children}
      </div>
      {footer}
    </div>
  )
}

function Review({
  clubId,
  chainId,
  signedIn,
  error,
  busy,
  onEdit,
  onCast,
}: {
  clubId: string | null
  chainId: string | null
  signedIn: boolean
  error: boolean
  busy: boolean
  onEdit: (step: Step) => void
  onCast: () => void
}) {
  const { t } = useTranslation()
  const club = getClub(clubId)
  const chain = getBrand(chainId)
  return (
    <div className="text-center">
      <div className="elx-step-in">
        <BallotBox />
        <h1 className="mt-2 font-display text-[30px] font-black leading-tight">
          {t('elections.review.title')}
        </h1>
        <p className="mt-1 text-[14px] text-white/70">{t('elections.review.subtitle')}</p>

        <div className="mt-5 space-y-3 text-start">
          {club && (
            <Slip
              label={t('elections.review.club')}
              brandId={club.brand}
              name={club.name}
              onEdit={() => onEdit('club')}
            />
          )}
          <Slip
            label={t('elections.review.chain')}
            brandId={chain?.id}
            name={chain?.name ?? t('elections.review.no_chain')}
            onEdit={() => onEdit('chain')}
          />
        </div>

        {error && <p className="mt-4 text-sm text-[#ff8a8a]">{t('elections.review.error')}</p>}
      </div>

      <StickyBar>
        <PrimaryButton onClick={onCast} disabled={busy}>
          {t('elections.review.cta')}
        </PrimaryButton>
        <p className="mt-2 text-center text-[12px] leading-snug text-white/55">
          {t(signedIn ? 'elections.review.note_signed_in' : 'elections.review.note_signin')}
        </p>
      </StickyBar>
    </div>
  )
}

function Slip({
  label,
  brandId,
  name,
  onEdit,
}: {
  label: string
  brandId?: string
  name: string
  onEdit: () => void
}) {
  const { t } = useTranslation()
  return (
    <div className="elx-paper flex items-center gap-3 px-3.5 py-3">
      {brandId ? (
        <BrandLogo brandId={brandId} className="h-11 w-11 text-sm" />
      ) : (
        <span className="h-11 w-11" />
      )}
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] text-[#141a2e]/55">{label}</span>
        <span className="block truncate font-display text-[15px] font-bold">{name}</span>
      </span>
      <button
        type="button"
        onClick={onEdit}
        className="relative z-10 text-[13px] font-bold text-rally-blue underline underline-offset-4"
      >
        {t('elections.review.edit')}
      </button>
    </div>
  )
}

function Closed() {
  const { t } = useTranslation()
  return (
    <div className="elx-step-in pt-6 text-center">
      <BallotBox />
      <h1 className="mt-4 font-display text-[34px] font-black">{t('elections.closed.title')}</h1>
      <p className="mt-2 text-[15px] text-white/75">
        {t('elections.closed.body', { date: ELECTION_WINNER_DATE })}
      </p>
      <a
        href={WHATSAPP_COMMUNITY_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackElections('whatsapp_click')}
        className="elx-wa mt-6 flex h-14 w-full items-center justify-center rounded-full font-display text-[17px] font-black text-white"
      >
        {t('elections.done.wa_cta')}
      </a>
    </div>
  )
}

/** "✓ <picked>" above the CTA, so the choice stays visible while the list scrolls. */
function PickedLine({ brandId, name }: { brandId?: string; name?: string }) {
  if (!brandId || !name) return null
  return (
    <div key={name} className="elx-step-in mb-2 flex items-center justify-center gap-2 text-[13px]">
      <BrandLogo brandId={brandId} className="h-6 w-6 text-[9px]" />
      <span className="truncate font-bold">{name}</span>
      <span className="text-rally-accent">✓</span>
    </div>
  )
}

/**
 * CTA bar pinned to the bottom of the phone screen. It renders an in-flow spacer
 * of its own measured height, so the page's last card scrolls exactly clear of
 * the bar on every device, with no guessed padding and no empty tail.
 */
function StickyBar({ children, className }: { children: ReactNode; className?: string }) {
  const barRef = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState(0)

  useLayoutEffect(() => {
    const el = barRef.current
    if (!el) return
    const measure = () => {
      setHeight(el.offsetHeight)
      // the club ballot's pinned photo column stops clear of this bar
      el.closest<HTMLElement>('.elx')?.style.setProperty('--elx-bar-h', `${el.offsetHeight}px`)
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <>
      <div aria-hidden className={className} style={{ height: height + 12 }} />
      <div
        ref={barRef}
        className={cn(
          // Solid behind the countdown and button so page text never shows through;
          // the short fade above it softens the edge while content scrolls under.
          "fixed inset-x-0 bottom-0 z-20 bg-[#040a1f] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 before:pointer-events-none before:absolute before:inset-x-0 before:-top-8 before:h-8 before:bg-gradient-to-t before:from-[#040a1f] before:to-transparent before:content-['']",
          className,
        )}
      >
        <div className="mx-auto max-w-md">{children}</div>
      </div>
    </>
  )
}

function PrimaryButton({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex h-14 w-full items-center justify-center rounded-full bg-rally-accent font-display text-[18px] font-black text-[#141a2e] shadow-glow-electric transition active:scale-[0.98] disabled:bg-[#26304f] disabled:text-white/60 disabled:shadow-none"
    >
      {children}
    </button>
  )
}
