import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useTournament } from '@/hooks/useTournament'
import { useRegistration } from '@/hooks/useRegistration'
import { useRtl } from '@/hooks/useRtl'
import { formatTournamentDateRange, formatCurrency } from '@/lib/tournamentHelpers'
import { formatLabelKey } from '@/lib/tournamentTheme'
import { confirmZeroPayment } from '@/services/api/tournaments'
import {
  BookingSummaryScreen, type SummaryMode,
} from '@/components/tournaments/BookingSummaryScreen'

export default function RegistrationSummaryPage() {
  const { t } = useTranslation()
  const { locale } = useRtl()
  const navigate = useNavigate()
  const [params] = useSearchParams()

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
  const creditsApplied = params.has('credits_applied')
    ? Number(params.get('credits_applied'))
    : registration?.credits_applied ?? 0

  const { data: tournament } = useTournament(id)
  const [confirmed, setConfirmed] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  const owesMoney = amountToPay >= 0.01
  // 'payment_pending' was the pre-Grow status; 'registered' is the new status —
  // payment is still required when the registration owes money. (gap spec §7)
  const isPaymentPending =
    (status === 'payment_pending' || (status === 'registered' && owesMoney)) && !confirmed
  const isZero = isPaymentPending && amountToPay < 0.01

  const mode: SummaryMode = !isPaymentPending
    ? 'success'
    : isZero
    ? 'zero_payment'
    : 'deferred_pay'

  const scheduleText = tournament
    ? formatTournamentDateRange(
        tournament.start_date, tournament.end_date, locale,
      )
    : ''

  const handleZeroConfirm = async () => {
    setError('')
    setPending(true)
    try {
      const res = await confirmZeroPayment(id, registrationId)
      if (!res.success) throw res.error
      setConfirmed(true)
    } catch (e: any) {
      setError(e?.message ?? t('tournament.errorTitle'))
    } finally {
      setPending(false)
    }
  }

  const goToPaymentMethod = () => {
    const sp = new URLSearchParams({
      type: 'tournament_registration',
      entity_id: registrationId,
      amount: String(amountToPay),
      tournament_id: id,
      use_credits: String(creditsApplied > 0),
      requires_approval_event: String(registration?.requires_approval_event ?? false),
    })
    navigate(`/payment-method?${sp.toString()}`)
  }

  const onConfirm = mode === 'zero_payment' ? handleZeroConfirm : goToPaymentMethod
  const confirmLabel =
    mode === 'zero_payment'
      ? t('tournament.registrationDetailConfirmRegistration')
      : t('payment.payNow', { amount: formatCurrency(amountToPay) })

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
      {error && (
        <div className="bg-rally-error/10 text-rally-error text-center text-sm py-2">
          {error}
        </div>
      )}
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
        onConfirm={onConfirm}
        confirmPending={pending}
        confirmLabel={confirmLabel}
        price={entryFee}
        serviceFee={serviceFee}
      />
    </>
  )
}