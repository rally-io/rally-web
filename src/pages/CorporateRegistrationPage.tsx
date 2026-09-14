import {
  useEffect, useRef, useState,
  type FormEvent, type MutableRefObject, type ReactNode,
} from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, CreditCard, Info, Pencil, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTournament } from '@/hooks/useTournament'
import { useAuthGate } from '@/hooks/useAuthGate'
import { useAppSession } from '@/hooks/useAppSession'
import { useRegistrationGate } from '@/features/screenMessages/hooks/useRegistrationGate'
import { ScreenMessageList } from '@/features/screenMessages/components/ScreenMessageList'
import { ScreenMessageModalHost } from '@/features/screenMessages/components/ScreenMessageModalHost'
import { PartnerSection } from '@/components/tournaments/PartnerSection'
import { useTournamentRegistration, type RegistrationGate } from '@/hooks/useTournamentRegistration'
import { useEnsureProfileEssentials } from '@/hooks/useEnsureProfileEssentials'
import { ctaFor } from '@/lib/tournamentCta'
import { isRegistrationOpen, formatCurrency } from '@/lib/tournamentHelpers'
import { rememberAuthReturnTo } from '@/lib/authReturn'
import { EventHero } from '@/components/corporate/EventHero'
import { EvidencePicker } from '@/components/corporate/EvidencePicker'
import { ProfileDetailsModal, type SavedProfileEssentials } from '@/components/corporate/ProfileDetailsModal'
import { readProfileDetails } from '@/components/corporate/profileDetails'
import { RallyWordmark } from '@/components/corporate/RallyWordmark'
import { AppDownloadFooter } from '@/components/corporate/AppDownloadFooter'
import { uploadRegistrationEvidence } from '@/services/api/registrationEvidence'
import { isWaiverOffered, validateEvidenceFiles, waivedAmount } from '@/lib/evidenceRules'
import type { CorporateFeeWaiver } from '@/constants/corporateFeeWaiver'
import type { CorporateTournamentEvent } from '@/constants/corporateEvents'
import type { PartnerSelectionState } from '@/types/partner'
import type {
  FeeWaiverRequest, MyRegistration, TournamentDetail, TournamentRegistrationResult,
} from '@/types/api'

// The only gate action web can reach — same constant TournamentDetailPage uses.
const REGISTRATION_GATE_ACTION = 'tournament_registration' as const

/**
 * Unlisted registration page for a closed corporate tournament: /join/<slug>
 * in tournament mode. Same brief as the lead page (no site nav, no app gate,
 * the client's hero) but every submission is a real tournament_registrations
 * row with a Grow pre-auth hold on it. Composes the pieces TournamentDetailPage
 * already runs: the sign-in gate, PartnerSection, the terms gate, the shared
 * register hook and the payment pages.
 */
