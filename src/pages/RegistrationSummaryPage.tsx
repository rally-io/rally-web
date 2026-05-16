import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useTournament } from '@/hooks/useTournament'
import { useRtl } from '@/hooks/useRtl'
import { formatTournamentDateRange } from '@/lib/tournamentHelpers'
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
  const status = params.get('status') ?? ''
  const amountToPay = Number(params.get('amount_to_pay') ?? '0')
  const entryFee = Number(params.get('entry_fee') ?? '0')
  const serviceFee = Number(params.get('service_fee') ?? '0')

  const { data: tournament } = useTournament(id)
  const [confirmed, setConfirmed] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  const isPaymentPending = status === 'payment_pending' && !confirmed
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

  const handleConfirm = async () => {
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
        onConfirm={handleConfirm}
        confirmPending={pending}
        confirmLabel={t('tournament.registrationDetailConfirmRegistration')}
        price={entryFee}
        serviceFee={serviceFee}
        deferredNotice={t('tournament.paymentDeferredNotice')}
      />
    </>
  )
}
