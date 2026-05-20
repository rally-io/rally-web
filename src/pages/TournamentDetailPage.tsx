import { useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft, Calendar, Clock, Trophy, TrendingUp, Users,
} from 'lucide-react'
import { useTournament } from '@/hooks/useTournament'
import { useRegisterTournament } from '@/hooks/useRegisterTournament'
import { useRtl } from '@/hooks/useRtl'
import { useAppSession } from '@/hooks/useAppSession'
import { useAuthGate } from '@/hooks/useAuthGate'
import { SignInRequiredPanel } from '@/components/auth/SignInRequiredPanel'
import { ActionGateModal } from '@/components/profile/ActionGateModal'
import { Skeleton } from '@/components/ui/skeleton'
import { FactCard } from '@/components/tournaments/FactCard'
import { PartnerSection } from '@/components/tournaments/PartnerSection'
import {
  isRegistrationOpen, parseSkillLevel,
  formatTournamentSkillRange, getSkillLevelName, formatTournamentDateRange,
  formatTournamentCardDate, formatCurrency, buildPayload,
} from '@/lib/tournamentHelpers'
import { PrizesGrid } from '@/components/tournaments/PrizesGrid'
import {
  formatLabelKey, structureLabelKey, needsPartner,
} from '@/lib/tournamentTheme'
import type { PartnerSelectionState } from '@/types/api'