export default function CorporateRegistrationPage({ event }: { event: CorporateTournamentEvent }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { data: tr, isLoading, isError, refetch } = useTournament(event.tournamentId)
  const { requireSignIn } = useAuthGate()
  const { status: sessionStatus, playerProfile, refetchOnboarding } = useAppSession()
  const gate = useRegistrationGate({ scope: 'tournament', id: tr?.id }, REGISTRATION_GATE_ACTION)
  const returnTo = `/join/${event.slug}`
  /**
   * The register hook lives on the page (it needs the tournament and the router)
   * but the fee-waiver state — how many residents were declared, and the file
   * each picker holds — lives in the form. Rather than lift all of that up, the
   * form parks its upload closure here immediately before it calls
   * `register(...)`, and `onRegistered` runs it against the registration row the
   * hook has just created. It is null for every registration without a declared
   * waiver, so that path stays exactly what it was.
   */
  const pendingUploadRef = useRef<((reg: TournamentRegistrationResult) => Promise<void>) | null>(null)
  const registration = useTournamentRegistration(tr, gate, {
    returnTo,
    skipProfileRedirect: true,
    onRegistered: (reg) => pendingUploadRef.current?.(reg),
    onTournamentFull: () => {
      void queryClient.invalidateQueries({ queryKey: ['tournament', event.tournamentId] })
    },
  })
  /**
   * Once the form has been shown, it stays: the readiness skeleton below is a
   * COLD-LOAD guard only. Mid-submit on a fresh account, `ensure()` ends with
   * `refetchOnboarding()`, which flips `has_player_profile` — so the session
   * re-enters its "profile not in hand" window a beat before
   * ['player-profile-me'] resolves, and an unguarded skeleton would unmount the
   * form under the user with `register` still in flight, taking the partner
   * selection, the typed fields and any register error with it.
   */
  const hasShownFormRef = useRef(false)

  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)
    return () => {
      document.head.removeChild(meta)
    }
  }, [])

  const flatName = event.tournamentName.replace(/\s+/g, ' ').trim()
  useEffect(() => {
    const previous = document.title
    document.title = `${flatName} · ${event.company}`
    return () => {
      document.title = previous
    }
  }, [flatName, event.company])

  if (isLoading) {
    return (
      <main className="min-h-screen bg-rally-bg">
        <EventHero event={event} />
        <section className="px-4 pt-6 pb-10">
          <div className="mx-auto w-full max-w-xl h-64 rounded-2xl bg-rally-surface animate-pulse" data-testid="corporate-loading" />
        </section>
      </main>
    )
  }

  if (isError || !tr) {
    return (
      <main className="min-h-screen bg-rally-bg flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <RallyWordmark className="mx-auto mb-8" />
          <h1 className="font-display text-2xl sm:text-3xl font-black text-rally-text mb-3">
            {t('corporate.notFoundTitle')}
          </h1>
          <p className="text-rally-text-2 leading-relaxed">{t('corporate.notFoundBody')}</p>
        </div>
      </main>
    )
  }

  const myReg = (tr.my_registration ?? null) as MyRegistration | null
  // The detail page's `isOpen` is deadline-only. This page also has to render an
  // `approved` (not yet open) tournament honestly — the link goes out before the
  // cron flips it — so the status is checked too when the API sends it.
  const open =
    isRegistrationOpen(tr.registration_deadline) &&
    (tr.status == null || tr.status === 'registration_open')
  const isFull = tr.is_full === true
  const cta = ctaFor({
    isOpen: open, isFull, waitlistEnabled: false, myWaitlistEntry: null, myRegistration: myReg,
  })

  let body: ReactNode
  // Only true for the branch below — the one place a *post-refetch* register
  // error (I2: a failed confirm-zero on the ₪0 waiver path) can land after the
  // form has already been swapped out from under it. Deliberately narrow: a
  // TOURNAMENT_FULL race sets `registerError` too and also drives the page to
  // the "full" InfoCard via `onTournamentFull`'s refetch, and that card must
  // never show a second, unrelated "the tournament is full" line underneath it
  // — the full card already says so.
  let isRegisteredCard = false
  if (cta === 'my_registration' && myReg) {
    isRegisteredCard = true
    body = <RegisteredCard tr={tr} myReg={myReg} returnTo={returnTo} refetchTournament={refetch} />
  } else if (!open) {
    const notYet = tr.status === 'approved'
    body = (
      <InfoCard
        title={t(notYet ? 'corporate.reg.notOpenTitle' : 'corporate.reg.closedTitle')}
        body={t(notYet ? 'corporate.reg.notOpenBody' : 'corporate.reg.closedBody')}
      />
    )
  } else if (isFull) {
    body = <InfoCard title={t('corporate.reg.fullTitle')} body={t('corporate.reg.fullBody')} />
  } else if (sessionStatus === 'signed_out') {
    body = (
      <div className="rounded-2xl bg-rally-surface border border-rally-border p-6 sm:p-8 text-center shadow-lg">
        <p className="text-2xl font-black text-rally-accent mb-1">{formatCurrency(tr.entry_fee)}</p>
        <p className="text-sm text-rally-text-2">{t('corporate.reg.priceLabel')}</p>
        {isWaiverOffered(event.feeWaiver, tr.fee_waiver_type) && (
          <p className="text-sm text-rally-accent font-bold mt-2">{t('corporate.reg.signInWaiverHint')}</p>
        )}
        <div className="mb-6" />
        <button
          type="button"
          onClick={() => {
            // Belt and braces. AuthGateModal already passes this page's own
            // location to AuthFlow as `next`, which travels in the OAuth /
            // verification URL, so the stash is not what brings the employee
            // back here. It is the fallback for a sign-in that reaches
            // /auth/callback with no `?next=` at all (a Supabase redirect
            // allowlist that drops the query variant).
            rememberAuthReturnTo(returnTo)
            void requireSignIn()
              .then(() => refetchOnboarding())
              .catch(() => {
                // USER_CANCELLED or SUPERSEDED — stay on the page as-is.
              })
          }}
          className="w-full h-12 rounded-full bg-rally-accent text-rally-accent-text font-display font-bold text-base shadow-glow-electric hover:bg-rally-accent-hover transition-colors"
        >
          {t('corporate.reg.signInCta')}
        </button>
        <p className="text-xs text-rally-text-muted mt-3">{t('corporate.reg.signInHint')}</p>
      </div>
    )
  } else if (
    (sessionStatus === 'loading' || (sessionStatus === 'ready' && !playerProfile)) &&
    !hasShownFormRef.current
  ) {
    // Two shapes of the same window: the session knows the player HAS a profile
    // but the profile itself is not in hand yet. Rendering the form there would
    // show blank, editable phone/level fields (both locks read false against an
    // absent profile) and a submit would patch over the stored values.
    // Which shape depends on AppSessionContext: it reports 'loading' while
    // ['player-profile-me'] is in flight, and 'ready' with a null profile only
    // if that ever changes back. Both are guarded the same way.
    // The `hasShownFormRef` guard is the load-bearing part: this is a COLD-LOAD
    // skeleton only. The same window reopens mid-submit on a fresh account —
    // `ensure()` creates the profile, `refetchOnboarding()` flips
    // has_player_profile, and the profile query starts — and taking the form
    // away there is the bug, not the guard: `register` is still in flight and
    // the partner selection and typed fields would go with it.
    // `profile_incomplete` has no profile by definition and must still get the form.
    body = <div className="h-64 rounded-2xl bg-rally-surface animate-pulse" data-testid="corporate-loading" />
  } else if (sessionStatus === 'profile_error') {
    body = (
      <InfoCard title={t('corporate.reg.sessionError')} body="">
        <button type="button" onClick={() => void refetchOnboarding()} className="mt-4 text-sm font-bold text-rally-accent">
          {t('corporate.reg.retry')}
        </button>
      </InfoCard>
    )
  } else {
    hasShownFormRef.current = true
    body = (
      <RegistrationForm
        tr={tr}
        gate={gate}
        feeWaiver={event.feeWaiver}
        pendingUpload={pendingUploadRef}
        refetchTournament={refetch}
        register={registration.register}
        isRegistering={registration.isRegistering}
        registerError={registration.registerError}
        gateError={registration.gateError}
      />
    )
  }

  return (
    <main className="min-h-screen bg-rally-bg">
      <EventHero event={event} fallbackImage={tr.image_url} />
      <ScreenMessageList
        query={{ scope: 'tournament', id: tr.id }}
        className="container mx-auto px-4 max-w-xl mt-6"
        selection={{ action: REGISTRATION_GATE_ACTION, selectedIds: gate.selectedIds, onToggle: gate.toggle }}
      />
      <ScreenMessageModalHost
        query={{ scope: 'tournament', id: tr.id }}
        selection={{ action: REGISTRATION_GATE_ACTION, selectedIds: gate.selectedIds, onToggle: gate.toggle }}
      />
      <section className="relative px-4 pt-6 pb-10">
        <div className="mx-auto w-full max-w-xl">
          {body}
          {isRegisteredCard && registration.registerError && (
            <p role="alert" className="mt-3 text-sm text-rally-error text-center">
              {registration.registerError}
            </p>
          )}
        </div>
      </section>
      <AppDownloadFooter />
    </main>
  )
}

