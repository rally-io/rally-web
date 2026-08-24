import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/tournamentHelpers'
import type { RegistrationDetail } from '@/types/api'

interface Props {
  registration: RegistrationDetail
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (refundTo: 'wallet' | 'source') => void
  isSubmitting: boolean
}

function RadioRow({
  selected,
  disabled,
  onSelect,
  label,
  children,
}: {
  selected: boolean
  disabled?: boolean
  onSelect: () => void
  label: string
  children?: React.ReactNode
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      className={`w-full text-start rounded-xl border p-3 transition-colors ${
        disabled
          ? 'opacity-50 border-rally-border cursor-not-allowed'
          : selected
          ? 'border-rally-accent bg-rally-surface-2'
          : 'border-rally-border hover:border-rally-accent/40'
      }`}
    >
      <div className="flex items-center gap-2.5">
        <span
          className={`w-[18px] h-[18px] rounded-full border-2 shrink-0 ${
            selected ? 'border-rally-accent bg-rally-accent' : 'border-rally-border'
          }`}
        />
        <span className={disabled ? 'text-rally-text-2' : 'text-rally-text'}>{label}</span>
      </div>
      {children && <div className="mt-1.5 ps-[26px] space-y-0.5">{children}</div>}
    </button>
  )
}

export function WithdrawRegistrationModal({
  registration, open, onOpenChange, onConfirm, isSubmitting,
}: Props) {
  const { t } = useTranslation()
  const [selectedRefundTo, setSelectedRefundTo] = useState<'wallet' | 'source'>('wallet')

  const isCompletedPayment = registration.payment_status === 'completed'
  const myPayment = registration.my_payment
  const cardCharged = myPayment?.card_charged ?? 0
  const creditsApplied = myPayment?.credits_applied ?? 0
  const feePortion = myPayment?.fee_portion ?? 0
  const toCard = Math.max(0, cardCharged - feePortion)
  const walletAmount = Math.max(0, cardCharged + creditsApplied - feePortion)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-white/10 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-rally-text">
            {t('tournament.withdrawModalTitle')}
          </DialogTitle>
        </DialogHeader>

        {isCompletedPayment ? (
          <div className="space-y-3">
            <p className="text-sm text-rally-text-2">{t('tournament.cancelRefundQuestion')}</p>
            {registration.service_fee > 0 && (
              <p className="text-sm text-rally-text-2">
                {t('tournament.cancelServiceFeeNonRefundable')}
              </p>
            )}

            {cardCharged <= 0 ? (
              <RadioRow selected={false} disabled onSelect={() => {}} label={t('tournament.cancelRefundToSource')}>
                <p className="text-xs text-rally-text-muted">
                  {t('tournament.cancelRefundFullCreditsNote')}
                </p>
              </RadioRow>
            ) : (
              <RadioRow
                selected={selectedRefundTo === 'source'}
                onSelect={() => setSelectedRefundTo('source')}
                label={t('tournament.cancelRefundToSource')}
              >
                {selectedRefundTo === 'source' && (
                  <>
                    {toCard > 0 && (
                      <p className="text-xs text-rally-text-muted">
                        {t('tournament.cancelRefundToCard', { amount: formatCurrency(toCard) })}
                      </p>
                    )}
                    {creditsApplied > 0 && (
                      <p className="text-xs text-rally-text-muted">
                        {t('tournament.cancelRefundCreditsToWallet', { amount: formatCurrency(creditsApplied) })}
                      </p>
                    )}
                  </>
                )}
              </RadioRow>
            )}

            <RadioRow
              selected={selectedRefundTo === 'wallet'}
              onSelect={() => setSelectedRefundTo('wallet')}
              label={t('tournament.cancelRefundToWallet')}
            >
              {selectedRefundTo === 'wallet' && walletAmount > 0 && (
                <p className="text-xs text-rally-text-muted">
                  {t('tournament.cancelRefundWalletAmount', { amount: formatCurrency(walletAmount) })}
                </p>
              )}
            </RadioRow>
          </div>
        ) : (
          <p className="text-sm text-rally-text-2">{t('tournament.withdrawModalBody')}</p>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            {t('tournament.withdrawModalDismiss')}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => onConfirm(isCompletedPayment ? selectedRefundTo : 'wallet')}
            disabled={isSubmitting}
          >
            {isSubmitting ? t('tournament.withdrawing') : t('tournament.withdrawModalConfirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
