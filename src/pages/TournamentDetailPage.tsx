import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft, Calendar, Trophy, TrendingUp, Users,
} from 'lucide-react'
import { useTournament } from '@/hooks/useTournament'
import { useRegisterTournament } from '@/hooks/useRegisterTournament'
import { useRtl } from '@/hooks/useRtl'
import { Skeleton } from '@/components/ui/skeleton'
import { FactCard } from '@/components/tournaments/FactCard'
import { PartnerSection } from '@/components/tournaments/PartnerSection'
import {
  isRegistrationOpen, registrationSummaryKey, parseSkillLevel,
  formatTournamentSkillRange, getSkillLevelName, formatTournamentDateRange,
  formatCurrency, buildPayload,
} from '@/lib/tournamentHelpers'
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
  const [partner, setPartner] = useState<PartnerSelectionState>({ phase: 'idle' })
  const [error, setError] = useState('')

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
  const summary = registrationSummaryKey(tr.registration_deadline)
  const skill = parseSkillLevel(tr.skill_level)
  const partnered = needsPartner(tr.format)
  const partnerRequired = partnered && partner.phase === 'idle'
  const myReg = tr.my_registration
  const payState =
    myReg?.status === 'payment_pending' || myReg?.status === 'approved'

  const handleRegister = async () => {
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

  return (
    <main className="min-h-screen bg-rally-bg pb-28">
      <button
        onClick={() => navigate('/tournaments')}
        aria-label={t('tournament.tournamentDetailBack')}
        className="fixed top-24 start-4 z-20 w-[42px] h-[42px] rounded-full bg-black/50 backdrop-blur flex items-center justify-center text-white"
      >
        <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
      </button>

      <section className="relative h-[330px]">
        {tr.image_url ? (
          <img src={tr.image_url} alt={tr.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-rally-surface-2 flex items-center justify-center text-rally-text-muted">
            {t('tournament.tournamentDetailNoImage')}
          </div>
        )}
        <div className="absolute inset-0 bg-black/40" />
        <div className="absolute bottom-5 start-4 end-4 text-white">
          <span className="inline-block rounded-full bg-rally-accent/20 text-rally-accent px-3 py-1 text-xs">
            {tr.club_name}
          </span>
          <h1 className="mt-3 text-3xl font-black">{tr.name}</h1>
          <p className="mt-1 flex items-center gap-2 text-white/80">
            <Calendar className="w-4 h-4" />
            {formatTournamentDateRange(tr.start_date, tr.end_date, locale)}
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4 max-w-2xl space-y-8 mt-8">
        <section>
          <p className="text-[11px] uppercase tracking-wider text-rally-text-muted">
            {t('tournament.tournamentDetailRegistration')}
          </p>
          <p className="text-rally-text font-semibold mt-1">
            {t(summary.key, summary.params)}
          </p>
        </section>

        <section>
          <h2 className="text-rally-text font-bold mb-3">
            {t('tournament.tournamentDetailAbout')}
          </h2>
          <p className="text-rally-text-2 whitespace-pre-line">
            {tr.description || t('tournament.tournamentDetailDescriptionFallback')}
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-rally-text font-bold">
            {t('tournament.tournamentDetailCategory')}
          </h2>
          <FactCard
            icon={<Users className="w-4 h-4" />}
            label={t('tournament.tournamentDetailFormat')}
            value={t(formatLabelKey(tr.format))}
            highlightLabel={open ? t('tournament.tournamentAvailability') : undefined}
            highlightValue={
              open
                ? `${tr.available_seats ?? 0} ${t('tournament.tournamentSlotsLeft')}`
                : undefined
            }
          />
          <FactCard
            icon={<Trophy className="w-4 h-4" />}
            label={t('tournament.tournamentStructure')}
            value={t(structureLabelKey(tr.structure))}
          />
        </section>

        <section className="space-y-3">
          <h2 className="text-rally-text font-bold">
            {t('tournament.tournamentDetailSkill')}
          </h2>
          <FactCard
            icon={<TrendingUp className="w-4 h-4" />}
            label={t('tournament.tournamentLevel')}
            value={
              skill.level ??
              getSkillLevelName(tr.skill_level_min, tr.skill_level_max, t)
            }
            highlightLabel={t('tournament.tournamentDetailSkillRange')}
            highlightValue={
              skill.range ??
              formatTournamentSkillRange(tr.skill_level_min, tr.skill_level_max)
            }
          />
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
            <h2 className="text-rally-text font-bold mb-3">
              {t('tournament.tournamentDetailPrizes')}
            </h2>
            <div className="space-y-2">
              {tr.prizes.map((p) => (
                <div
                  key={p.id}
                  className="flex justify-between rounded-xl bg-rally-surface border border-rally-border p-3"
                >
                  <span className="text-rally-text">{p.title}</span>
                  <span className="text-rally-text-2">{p.description}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {tr.sponsors.length > 0 && (
          <section>
            <h2 className="text-rally-text font-bold mb-3">
              {t('tournament.tournamentDetailSponsors')}
            </h2>
            <div className="flex flex-wrap gap-3">
              {tr.sponsors.map((s) => (
                <span
                  key={s.id}
                  className="rounded-xl bg-rally-surface border border-rally-border px-4 py-2 text-rally-text-2"
                >
                  {s.name}
                </span>
              ))}
            </div>
          </section>
        )}

        {!myReg && partnered && (
          <section>
            <h2 className="text-rally-text font-bold mb-3">
              {t('tournament.tournamentPartner')}
            </h2>
            <PartnerSection state={partner} onChange={setPartner} />
          </section>
        )}

        {error && (
          <p className="rounded-xl bg-rally-error/10 border border-rally-error/30 text-rally-error text-sm p-3">
            {error}
          </p>
        )}
      </div>

      <div className="fixed bottom-0 inset-x-0 bg-rally-bg/95 border-t border-rally-border p-4">
        <div className="container mx-auto max-w-2xl flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-rally-text-muted">
              {payState
                ? t('tournament.registrationStatus_payment_pending', {
                    defaultValue: 'Payment pending',
                  })
                : t('tournament.tournamentsEntryFee')}
            </p>
            <p className="text-2xl font-black text-rally-accent">
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
          ) : (
            <button
              disabled={!open || partnerRequired || register.isPending}
              onClick={handleRegister}
              className="min-w-[160px] h-12 rounded-full bg-rally-accent text-rally-accent-text font-bold disabled:opacity-40"
            >
              {!open
                ? t('tournament.tournamentDetailRegistrationClosed')
                : t('tournament.tournamentDetailRegisterNow')}
            </button>
          )}
        </div>
      </div>
    </main>
  )
}
