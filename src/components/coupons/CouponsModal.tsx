import { useTranslation } from 'react-i18next'
import { Info, Sparkles, Tag, Ticket } from 'lucide-react'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/tournamentHelpers'
import type { ConsumerCoupon } from '@/types/api'

export interface CouponsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  coupons: ConsumerCoupon[]
  appliedCouponId?: string | null
  onSelectCoupon: (coupon: ConsumerCoupon) => void
  loading?: boolean
}

/** Browse every visible coupon for this order — applicable ones apply with
 *  one click, non-applicable ones show the server's localized reason
 *  up front (mirrors rally-mobile's `CouponsModal`). */
export function CouponsModal({
  open,
  onOpenChange,
  coupons,
  appliedCouponId,
  onSelectCoupon,
  loading = false,
}: CouponsModalProps) {
  const { t, i18n } = useTranslation()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* bg-rally-surface is load-bearing: the shared DialogContent defaults to
          shadcn's `bg-background`, which this theme doesn't define, so without it
          the page shows straight through the dialog. */}
      <DialogContent
        dir={i18n.dir()}
        className="bg-rally-surface border-rally-border w-[calc(100%_-_2rem)] max-w-md rounded-2xl max-h-[85dvh] overflow-y-auto"
      >
        <DialogHeader className="text-start">
          <DialogTitle className="font-display text-rally-text">{t('coupon.modalTitle')}</DialogTitle>
          <DialogDescription className="text-rally-text-2">{t('coupon.modalSubtitle')}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="py-10 text-center text-sm text-rally-text-2">{t('coupon.loading')}</p>
        ) : coupons.length === 0 ? (
          <div className="py-10 text-center">
            <Ticket className="w-10 h-10 mx-auto text-rally-text-muted mb-3" />
            <p className="font-bold text-rally-text">{t('coupon.emptyTitle')}</p>
            <p className="text-sm text-rally-text-2 mt-1">{t('coupon.emptySubtitle')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {coupons.map((coupon) => {
              const isApplied = appliedCouponId === coupon.id
              const savings = coupon.discount_amount

              return (
                <div
                  key={coupon.id}
                  className={cn(
                    // surface-2 so cards read against the dialog's own surface.
                    'rounded-xl border p-3 bg-rally-surface-2',
                    isApplied ? 'border-rally-accent bg-rally-accent/5' : 'border-rally-border',
                  )}
                >
                  <div className={cn('flex items-center justify-between gap-2', !coupon.is_applicable && 'opacity-60')}>
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-extrabold tracking-wide',
                        coupon.is_applicable
                          ? 'bg-rally-accent/10 text-rally-accent'
                          : 'bg-rally-surface text-rally-text-muted',
                      )}
                    >
                      <Tag className="w-3 h-3" />
                      {coupon.code}
                    </span>
                    {coupon.is_applicable ? (
                      <button
                        type="button"
                        onClick={() => {
                          onSelectCoupon(coupon)
                          onOpenChange(false)
                        }}
                        className={cn(
                          'px-3 py-1 rounded-lg text-xs font-bold',
                          isApplied
                            ? 'bg-rally-success/15 border border-rally-success text-rally-success'
                            : 'bg-rally-accent text-rally-accent-text',
                        )}
                      >
                        {isApplied ? t('coupon.applied') : t('coupon.apply')}
                      </button>
                    ) : (
                      <span className="px-2 py-1 rounded-md bg-rally-surface text-rally-text-muted text-[11px] font-semibold">
                        {t('coupon.notApplicable')}
                      </span>
                    )}
                  </div>

                  {coupon.is_applicable && savings != null && savings > 0 && (
                    <p className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-rally-accent">
                      <Sparkles className="w-3 h-3" />
                      {t('coupon.savingsAmount', { amount: formatCurrency(savings) })}
                    </p>
                  )}

                  {coupon.rule_points.length > 0 && (
                    <ul className={cn('mt-2 space-y-0.5', !coupon.is_applicable && 'opacity-60')}>
                      {coupon.rule_points.map((rule, i) => (
                        <li key={i} className="text-xs text-rally-text-2 flex gap-1.5">
                          <span className="text-rally-text-muted">•</span>
                          <span>{rule}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {!coupon.is_applicable && coupon.disabled_reason && (
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-rally-error">
                      <Info className="w-3.5 h-3.5 shrink-0" />
                      {coupon.disabled_reason}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
