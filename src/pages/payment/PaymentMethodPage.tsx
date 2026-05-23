// src/pages/payment/PaymentMethodPage.tsx
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, X, Lock } from 'lucide-react'
import {
  getSavedCards,
  chargeSavedCard,
  initiatePayment,
} from '@/services/api/payments'
import { releaseBookingHold } from '@/services/api/bookings'
import { releaseEvent } from '@/services/api/events'
import { pendingPayment } from '@/hooks/usePendingPayment'
import { formatCurrency } from '@/lib/tournamentHelpers'
import { SavedCardRow } from '@/components/payment/SavedCardRow'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import type {
  SavedCard, PaymentEntity, PaymentEntityType,
} from '@/types/api'

function parseEntity(params: URLSearchParams): {
  entity: PaymentEntity
  amount: number
  tournamentId?: string
  eventId?: string
  useCredits?: boolean
  hideRecommended: boolean
} | null {
  const type = params.get('type') as PaymentEntityType | null
  const id = params.get('entity_id')
  const amount = Number(params.get('amount') ?? 'NaN')
  if (!type || !id || !Number.isFinite(amount)) return null
  // Pre-auth entities (requires_approval_event=true) forbid the saved-card
  // immediate-capture path — hosted checkout only. (gap spec §6) Booking/event
  // never send the flag, so it defaults to false there.
  const hideRecommended = params.get('requires_approval_event') === 'true'
  if (type === 'booking') {
    return { entity: { type, id }, amount, hideRecommended: false }
  }
  if (type === 'tournament_registration') {
    const useCredits = params.get('use_credits') === 'true'
    const tournamentId = params.get('tournament_id') ?? undefined
    return {
      entity: { type, id, use_credits: useCredits },
      amount,
      tournamentId,
      useCredits,
      hideRecommended,
    }
  }
  if (type === 'event_participation') {
    const eventId = params.get('event_id') ?? undefined
    return { entity: { type, id }, amount, eventId, hideRecommended: false }
  }
  return null
}

