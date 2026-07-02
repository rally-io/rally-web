import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useTournament } from '@/hooks/useTournament'
import { useRegistration } from '@/hooks/useRegistration'
import { useRtl } from '@/hooks/useRtl'
import { formatTournamentDateRange } from '@/lib/tournamentHelpers'
import { formatLabelKey } from '@/lib/tournamentTheme'
import { AppDownloadModal } from '@/components/app-download/AppDownloadModal'
import {
  BookingSummaryScreen, type SummaryMode,
} from '@/components/tournaments/BookingSummaryScreen'

export default function RegistrationSummaryPage() {
  const { t } = useTranslation()
  const { locale } = useRtl()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [appModalOpen, setAppModalOpen] = useState(false)

  const id = params.get('id') ?? ''
  const registrationId = params.get('registration_id') ?? ''
  // When the user lands here from a card/detail page they only carry id +
  // registration_id; fetch the rest from the server. Query params still win
  // when present (fresh-registration flow already passes everything).
  const { data: registration, isLoading: registrationLoading } = useRegistration(
    id,
    registrationId,
  )
  const status = params.get('status') ?? registration?.status ?? ''
  const amountToPay = params.has('amount_to_pay')
    ? Number(params.get('amount_to_pay'))
    : registration?.amount_to_pay ?? 0
  const entryFee = params.has('entry_fee')
    ? Number(params.get('entry_fee'))
    : registration?.entry_fee ?? 0
  const serviceFee = params.has('service_fee')
    ? Number(params.get('service_fee'))
    : registration?.service_fee ?? 0

  const { data: tournament } = useTournament(id)

  const owesMoney = amountToPay >= 0.01
  // Payment completion moved to the mobile app: any registration that still
  // owes money gets the "Complete in the App" CTA; zero-amount registrations
  // are simply shown as successful.
  const isPaymentPending =
    (status === 'payment_pending' || status === 'registered') && owesMoney

  const mode: SummaryMode = isPaymentPending ? 'deferred_pay' : 'success'

  const scheduleText = tournament
    ? formatTournamentDateRange(
        tournament.start_date, tournament.end_date, locale,
      )
    : ''

  // Without query-param status (deep-link from card/detail), wait for the
  // fetch before rendering — otherwise mode resolves to "success" too early.
  const waitingForRegistration =
    !params.get('status') && !!registrationId && registrationLoading && !registration

  if (waitingForRegistration) {
    return (
      <main className="min-h-screen bg-rally-bg flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-rally-border border-t-rally-accent" />
      </main>
    )
  }

  return (
    <>
      <BookingSummaryScreen
        title={t('tournament.tournamentSummaryTitle')}
        clubName={tournament?.club_name ?? ''}
        scheduleText={scheduleText}
        subtitleText={
          tournament
            ? t(formatLabelKey(tournament.format))
            : t('tournament.activityTypeTournament')
        }
        imageUrl={tournament?.image_url ?? null}
        mode={mode}
        onClose={() => navigate('/')}
        onBack={() => navigate(-1)}
        successMessage={t('tournament.tournamentRegisteredSuccessMessage')}
        onConfirm={() => setAppModalOpen(true)}
        confirmLabel={t('appDownload.cta_pay')}
        price={entryFee}
        serviceFee={serviceFee}
      />
      <AppDownloadModal
        open={appModalOpen}
        variant="pay"
        onOpenChange={setAppModalOpen}
      />
    </>
  )
}