function InfoCard({ title, body, children }: { title: string; body: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl bg-rally-surface border border-rally-border p-6 sm:p-8 text-center shadow-lg">
      <Info className="w-10 h-10 text-rally-accent mb-3 mx-auto" />
      <h2 className="font-display text-xl sm:text-2xl font-black text-rally-text mb-2">{title}</h2>
      {body && <p className="text-sm text-rally-text-2 leading-relaxed">{body}</p>}
      {children}
      <SiteLink className="mt-5" />
    </div>
  )
}

/**
 * The page has no site navigation on purpose (it is a branded landing), so
 * every card a player can end on needs its own way back to Rally — after the
 * Grow hold returns them here there is otherwise nowhere to go.
 */
function SiteLink({ className }: { className?: string }) {
  const { t } = useTranslation()
  return (
    <Link to="/tournaments?tab=my" className={cn('block text-sm text-rally-text-2 underline underline-offset-4 hover:text-rally-accent', className)}>
      {t('corporate.reg.backToSite')}
    </Link>
  )
}

/**
 * Statuses that must never read as "You're in". `ctaFor` returns `my_registration`
 * for ANY truthy registration, so without this list a cancelled/withdrawn/rejected/
 * disqualified row would fall through the payState branches into the "confirmed"
 * copy and tell someone they have a place they do not have.
 * Every value here is a member of rally-api's `TournamentRegistrationStatus`
 * (registered, confirmed, checked_in, withdrawn, rejected, disqualified,
 * payment_pending, cancelled) — the waiting list is a separate table with its own
 * statuses and never reaches `my_registration`.
 * Each value has a `tournament.registrationStatus_<status>` key in both locales.
 */
const NON_CONFIRMED_STATUSES: string[] = [
  'cancelled', 'withdrawn', 'rejected', 'disqualified',
]