export default function TournamentDetailPage() {
  const { t } = useTranslation()
  const { locale } = useRtl()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: tr, isLoading, isError } = useTournament(id!)
  const register = useRegisterTournament()
  const { status, playerProfile } = useAppSession()
  const { requireSignIn } = useAuthGate()
  const signedOut = status === 'signed_out'
  const [partner, setPartner] = useState<PartnerSelectionState>({ phase: 'idle' })
  const [error, setError] = useState('')
  const [gateOpen, setGateOpen] = useState(false)
  const partnerSectionRef = useRef<HTMLDivElement>(null)

  const runRegister = async () => {
    if (!tr) return
    setError('')
    try {
      const result = await register.mutateAsync({
        tournamentId: tr.id,
        data: buildPayload(tr.format, partner),
      })
      const q = new URLSearchParams({
        id: tr.id,
        registration_id: String(result.id),
        amount_to_pay: String(result.amount_to_pay ?? 0),
        entry_fee: String(result.entry_fee ?? tr.entry_fee),
        credits_applied: String(result.credits_applied ?? 0),
        service_fee: String(result.service_fee ?? 0),
        status: String(result.status),
      })
      navigate(`/tournaments/summary?${q.toString()}`)
    } catch (e: any) {
      if (e?.isProfileFieldsRequired || e?.isUnauthorized) return
      setError(e?.message ?? t('tournament.registrationFailedMessage'))
    }
  }

  const scrollToPartner = () => {
    partnerSectionRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }

  if (isLoading) {
    return (
      <main className="pt-28 pb-24 container mx-auto px-4 bg-rally-bg min-h-screen">
        <Skeleton className="h-[80vh] rounded-3xl" />
      </main>
    )
  }
  if (isError || !tr) {
    return (
      <main className="pt-32 min-h-screen bg-rally-bg text-center text-rally-text-2">
        {t('tournament.tournamentDetailLoadErrorTitle')}
      </main>
    )
  }

  const open = isRegistrationOpen(tr.registration_deadline)
  const skill = parseSkillLevel(tr.skill_level)
  const partnered = needsPartner(tr.format)
  const partnerRequired = partnered && partner.phase === 'idle'
  const myReg = tr.my_registration
  const payState =
    myReg?.status === 'payment_pending' || myReg?.status === 'approved'

  const needsGate =
    !playerProfile || !playerProfile.contact_number || playerProfile.skill_level == null

  const handleRegister = () => {
    setError('')
    if (needsGate) {
      setGateOpen(true)
      return
    }
    void runRegister()
  }

  return (
    <main className="min-h-screen bg-rally-bg pb-28">
      <button
        onClick={() => navigate('/tournaments')}
        aria-label={t('tournament.tournamentDetailBack')}
        className="fixed top-24 start-4 z-20 w-[42px] h-[42px] rounded-full bg-black/50 backdrop-blur flex items-center justify-center text-white"
      >
        <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
      </button>

      <section className="relative h-[400px] md:h-[520px]">
        {tr.image_url ? (
          <img src={tr.image_url} alt={tr.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-rally-surface-2 flex items-center justify-center text-rally-text-muted">
            {t('tournament.tournamentDetailNoImage')}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
        <div className="absolute bottom-6 md:bottom-12 start-4 end-4 md:start-10 md:end-10 text-white">
          <span className="inline-block rounded-full bg-rally-accent/20 text-rally-accent px-4 py-1.5 md:px-5 md:py-2 text-sm md:text-base font-semibold">
            {tr.club_name}
          </span>
          <h1 className="font-display mt-3 md:mt-5 text-4xl md:text-6xl lg:text-7xl font-black tracking-tight leading-[1.05]">
            {tr.name}
          </h1>
          <p className="mt-3 md:mt-4 flex items-center gap-2 md:gap-3 text-base md:text-xl text-white/85">
            <Calendar className="w-5 h-5 md:w-6 md:h-6 shrink-0" />
            <span>{formatTournamentDateRange(tr.start_date, tr.end_date, locale)}</span>
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4 max-w-3xl space-y-10 mt-10">
        <section className="rounded-2xl bg-rally-surface border border-rally-border p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-3 text-rally-text">
            <Calendar className="w-5 h-5 text-rally-accent shrink-0" />
            <span className="font-semibold text-base md:text-lg">
              {formatTournamentCardDate(tr.start_date, tr.end_date, locale, true)}
            </span>
          </div>
          {(() => {
            const startMs = new Date(tr.start_date).getTime()
            if (!Number.isFinite(startMs)) return null
            const days = Math.ceil((startMs - Date.now()) / 86_400_000)
            if (days < 0)
              return (
                <span className="inline-flex items-center gap-2 text-rally-text-2 text-sm">
                  <Clock className="w-4 h-4" />
                  {t('tournament.tournamentPast')}
                </span>
              )
            if (days === 0)
              return (
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-rally-accent text-rally-accent-text font-bold text-sm">
                  <Clock className="w-4 h-4" />
                  {t('tournament.tournamentToday')}
                </span>
              )
            if (days === 1)
              return (
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-rally-accent/20 text-rally-accent font-bold text-sm">
                  <Clock className="w-4 h-4" />
                  {t('tournament.tournamentTomorrow')}
                </span>
              )
            return (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-rally-blue/15 text-rally-blue font-semibold text-sm">
                <Clock className="w-4 h-4" />
                {t('tournament.daysRemainingToTournament', { count: days })}
              </span>
            )
          })()}
        </section>

        <section>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-rally-text mb-4">
            {t('tournament.tournamentDetailAbout')}
          </h2>
          <p className="text-rally-text-2 whitespace-pre-line text-base md:text-lg leading-relaxed max-w-prose border-e-2 border-rally-accent/40 pe-5">
            {tr.description || t('tournament.tournamentDetailDescriptionFallback')}
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-rally-text mb-5">
            {t('tournament.tournamentDetailCategory')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <FactCard
              icon={<Users className="w-5 h-5" />}
              label={t('tournament.factCardFormat')}
              value={t(formatLabelKey(tr.format))}
            />
            <FactCard
              icon={<TrendingUp className="w-5 h-5" />}
              label={t('tournament.factCardSkill')}
              value={
                <span dir="ltr">
                  {skill.range ??
                    formatTournamentSkillRange(
                      tr.skill_level_min,
                      tr.skill_level_max,
                    )}
                  {skill.level ? ` (${skill.level})` : ''}
                  {!skill.range && !skill.level
                    ? getSkillLevelName(tr.skill_level_min, tr.skill_level_max, t)
                    : ''}
                </span>
              }
            />
            <FactCard
              icon={<Trophy className="w-5 h-5" />}
              label={t('tournament.factCardStructure')}
              value={t(structureLabelKey(tr.structure))}
            />
          </div>
        </section>

        {myReg && (
          <FactCard
            icon={<Users className="w-4 h-4" />}
            label={t('tournament.tournamentPartner')}
            value={
              myReg.player_2_name ?? myReg.guest_player_2_name ?? t('tournament.partnerSelf')
            }
          />
        )}

        {tr.prizes.length > 0 && (
          <section>
            <h2 className="font-display text-2xl md:text-3xl font-bold text-rally-text mb-5">
              {t('tournament.prizesTitle')}
            </h2>
            <PrizesGrid prizes={tr.prizes} />
          </section>
        )}

        {tr.sponsors.length > 0 && (
          <section>
            <h2 className="font-display text-2xl md:text-3xl font-bold text-rally-text mb-5">
              {t('tournament.tournamentDetailSponsors')}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {tr.sponsors.map((s) => {
                const Tag = s.website_url ? 'a' : 'div'
                const linkProps = s.website_url
                  ? { href: s.website_url, target: '_blank', rel: 'noopener noreferrer' }
                  : {}
                return (
                  <Tag
                    key={s.id}
                    {...linkProps}
                    className="flex flex-col items-center justify-center gap-2 rounded-xl bg-rally-surface border border-rally-border p-4 hover:border-rally-accent/40 transition-colors min-h-[110px]"
                  >
                    {s.image_url ? (
                      <img
                        src={s.image_url}
                        alt={s.name}
                        className="h-12 max-w-full object-contain"
                        loading="lazy"
                      />
                    ) : (
                      <div className="h-12 flex items-center justify-center text-3xl">
                        🏢
                      </div>
                    )}
                    <span className="text-rally-text-2 text-xs text-center">
                      {s.name}
                    </span>
                  </Tag>
                )
              })}
            </div>
          </section>
        )}

        {!signedOut && !myReg && partnered && (
          <section ref={partnerSectionRef} className="scroll-mt-24">
            <div className="flex items-baseline justify-between gap-3 mb-2">
              <h2 className="font-display text-2xl md:text-3xl font-bold text-rally-text">
                {t('tournament.partnerSectionTitle')}
                <span className="text-rally-accent ms-1">*</span>
              </h2>
            </div>
            <p className="text-xs text-rally-text-muted mb-5">
              {t('tournament.partnerRequiredNote')}
            </p>
            <PartnerSection state={partner} onChange={setPartner} />
          </section>
        )}

        {error && (
          <p className="rounded-xl bg-rally-error/10 border border-rally-error/30 text-rally-error text-sm p-3">
            {error}
          </p>
        )}
      </div>

      <div className="fixed bottom-0 inset-x-0 bg-rally-bg/95 backdrop-blur border-t border-rally-border">
        <div className="container mx-auto max-w-3xl px-4 py-3">
          {signedOut ? (
            <SignInRequiredPanel
              message={t('auth.gate.sign_in_to_register')}
              ctaLabel={t('auth.gate.sign_in_button')}
              onSignIn={() => {
                void requireSignIn().catch(() => {
                  // USER_CANCELLED is expected; do nothing.
                })
              }}
            />
          ) : (
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-rally-text-muted">
                  {payState
                    ? t('tournament.registrationStatus_payment_pending', {
                        defaultValue: 'Payment pending',
                      })
                    : t('tournament.tournamentsEntryFee')}
                </p>
                <p className="text-2xl md:text-3xl font-black text-rally-accent">
                  {formatCurrency(tr.entry_fee)}
                </p>
              </div>
              {payState ? (
                <button
                  disabled
                  title={t('tournament.paymentDeferredNotice')}
                  className="min-w-[160px] h-12 rounded-full bg-rally-accent text-rally-accent-text font-bold opacity-40"
                >
                  {t('tournament.tournamentsProceedToPay')}
                </button>
              ) : myReg ? (
                <button
                  disabled
                  className="min-w-[160px] h-12 rounded-full bg-rally-accent text-rally-accent-text font-bold opacity-40"
                >
                  {t('tournament.tournamentDetailAlreadyRegistered')}
                </button>
              ) : !open ? (
                <button
                  disabled
                  className="min-w-[160px] h-12 rounded-full bg-rally-accent text-rally-accent-text font-bold opacity-40"
                >
                  {t('tournament.tournamentDetailRegistrationClosed')}
                </button>
              ) : partnerRequired ? (
                <button
                  onClick={scrollToPartner}
                  className="min-w-[160px] md:min-w-[200px] h-12 md:h-14 rounded-full bg-rally-accent text-rally-accent-text font-bold enabled:hover:bg-rally-accent-hover enabled:shadow-glow-electric transition-all"
                >
                  {t('tournament.ctaFillDetails')}
                </button>
              ) : (
                <button
                  disabled={register.isPending}
                  onClick={handleRegister}
                  className="min-w-[160px] md:min-w-[200px] h-12 md:h-14 rounded-full bg-rally-accent text-rally-accent-text font-bold disabled:opacity-40 enabled:hover:bg-rally-accent-hover enabled:shadow-glow-electric transition-all"
                >
                  {t('tournament.tournamentsProceedToPay')}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <ActionGateModal
        open={gateOpen}
        action="register_tournament"
        onOpenChange={setGateOpen}
        onConfirmed={() => void runRegister()}
      />
    </main>
  )
}
