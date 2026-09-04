// src/pages/payment/PaymentMethodPage.tsx
// "Add a card" — places a pre-authorization hold via Grow's hosted checkout page.
// No saved-card list / reuse in this scope: every registration adds a fresh card.
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/tournamentHelpers'
import { pendingPayment } from '@/hooks/usePendingPayment'
import { useRegistration } from '@/hooks/useRegistration'
import {
  initiateTournamentRegistrationPayment, initiateTournamentWaitlistHoldPayment,
} from '@/services/api/payments'
import type { PaymentEntityType } from '@/types/api'

export default function PaymentMethodPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [isInitiating, setIsInitiating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Defaults to 'tournament_registration' — every pre-waitlist link that
  // reaches this page omits `type` entirely.
  const paymentType = (params.get('type') as PaymentEntityType | null) ?? 'tournament_registration'
  const isWaitlistHold = paymentType === 'tournament_waitlist_hold'

  const registrationId = params.get('registration_id') ?? ''
  const waitlistEntryId = params.get('waitlist_entry_id') ?? ''
  const entityId = isWaitlistHold ? waitlistEntryId : registrationId
  const tournamentId = params.get('tournament_id') ?? ''
  // The fresh-registration flow already passes `amount`; the "resume payment"
  // entry point (from an existing pending registration) only carries the two
  // ids, so fall back to fetching the registration detail for its amount.
  // The waitlist-hold flow always passes `amount` (there is no registration
  // row yet to fetch it from), so it never takes this fallback path.
  const hasAmountParam = params.has('amount')
  const { data: registration } = useRegistration(
    hasAmountParam || isWaitlistHold ? '' : tournamentId,
    hasAmountParam || isWaitlistHold ? '' : registrationId,
  )
  const amount = hasAmountParam
    ? Number(params.get('amount'))
    : registration?.amount_to_pay ?? 0

  const handleAddCard = async () => {
    if (!entityId) return
    setIsInitiating(true)
    setError(null)
    try {
      const result = isWaitlistHold
        ? await initiateTournamentWaitlistHoldPayment(entityId)
        : await initiateTournamentRegistrationPayment(entityId)
      if (!result.success || !result.data.payment_url) {
        setError(t('payment.checkoutError'))
        return
      }
      pendingPayment.set({
        type: paymentType,
        entityId,
        tournamentId,
        amount,
      })
      window.location.href = result.data.payment_url
    } catch {
      setError(t('payment.checkoutError'))
    } finally {
      setIsInitiating(false)
    }
  }

  return (
    <main className="min-h-screen bg-rally-bg flex items-center justify-center px-4">
      <div className="container max-w-md mx-auto text-center space-y-6">
        <div className="mx-auto w-16 h-16 rounded-full bg-rally-accent/15 flex items-center justify-center">
          <CreditCard className="w-8 h-8 text-rally-accent" />
        </div>
        <h1 className="font-display text-2xl md:text-3xl font-black text-rally-text">
          {t('payment.paymentMethodAddCardTitle')}
        </h1>
        {amount > 0 && (
          <p className="text-3xl font-black text-rally-accent">{formatCurrency(amount)}</p>
        )}
        <p className="text-rally-text-2 text-sm">
          {t(isWaitlistHold ? 'payment.paymentMethodWaitlistHoldNotice' : 'payment.paymentMethodHoldNotice')}
        </p>

        {error && <p className="text-sm text-rally-error">{error}</p>}

        <div className="space-y-3">
          <Button
            variant="accent"
            className="w-full h-12 rounded-full font-bold"
            disabled={isInitiating || !entityId}
            onClick={() => void handleAddCard()}
          >
            {isInitiating ? '…' : t('payment.paymentMethodAddCardCta')}
          </Button>
          <button
            onClick={() => navigate(-1)}
            className="w-full h-12 rounded-full border border-rally-border text-rally-text font-semibold"
          >
            {t('tournament.tournamentDetailBack')}
          </button>
        </div>
      </div>
    </main>
  )
}