function RegisteredCard({
  tr, myReg, returnTo, refetchTournament,
}: {
  tr: TournamentDetail
  myReg: MyRegistration
  returnTo: string
  /** Re-reads the tournament after an add-evidence upload, the same `refetch`
   *  the form uses — the card needs it so a slot's count updates live. */
  refetchTournament: () => Promise<unknown>
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  // After both hooks — an early return before them would break the hooks order.
  if (NON_CONFIRMED_STATUSES.includes(myReg.status)) {
    return (
      <InfoCard
        title={t(`tournament.registrationStatus_${myReg.status}`)}
        body={t('corporate.reg.terminalBody')}
      />
    )
  }

  const seats: 1 | 2 = tr.format === 'singles' ? 1 : 2
  const residents = (myReg.fee_waiver_resident_count ?? 0) as 0 | 1 | 2
  const amountDue = waivedAmount(tr.entry_fee, seats, residents)
  // Guarded by `residents > 0`: a `fee_waiver_status` with no declared resident
  // count (null/0 — malformed, should not happen, but the type allows it) has
  // nothing to say "waiting on residency" ABOUT — printing "(0/2)" would be
  // worse than falling through to today's plain status logic below.
  const waiverPending = myReg.fee_waiver_status === 'pending' && residents > 0
  // A waiver that has already zeroed the price must never offer payment,
  // whether the club has confirmed residency yet or not (the truthful ₪0
  // case — most often both players are residents).
  const waiverZero = (waiverPending || myReg.fee_waiver_status === 'approved') && amountDue === 0

  // Same rule TournamentDetailPage uses for its "Pay now" bar.
  const payState =
    !waiverZero &&
    (myReg.status === 'payment_pending' ||
      myReg.status === 'approved' ||
      (myReg.status === 'registered' &&
        myReg.payment_status !== 'payment_held' &&
        myReg.payment_status !== 'completed'))
  const statusKey = payState
    ? 'corporate.reg.registeredStatus_pending'
    : myReg.payment_status === 'payment_held'
      ? 'corporate.reg.registeredStatus_held'
      : 'corporate.reg.registeredStatus_confirmed'
  /**
   * A pending waiver's line and the normal status line are only sometimes in
   * conflict, not always:
   * - unpaid (no hold yet): `statusKey` would read "pending"/"confirmed",
   *   neither of which is true while residency is still under review — the
   *   waiver line REPLACES it outright (the 2/2 case this guards: "confirmed"
   *   next to "waiting for residency" would be a contradiction).
   * - already held (a 1/2 registration whose payer completed the card hold
   *   while residency review is still running): `registeredStatus_held` is
   *   simply true and not contradicted by anything — it STACKS below the
   *   waiver line instead of being dropped.
   * Approved (or no waiver at all) is untouched: `statusKey` alone, same as
   * any other registration. A rejected waiver never reaches this card at all
   * (its registration row is deactivated, so `my_registration` comes back
   * null and the plain form renders instead).
   */
  const showBaseStatusLine = !waiverPending || myReg.payment_status === 'payment_held'
  // A singles registration has no player_2 at all — printing "Partner: Self"
  // there is noise, not information.
  const hasPartner = tr.format === 'doubles' || tr.format === 'mixed'
  const partner = myReg.player_2_name ?? myReg.guest_player_2_name ?? t('tournament.partnerSelf')
  // `residents` is shown verbatim in the waiver line above (decision: pass it
  // as-is, even on a singles tournament), but the evidence slots are bounded
  // by the actual seat count — a malformed `resident_count: 2` on a singles
  // registration must never render a "partner's proof" slot for a partner
  // that can't exist.
  const declaredSlots = ([1, 2] as const).filter((slot) => slot <= residents && slot <= seats)

  return (
    <div className="rounded-2xl bg-rally-surface border border-rally-accent/40 p-6 sm:p-8 shadow-glow-electric text-center">
      <CheckCircle2 className="w-12 h-12 text-rally-accent mb-4 mx-auto" />
      <h2 className="font-display text-2xl sm:text-3xl font-black text-rally-text mb-3">
        {t('corporate.reg.registeredTitle')}
      </h2>
      {hasPartner && (
        <p className="inline-flex items-center gap-2 text-rally-text-2 text-sm mb-2">
          <Users className="w-4 h-4" />
          {t('corporate.reg.registeredPartner')} <span className="font-bold text-rally-text">{partner}</span>
        </p>
      )}
      {waiverPending && (
        <p className="text-sm text-rally-text-2 leading-relaxed">
          {t('corporate.reg.registeredStatus_waiverPending', { residents })}
        </p>
      )}
      {showBaseStatusLine && (
        <p className="text-sm text-rally-text-2 leading-relaxed">{t(statusKey)}</p>
      )}
      {declaredSlots.length > 0 && (
        <div className="mt-4 text-start space-y-4">
          {declaredSlots.map((slot) => (
            <EvidenceSlot
              key={slot}
              registrationId={myReg.id}
              slot={slot}
              label={
                slot === 2 ? t('corporate.reg.evidencePartner')
                : residents === 1 && seats === 2 ? t('corporate.reg.evidenceResident')
                : t('corporate.reg.evidenceMine')
              }
              count={myReg.evidence_counts?.[slot === 1 ? '1' : '2'] ?? 0}
              pending={waiverPending}
              refetchTournament={refetchTournament}
            />
          ))}
        </div>
      )}
      {payState && (
        <button
          type="button"
          onClick={() =>
            navigate(
              `/payment-method?${new URLSearchParams({
                registration_id: myReg.id,
                tournament_id: tr.id,
                return_to: returnTo,
              }).toString()}`,
            )
          }
          className="mt-6 w-full h-12 rounded-full bg-rally-accent text-rally-accent-text font-display font-bold inline-flex items-center justify-center gap-2 hover:bg-rally-accent-hover transition-colors"
        >
          <CreditCard className="w-4 h-4" />
          {t('corporate.reg.completePayment')}
        </button>
      )}
      <Link
        to={`/tournaments/${tr.id}`}
        className={cn(
          'mt-6 w-full h-12 rounded-full font-display font-bold inline-flex items-center justify-center gap-2 transition-colors',
          payState
            ? 'mt-3 border border-rally-border text-rally-text hover:border-rally-border-strong'
            : 'bg-rally-accent text-rally-accent-text hover:bg-rally-accent-hover',
        )}
      >
        {t('corporate.reg.viewTournament')}
      </Link>
      <SiteLink className="mt-4" />
    </div>
  )
}

/**
 * One declared resident's evidence, inside the registered card. This is the
 * permanent recovery path for a failed post-register upload (the form's own
 * `uploadFailed` flash is gone — see the note above `pendingUpload.current`):
 * whatever left this slot's count at 0 while the waiver is still pending, the
 * player can pick files and retry from here, as many times as it takes.
 */
function EvidenceSlot({
  registrationId, slot, label, count, pending, refetchTournament,
}: {
  registrationId: string
  slot: 1 | 2
  /** Whose proof this slot holds — the card decides ("the resident's" for a 1-of-2 claim). */
  label: string
  count: number
  pending: boolean
  refetchTournament: () => Promise<unknown>
}) {
  const { t } = useTranslation()
  const [files, setFiles] = useState<File[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  const handleAdd = async () => {
    if (files.length === 0) {
      setError(t('corporate.reg.evidenceRequired'))
      return
    }
    const badFile = validateEvidenceFiles([], files)
    if (badFile) {
      setError(t(`corporate.reg.${badFile}`))
      return
    }
    setError(null)
    setFailed(false)
    setBusy(true)
    try {
      await uploadRegistrationEvidence(registrationId, slot, files)
      setFiles([])
    } catch (uploadError) {
      console.error('[CorporateRegistrationPage] add-evidence upload failed:', uploadError)
      setFailed(true)
    } finally {
      setBusy(false)
      await refetchTournament()
    }
  }

  return (
    <div>
      <p className="text-sm text-rally-text-2">{label} · {t('corporate.reg.evidenceCount', { n: count })}</p>
      {count === 0 && pending && (
        <div className="mt-2 space-y-2">
          <EvidencePicker
            id={`registered-evidence-${slot}`}
            label={label}
            files={files}
            onChange={(next) => {
              setFiles(next)
              setError(null)
            }}
            onError={(key) => setError(t(`corporate.reg.${key}`))}
            error={error}
            disabled={busy}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleAdd()}
            className="w-full h-10 rounded-full border border-rally-accent text-rally-accent font-display font-bold text-sm disabled:opacity-50"
          >
            {t('corporate.reg.addEvidence')}
          </button>
          {failed && (
            <p role="alert" className="text-sm text-rally-error">
              {t('corporate.reg.evidenceUploadFailed')}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

interface RegistrationFormProps {
  tr: TournamentDetail
  gate: RegistrationGate
  /** The event entry's fee-waiver flag, if it declares one. Offering the block
   *  also requires the loaded tournament to carry the same `fee_waiver_type`. */
  feeWaiver?: CorporateFeeWaiver
  /** Where the form parks the evidence upload for the page's `onRegistered`. */
  pendingUpload: MutableRefObject<((reg: TournamentRegistrationResult) => Promise<void>) | null>
  refetchTournament: () => Promise<unknown>
  register: (partnerState: PartnerSelectionState, feeWaiver?: FeeWaiverRequest) => Promise<void>
  isRegistering: boolean
  registerError: string | null
  gateError: string | null
}

/** none · one resident · both residents — the third is dropped for singles. */
const WAIVER_OPTIONS: { value: 0 | 1 | 2; key: string }[] = [
  { value: 0, key: 'waiverNone' },
  { value: 1, key: 'waiverOne' },
  { value: 2, key: 'waiverBoth' },
]

function RegistrationForm({
  tr, gate, feeWaiver, pendingUpload, refetchTournament, register, isRegistering, registerError, gateError,
}: RegistrationFormProps) {
  const { t } = useTranslation()
  const { playerProfile } = useEnsureProfileEssentials()
  const [partnerState, setPartnerState] = useState<PartnerSelectionState>({ phase: 'idle' })
  const [detailsOpen, setDetailsOpen] = useState(false)
  /** Set by the level row's own button, so the modal opens past the pencil. */
  const [detailsEditLevel, setDetailsEditLevel] = useState(false)
  const [savedDetails, setSavedDetails] = useState<SavedProfileEssentials | null>(null)
  const [residentCount, setResidentCount] = useState<0 | 1 | 2>(0)
  const [myFiles, setMyFiles] = useState<File[]>([])
  const [partnerFiles, setPartnerFiles] = useState<File[]>([])
  const [myEvidenceError, setMyEvidenceError] = useState<string | null>(null)
  const [partnerEvidenceError, setPartnerEvidenceError] = useState<string | null>(null)

  // Read off the SAVED profile, never off form state: the modal owns the fields
  // and the write, so this can only ever report what actually landed.
  const details = readProfileDetails(playerProfile, savedDetails)

  const openDetails = (level: boolean) => {
    setDetailsEditLevel(level)
    setDetailsOpen(true)
  }

  /**
   * A player who has just created an account stays inside a modal until Rally
   * knows who they are — the details step is the second half of signing up, not
   * a section of this form. So the modal opens itself the moment the form finds
   * the profile incomplete, and this page is never the thing asking.
   *
   * Once, and only once. Reopening on every render would make the page
   * impossible to read for anyone who deliberately closed it; the submit button
   * is their way back in, and it says so.
   */
  const detailsPrompted = useRef(false)
  useEffect(() => {
    if (details.complete || detailsPrompted.current) return
    detailsPrompted.current = true
    setDetailsOpen(true)
  }, [details.complete])

  const needsPartner = tr.format === 'doubles' || tr.format === 'mixed'
  const waiverOffered = isWaiverOffered(feeWaiver, tr.fee_waiver_type)
  const seats: 1 | 2 = tr.format === 'singles' ? 1 : 2
  // The tournament's own range on the same scale ('2.5 - 3.8 (C2)'); an
  // all-levels tournament stores 0/0 and gets no line.
  const tournamentLevel = tr.skill_level_min || tr.skill_level_max ? tr.skill_level : null
  /** Belt and braces: the pills can only move `residentCount` while the block is
   *  rendered, but every consumer below reads this, never the raw state. */
  const residents: 0 | 1 | 2 = waiverOffered ? residentCount : 0
  // `residents === 2` implies a two-seat format, so this second clause is a
  // no-op today — it keeps the rule ("two residents need a partner") local.
  const partnerRequired = (needsPartner || residents === 2) && partnerState.phase === 'idle'
  const busy = isRegistering
  // `waivedAmount(fee, seats, 0)` is the same number, but it would round a fee
  // that today is rendered verbatim — a no-waiver price stays untouched.
  const amountDue = residents === 0 ? tr.entry_fee : waivedAmount(tr.entry_fee, seats, residents)

  const chooseResidents = (next: 0 | 1 | 2) => {
    setResidentCount(next)
    setMyEvidenceError(null)
    setPartnerEvidenceError(null)
    // Drop files for a resident who is no longer declared: they would never be
    // uploaded, and leaving them on screen reads as if they still counted.
    if (next === 0) setMyFiles([])
    if (next < 2) setPartnerFiles([])
  }

  /** One file minimum per declared resident. Runs before the details gate so a
   *  first submit surfaces the evidence errors and the modal together. */
  const validateEvidence = () => {
    if (residents === 0) return true
    let ok = true
    if (myFiles.length === 0) {
      setMyEvidenceError(t('corporate.reg.evidenceRequired'))
      ok = false
    }
    if (residents === 2 && partnerFiles.length === 0) {
      setPartnerEvidenceError(t('corporate.reg.evidenceRequired'))
      ok = false
    }
    return ok
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const evidenceOk = validateEvidence()
    // The details live in their own modal now, and the profile write happens
    // when it saves — so an incomplete profile reopens it rather than trying to
    // collect the fields here. rally-api would refuse the register call anyway.
    if (!details.complete) {
      openDetails(false)
      return
    }
    if (!evidenceOk) return
    if (partnerRequired) {
      document.getElementById('partner-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    // An unsatisfied gate scrolls to the blocking card instead of submitting
    // (product decision 2026-08-29, mirrored from TournamentDetailPage).
    if (!gate.isSatisfied) {
      const first = gate.blocking[0]
      if (first) {
        document.getElementById(`screen-message-${first.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
      return
    }
    const waiverRequest: FeeWaiverRequest | undefined =
      feeWaiver && residents !== 0 ? { type: feeWaiver.type, resident_count: residents } : undefined
    /**
     * The evidence can only be uploaded once the registration row exists, and
     * only the register hook knows when that is — so the work is parked here and
     * the page's `onRegistered` runs it (and awaits it) at that moment. A failed
     * upload must never strand a created registration: it is caught and logged,
     * never surfaced here — the refetch below flips `my_registration`, which
     * swaps this form for the registered card, and THAT card is the recovery
     * path (its own per-slot picker + "add evidence" button, since the failed
     * slot's evidence count is still 0).
     */
    pendingUpload.current = waiverRequest
      ? async (reg) => {
          try {
            await uploadRegistrationEvidence(reg.id, 1, myFiles)
            if (residents === 2) await uploadRegistrationEvidence(reg.id, 2, partnerFiles)
          } catch (uploadError) {
            console.error('[CorporateRegistrationPage] evidence upload failed:', uploadError)
          } finally {
            await refetchTournament()
          }
        }
      : null
    // Only ever passed when there is one. An explicit `undefined` reads the same
    // to the hook, but it would make a plain registration a different call at
    // every seam that records one — this path stays byte-for-byte what it was.
    if (waiverRequest) await register(partnerState, waiverRequest)
    else await register(partnerState)
  }

  return (
    <>
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-label={t('corporate.reg.formTitle')}
      className="rounded-2xl bg-rally-surface border border-rally-border p-5 sm:p-7 shadow-lg"
    >
      <h2 className="font-display text-xl sm:text-2xl font-black text-rally-text mb-6">
        {t('corporate.reg.formTitle')}
      </h2>

      <div className="space-y-5">
        {details.complete && (
          /* Not a form section — nothing here is an input. It answers "does
             Rally have me right?", and carries the one control that belongs on
             a tournament page: a level, which is what an entry range is
             written in. Name and phone are confirmation only; they change on
             the profile, where a phone re-verification lives. */
          <section
            aria-labelledby="cr-details-heading"
            className="rounded-xl border border-rally-border bg-rally-surface-2 px-4 py-3.5"
          >
            <h3 id="cr-details-heading" className="text-[11px] font-bold uppercase tracking-wider text-rally-text-muted mb-2">
              {t('corporate.reg.detailsTitle')}
            </h3>
            {/* Latin digits inside Hebrew copy — isolate them or bidi reorders. */}
            <p className="text-sm font-semibold text-rally-text">{details.name}</p>
            <p className="text-sm text-rally-text-2"><bdi dir="ltr">{details.phone}</bdi></p>
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-rally-border pt-3">
              <span className="text-sm text-rally-text-2">{t('corporate.reg.level')}</span>
              <span className="flex items-center gap-3">
                <span className="text-sm font-bold text-rally-text"><bdi dir="ltr">{details.level}</bdi></span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => openDetails(true)}
                  className="inline-flex items-center gap-1.5 text-sm font-bold text-rally-accent hover:text-rally-accent-hover disabled:opacity-50"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  {t('corporate.reg.levelEdit')}
                </button>
              </span>
            </div>
          </section>
        )}

        {waiverOffered && (
          <section>
            <h3 className="font-display font-bold text-sm text-rally-text mb-2">
              {t('corporate.reg.waiverTitle')}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {WAIVER_OPTIONS.filter((option) => option.value <= seats).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={residents === option.value}
                  disabled={busy}
                  onClick={() => chooseResidents(option.value)}
                  className={cn(
                    'rounded-md border px-3 py-3 text-center text-sm font-bold transition-colors disabled:opacity-50',
                    residents === option.value
                      ? 'border-rally-accent bg-rally-accent/10 text-rally-accent'
                      : 'border-rally-border bg-rally-surface-2 text-rally-text hover:border-rally-border-strong',
                  )}
                >
                  {/* With two seats "one resident" means either of us — the proof goes
                      into slot 1 whoever it belongs to (the API only opens slot 2 for a
                      2-resident claim); singles keeps the first-person label. */}
                  {t(`corporate.reg.${option.value === 1 && seats === 2 ? 'waiverOneOfUs' : option.key}`)}
                </button>
              ))}
            </div>
            <p className="text-xs text-rally-text-muted mt-2 leading-relaxed">{t('corporate.reg.waiverHint')}</p>

            {residents >= 1 && (
              <div className="mt-4 space-y-4">
                <EvidencePicker
                  id="cr-evidence-1"
                  label={t(residents === 1 && seats === 2 ? 'corporate.reg.evidenceResident' : 'corporate.reg.evidenceMine')}
                  files={myFiles}
                  onChange={(next) => {
                    setMyFiles(next)
                    setMyEvidenceError(null)
                  }}
                  onError={(key) => setMyEvidenceError(t(`corporate.reg.${key}`))}
                  error={myEvidenceError}
                  disabled={busy}
                />
                {residents === 2 && (
                  <EvidencePicker
                    id="cr-evidence-2"
                    label={t('corporate.reg.evidencePartner')}
                    files={partnerFiles}
                    onChange={(next) => {
                      setPartnerFiles(next)
                      setPartnerEvidenceError(null)
                    }}
                    onError={(key) => setPartnerEvidenceError(t(`corporate.reg.${key}`))}
                    error={partnerEvidenceError}
                    disabled={busy}
                  />
                )}
              </div>
            )}
          </section>
        )}

        {needsPartner && (
          <section id="partner-section">
            <h3 className="font-display font-bold text-sm text-rally-text mb-2">{t('corporate.reg.partnerTitle')}</h3>
            {partnerState.phase === 'idle' && (
              <p className="text-xs text-rally-accent font-semibold mb-3">
                {t(playerProfile ? 'corporate.reg.partnerRequiredHint' : 'corporate.reg.partnerRequiredHintInviteOnly')}
              </p>
            )}
            <PartnerSection
              selectionState={partnerState}
              onPartnerChange={setPartnerState}
              searchEnabled={!!playerProfile}
            />
          </section>
        )}
      </div>

      <div className="mt-7 rounded-xl bg-rally-surface-2 border border-rally-border px-4 py-3 flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-rally-text-muted">{t('corporate.reg.priceLabel')}</p>
          {/* Entry fee only — TournamentDetail carries no `service_fee` (the platform fee
              is ₪0 today); the authoritative charge is the register response's `amount_to_pay`. */}
          <p className="text-2xl font-black text-rally-accent">{formatCurrency(amountDue)}</p>
          {residents > 0 && (
            <p className="text-xs text-rally-accent mt-0.5 leading-relaxed">
              {t(amountDue < 0.01 ? 'corporate.reg.priceWaived' : 'corporate.reg.priceHalf')}
            </p>
          )}
        </div>
        <CreditCard className="w-6 h-6 text-rally-text-muted shrink-0" />
      </div>
      {/* Mirrors the hook's own threshold (`amountToPay < 0.01` in
          useTournamentRegistration.ts) so this note can never disagree with
          whether a card is actually charged: at ₪0 no hold is ever placed,
          the hook goes straight to confirm-zero. Two different ₪0 notes:
          `residents > 0` means the price is ₪0 BECAUSE of a declared waiver
          still pending residency review — `waiverNoChargeNote` says so.
          `residents === 0` means the tournament is simply free (no waiver in
          play at all) — the residency-flavoured note would be false there,
          so `freeNote` is the generic one instead. */}
      <p className="text-xs text-rally-text-muted mt-2 leading-relaxed">
        {t(
          amountDue >= 0.01
            ? 'corporate.reg.holdNote'
            : residents === 0
              ? 'corporate.reg.freeNote'
              : 'corporate.reg.waiverNoChargeNote',
        )}
      </p>

      <button
        type="submit"
        disabled={busy}
        aria-describedby={gateError ? 'registration-gate-reason' : undefined}
        className="mt-5 w-full h-12 rounded-full bg-rally-accent text-rally-accent-text font-display font-bold text-base shadow-glow-electric hover:bg-rally-accent-hover disabled:opacity-50 transition-colors"
      >
        {busy ? t('corporate.reg.submitting')
          : partnerRequired ? t('tournament.ctaMissingPartner')
          : amountDue < 0.01 ? t('corporate.reg.submitCtaFree')
          : t('corporate.reg.submitCta')}
      </button>

      {gateError && (
        <p id="registration-gate-reason" aria-live="polite" className="mt-2 text-sm text-rally-error text-center">{gateError}</p>
      )}
      {registerError && <p role="alert" className="mt-2 text-sm text-rally-error text-center">{registerError}</p>}

      <p className="text-xs text-rally-text-muted text-center mt-3 leading-relaxed">{t('corporate.consent')}</p>
    </form>
    {/* Outside the <form> in source order for readability only — Radix portals it
        to the body either way, so it is never a nested form. */}
    <ProfileDetailsModal
      open={detailsOpen}
      onOpenChange={setDetailsOpen}
      tournamentLevel={tournamentLevel}
      editLevel={detailsEditLevel}
      onSaved={setSavedDetails}
    />
    </>
  )
}