export default function PaymentMethodPage() {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const parsed = parseEntity(params)
  const hideRecommended = parsed?.hideRecommended ?? false

  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [inlineError, setInlineError] = useState<string | null>(null)
  const [working, setWorking] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [saveCard, setSaveCard] = useState(false)

  const cardsQuery = useQuery({
    queryKey: ['saved-cards'],
    queryFn: async (): Promise<SavedCard[]> => {
      const r = await getSavedCards()
      return r.success ? r.data : []
    },
    enabled: !!parsed && !hideRecommended,
    staleTime: 0,
  })

  useEffect(() => {
    const cards = cardsQuery.data
    if (!cards || cards.length === 0) {
      setSelectedCardId(null)
      return
    }
    setSelectedCardId((current) => {
      if (current && cards.some((c) => c.id === current)) return current
      const tokenCard = cards.find((c) => c.has_token)
      return (tokenCard ?? cards[0]).id
    })
  }, [cardsQuery.data])

  useEffect(() => {
    const handler = () => {
      void queryClient.invalidateQueries({ queryKey: ['saved-cards'] })
    }
    window.addEventListener('focus', handler)
    return () => window.removeEventListener('focus', handler)
  }, [queryClient])

  if (!parsed) {
    return (
      <main className="min-h-screen bg-rally-bg flex items-center justify-center px-4">
        <p className="text-rally-text-2 text-center">
          {t('payment.checkoutError')}
        </p>
      </main>
    )
  }

  const { entity, amount, tournamentId, eventId, useCredits } = parsed
  const cards = cardsQuery.data ?? []
  const selectedCard = cards.find((c) => c.id === selectedCardId) ?? null

  const buildConfirmingUrl = () => {
    const sp = new URLSearchParams({
      type: entity.type,
      id: entity.id,
    })
    if (tournamentId) sp.set('tournament_id', tournamentId)
    if (eventId) sp.set('event_id', eventId)
    return `/payments/confirming?${sp.toString()}`
  }

  const persistPending = () => {
    pendingPayment.set({
      type: entity.type,
      entityId: entity.id,
      amount,
      tournamentId,
      eventId,
      useCredits,
    })
  }

  const handlePayNow = async () => {
    if (!selectedCard || working) return
    setInlineError(null)
    setWorking(true)
    try {
      if (selectedCard.has_token) {
        const r = await chargeSavedCard(entity, selectedCard.id)
        if (!r.success) {
          setInlineError(r.error.code === 'PAYMENT_DECLINED' ? t('payment.declined') : r.error.message || t('payment.checkoutError'))
          void queryClient.invalidateQueries({ queryKey: ['saved-cards'] })
          return
        }
        setInlineError(null)
        persistPending()
        navigate(buildConfirmingUrl(), {
          replace: true,
          state: { asmachta: r.data.grow_asmachta, amount: r.data.amount },
        })
      } else {
        const r = await initiatePayment(entity)
        if (!r.success) {
          setInlineError(r.error.message || t('payment.checkoutError'))
          return
        }
        persistPending()
        window.location.assign(r.data.payment_url)
      }
    } catch {
      setInlineError(t('payment.checkoutError'))
      void queryClient.invalidateQueries({ queryKey: ['saved-cards'] })
    } finally {
      setWorking(false)
    }
  }

  const handlePayWithCard = async () => {
    if (working) return
    setInlineError(null)
    setWorking(true)
    try {
      const opts = entity.type === 'booking' ? { save_card: saveCard } : {}
      const r = await initiatePayment(entity, opts)
      if (!r.success) {
        setInlineError(r.error.message || t('payment.checkoutError'))
        return
      }
      persistPending()
      window.location.assign(r.data.payment_url)
    } catch {
      setInlineError(t('payment.checkoutError'))
    } finally {
      setWorking(false)
    }
  }

  const handleBack = () => {
    if (entity.type === 'tournament_registration') {
      navigate(-1)
      return
    }
    setCancelOpen(true)
  }

  const confirmCancel = async () => {
    setCancelOpen(false)
    pendingPayment.clear()
    if (entity.type === 'booking') {
      await releaseBookingHold(entity.id)
      navigate('/clubs')
      return
    }
    if (entity.type === 'event_participation' && eventId) {
      await releaseEvent(eventId)
      navigate(-1)
      return
    }
    navigate(-1)
  }

  const headerTitle = t('payment.title')

  return (
    <main className="min-h-screen bg-rally-bg pb-32">
      <header className="sticky top-0 z-10 flex items-center justify-between bg-rally-bg/95 px-4 h-14 border-b border-rally-border">
        <button
          onClick={handleBack}
          className="text-rally-text-2"
          aria-label={t('common.back')}
        >
          <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
        </button>
        <h1 className="text-rally-text font-semibold">{headerTitle}</h1>
        <button
          onClick={() => navigate('/')}
          aria-label="close"
          className="text-rally-text-2"
        >
          <X className="w-5 h-5" />
        </button>
      </header>

      <div className="container mx-auto px-4 max-w-xl pt-6 space-y-6">
        <section className="rounded-2xl bg-rally-surface border border-rally-border p-5 text-center">
          <p className="text-[11px] uppercase tracking-wider text-rally-text-muted">
            {t('payment.amountDue')}
          </p>
          <p className="font-display text-4xl md:text-5xl font-black text-rally-accent mt-1">
            {formatCurrency(amount)}
          </p>
        </section>

        {!hideRecommended && cardsQuery.isLoading && (
          <Skeleton className="h-24 rounded-2xl" />
        )}

        {!hideRecommended && !cardsQuery.isLoading && cards.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-[11px] uppercase tracking-wider text-rally-text-muted">
              {t('payment.recommended')}
            </h2>
            <div className="space-y-2">
              {cards.map((card) => (
                <SavedCardRow
                  key={card.id}
                  card={card}
                  selected={card.id === selectedCardId}
                  onSelect={setSelectedCardId}
                />
              ))}
            </div>
          </section>
        )}

        {entity.type !== 'event_participation' && (
          <section className="space-y-3">
            <div className="rounded-2xl border border-rally-border bg-rally-surface overflow-hidden">
              <button
                type="button"
                onClick={handlePayWithCard}
                disabled={working}
                className="w-full flex items-center gap-3 px-4 py-4 text-start hover:border-rally-accent/40 transition-colors disabled:opacity-50"
              >
                <span className="w-10 h-10 rounded-full bg-rally-accent/15 text-rally-accent flex items-center justify-center">
                  <Lock className="w-5 h-5" />
                </span>
                <div className="flex-1">
                  <p className="text-rally-text font-semibold">
                    {t('payment.cardTitle')}
                  </p>
                  <p className="text-xs text-rally-text-2">
                    {t('payment.cardSubtitle')}
                  </p>
                </div>
              </button>
              {entity.type === 'booking' && (
                <label
                  htmlFor="save-card-consent"
                  className="flex items-center gap-3 px-4 py-3 border-t border-rally-border cursor-pointer"
                >
                  <input
                    type="checkbox"
                    id="save-card-consent"
                    aria-label={t('payment.saveCardConsent')}
                    checked={saveCard}
                    onChange={(e) => setSaveCard(e.target.checked)}
                    className="w-4 h-4 accent-rally-accent"
                  />
                  <span className="text-sm text-rally-text">{t('payment.saveCardConsent')}</span>
                </label>
              )}
            </div>
          </section>
        )}

        {entity.type === 'event_participation' && !cardsQuery.isLoading && cards.length === 0 && (
          <p className="rounded-xl bg-rally-surface border border-rally-border text-rally-text-2 text-sm p-3 text-center">
            {t('payment.eventSavedCardOnly')}
          </p>
        )}

        <section className="space-y-3">
          <h2 className="text-[11px] uppercase tracking-wider text-rally-text-muted">
            {t('payment.otherMethods')}
          </h2>
          <div className="space-y-2">
            {[
              { id: 'apple', label: t('payment.applePay') },
              { id: 'google', label: t('payment.googlePay') },
            ].map((row) => (
              <div
                key={row.id}
                className="w-full flex items-center gap-3 rounded-2xl border border-rally-border bg-rally-surface/50 px-4 py-3 opacity-50"
                aria-disabled="true"
              >
                <span className="flex-1 text-rally-text">{row.label}</span>
                <span className="text-[10px] uppercase tracking-wider bg-rally-text-muted/15 text-rally-text-muted px-2 py-1 rounded-full font-bold">
                  {t('payment.comingSoonBadge')}
                </span>
              </div>
            ))}
          </div>
        </section>

        <p className="text-[11px] text-rally-text-muted text-center">
          {t('payment.providerFooter')}
        </p>

        {inlineError && (
          <p className="rounded-xl bg-rally-error/10 border border-rally-error/30 text-rally-error text-sm p-3 text-center">
            {inlineError}
          </p>
        )}
      </div>

      {!hideRecommended && (
        <div className="fixed bottom-0 inset-x-0 bg-rally-bg/95 backdrop-blur border-t border-rally-border">
          <div className="container mx-auto max-w-xl px-4 py-3">
            <button
              type="button"
              onClick={handlePayNow}
              disabled={working || !selectedCard}
              className="w-full h-12 rounded-full bg-rally-accent text-rally-accent-text font-bold disabled:opacity-40 inline-flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" />
              {t('payment.payNow', { amount: formatCurrency(amount) })}
            </button>
          </div>
        </div>
      )}

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogTitle>{t('payment.leaveTitle')}</DialogTitle>
          <DialogDescription>
            {entity.type === 'booking'
              ? t('payment.leaveMessageBooking')
              : entity.type === 'event_participation'
              ? t('payment.leaveMessageEvent')
              : t('payment.leaveMessageTournament')}
          </DialogDescription>
          <DialogFooter>
            <button
              onClick={() => setCancelOpen(false)}
              className="px-4 py-2 rounded-full border border-rally-border text-rally-text"
            >
              {t('payment.continueButton')}
            </button>
            <button
              onClick={confirmCancel}
              className="px-4 py-2 rounded-full bg-rally-error text-white font-bold"
            >
              {t('payment.cancelButton')}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {working && (
        <div className="fixed inset-0 z-50 bg-rally-bg/80 backdrop-blur-sm flex items-center justify-center">
          <div className="rounded-2xl bg-rally-surface border border-rally-border px-6 py-5 text-center space-y-3 shadow-2xl">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-rally-border border-t-rally-accent" />
            <p className="text-rally-text font-semibold">{t('payment.preparing')}</p>
          </div>
        </div>
      )}
    </main>
  )
}