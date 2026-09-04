// src/pages/payment/PaymentConfirmingPage.tsx
import { useEffect } from 'react'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Check } from 'lucide-react'
import { useEntityPolling } from '@/hooks/useEntityPolling'
import { pendingPayment } from '@/hooks/usePendingPayment'
import type { PaymentEntityType } from '@/types/api'

export default function PaymentConfirmingPage() {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation() as { state?: { asmachta?: string; amount?: number } | null }
  const asmachta = location.state?.asmachta

  const type = params.get('type') as PaymentEntityType | null
  const id = params.get('id')
  const tournamentId = params.get('tournament_id') ?? undefined
  const eventId = params.get('event_id') ?? undefined

  const { status, entity } = useEntityPolling({
    type: type as PaymentEntityType,
    entityId: id ?? '',
    tournamentId,
    eventId,
  })

  useEffect(() => {
    if (status === 'confirmed' || status === 'timeout') {
      pendingPayment.clear()
    }
  }, [status])

  if (!type || !id) {
    return (
      <main className="min-h-screen bg-rally-bg flex items-center justify-center px-4">
        <p className="text-rally-text-2">{t('payment.checkoutError')}</p>
      </main>
    )
  }

  if (status === 'polling') {
    return (
      <main className="min-h-screen bg-rally-bg flex items-center justify-center px-4">
        <div className="text-center text-rally-text-2">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-rally-border border-t-rally-accent" />
          <p className="text-rally-text font-semibold">{t('payment.confirming')}</p>
        </div>
      </main>
    )
  }

  if (status === 'confirmed') {
    const isTournament = type === 'tournament_registration'
    // Waiting-list hold: no registration exists yet — promotion is
    // manager-triggered and may happen days later. The only thing confirmed
    // here is that the payment hold itself landed (mobile parity).
    const isWaitlistHold = type === 'tournament_waitlist_hold'
    // Pre-auth hold ⇒ money held, TM approval pending. When the error-fallback
    // path fires (2 consecutive fetch errors) `entity` is null — default a
    // tournament to the pending copy, matching mobile (gap spec §5).
    const isTournamentPending =
      isTournament &&
      entity?.payment_status !== 'completed' &&
      (!entity ||
        entity.payment_status === 'payment_held' ||
        entity.status === 'registered')

    const title = isWaitlistHold
      ? t('payment.waitlistHoldConfirmedTitle')
      : isTournamentPending
      ? t('payment.registrationSubmittedTitle')
      : isTournament
      ? t('payment.registrationConfirmedTitle')
      : t('payment.paymentSuccess')

    return (
      <main className="min-h-screen bg-rally-bg flex items-center justify-center px-4">
        <div className="container max-w-md mx-auto text-center space-y-6">
          <div className="mx-auto w-20 h-20 rounded-full bg-rally-success/15 flex items-center justify-center">
            <Check className="w-10 h-10 text-rally-success" />
          </div>
          <h1 className="font-display text-3xl font-black text-rally-text">
            {title}
          </h1>
          {isWaitlistHold && (
            <p className="text-rally-text-2 text-sm">
              {t('payment.waitlistHoldConfirmedSubtitle')}
            </p>
          )}
          {isTournamentPending && !isWaitlistHold && (
            <p className="text-rally-text-2 text-sm">
              {t('payment.registrationSubmittedSubtitle')}
            </p>
          )}
          {asmachta && !isTournamentPending && !isWaitlistHold && (
            <p className="text-rally-text-2 text-sm mt-2">
              {`#${asmachta}`}
            </p>
          )}
          <button
            onClick={() => navigate('/my-activity')}
            className="w-full h-12 rounded-full bg-rally-accent text-rally-accent-text font-bold"
          >
            {t('payment.viewActivity')}
          </button>
        </div>
      </main>
    )
  }

  // status === 'timeout'
  return (
    <main className="min-h-screen bg-rally-bg flex items-center justify-center px-4">
      <div className="container max-w-md mx-auto text-center space-y-6">
        <h1 className="font-display text-2xl font-bold text-rally-text">
          {t('payment.stillProcessing')}
        </h1>
        <p className="text-rally-text-2">
          {t('payment.stillProcessingSubtitle')}
        </p>
        <button
          onClick={() => navigate('/my-activity')}
          className="w-full h-12 rounded-full bg-rally-accent text-rally-accent-text font-bold"
        >
          {t('payment.stillProcessingCta')}
        </button>
      </div>
    </main>
  )
}