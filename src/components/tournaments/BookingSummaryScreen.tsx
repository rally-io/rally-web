import { useTranslation } from 'react-i18next'
import { Check, X, Calendar, MapPin } from 'lucide-react'
import { formatCurrency } from '@/lib/tournamentHelpers'

export type SummaryMode = 'success' | 'zero_payment' | 'deferred_pay'

interface Props {
  title: string
  clubName: string
  scheduleText: string
  subtitleText?: string
  imageUrl: string | null
  mode: SummaryMode
  onClose: () => void
  onBack?: () => void
  // success
  successMessage?: string
  // zero_payment
  onConfirm?: () => void
  confirmLabel?: string
  confirmPending?: boolean
  // deferred_pay
  price?: number
  serviceFee?: number
  deferredNotice?: string
}

export function BookingSummaryScreen(props: Props) {
  const { t } = useTranslation()
  const {
    title, clubName, scheduleText, subtitleText, imageUrl, mode,
    onClose, onBack, successMessage, onConfirm, confirmLabel, confirmPending,
    price = 0, serviceFee = 0, deferredNotice,
  } = props

  const total = price + serviceFee
  const isSuccess = mode === 'success'

  return (
    <main className="min-h-screen bg-rally-bg pb-32">
      <header className="sticky top-0 z-10 flex items-center justify-between bg-rally-bg/95 px-4 h-14 border-b border-rally-border">
        {!isSuccess && onBack ? (
          <button onClick={onBack} className="text-rally-text-2" aria-label="back">
            ‹
          </button>
        ) : (
          <span className="w-6" />
        )}
        <h1 className="text-rally-text font-semibold">{title}</h1>
        <button onClick={onClose} aria-label="close" className="text-rally-text-2">
          <X className="w-5 h-5" />
        </button>
      </header>

      <div className="relative h-[150px]">
        {imageUrl ? (
          <img src={imageUrl} alt={clubName} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-rally-surface-2" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/75" />
        <div className="absolute bottom-3 start-4 text-rally-text">
          <p className="text-lg font-bold">{clubName}</p>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-xl mt-6 space-y-4">
        <div className="rounded-2xl bg-rally-surface border border-rally-border p-4 space-y-3">
          <div className="flex items-center gap-3">
            <MapPin className="w-4 h-4 text-rally-accent" />
            <div>
              <p className="text-[11px] uppercase text-rally-text-muted">
                {t('tournament.bookingSummaryClub')}
              </p>
              <p className="text-rally-text">{clubName}</p>
            </div>
          </div>
          <div className="h-px bg-rally-border" />
          <div className="flex items-center gap-3">
            <Calendar className="w-4 h-4 text-rally-accent" />
            <div>
              <p className="text-[11px] uppercase text-rally-text-muted">
                {t('tournament.bookingSummarySchedule')}
              </p>
              <p className="text-rally-text">{scheduleText}</p>
              {subtitleText && (
                <p className="text-xs text-rally-text-2">{subtitleText}</p>
              )}
            </div>
          </div>
        </div>

        {isSuccess ? (
          <>
            <div className="rounded-2xl bg-rally-success/10 border border-rally-success/30 p-6 text-center">
              <Check className="w-10 h-10 text-rally-success mx-auto" />
              <p className="mt-3 text-rally-text">{successMessage}</p>
            </div>
            <div className="fixed bottom-0 inset-x-0 bg-rally-bg/95 border-t border-rally-border p-4">
              <div className="container mx-auto max-w-xl">
                <button
                  onClick={onClose}
                  className="w-full h-12 rounded-full bg-rally-accent text-rally-accent-text font-bold"
                >
                  {t('tournament.tournamentReturnHome')}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-2xl bg-rally-surface border border-rally-border p-4 space-y-2">
            <div className="flex justify-between text-rally-text-2">
              <span>{t('tournament.bookingSummaryPrice')}</span>
              <span>{formatCurrency(price)}</span>
            </div>
            {serviceFee > 0 && (
              <div className="flex justify-between text-rally-text-2">
                <span>{t('tournament.bookingSummaryServiceCharge')}</span>
                <span>{formatCurrency(serviceFee)}</span>
              </div>
            )}
            <div className="h-px bg-rally-border" />
            <div className="flex justify-between text-rally-text font-bold">
              <span>{t('tournament.bookingSummaryTotal')}</span>
              <span className="text-rally-accent">{formatCurrency(total)}</span>
            </div>
          </div>
        )}

        {mode === 'deferred_pay' && deferredNotice && (
          <p className="text-sm text-rally-text-muted text-center">{deferredNotice}</p>
        )}
      </div>

      {!isSuccess && (
        <div className="fixed bottom-0 inset-x-0 bg-rally-bg/95 border-t border-rally-border p-4">
          <div className="container mx-auto max-w-xl">
            <button
              disabled={mode === 'deferred_pay' || confirmPending}
              onClick={() => onConfirm?.()}
              className="w-full h-12 rounded-full bg-rally-accent text-rally-accent-text font-bold disabled:opacity-40"
            >
              {confirmLabel ?? t('tournament.tournamentPayNow')}
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
