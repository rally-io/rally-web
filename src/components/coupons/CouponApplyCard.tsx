import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertCircle, CheckCircle2, ChevronRight, Sparkles, Tag, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/tournamentHelpers'
import type { CouponPreview } from '@/types/api'

export interface CouponApplyCardProps {
  appliedCoupon?: CouponPreview | null
  /** The actual discount computed for this order, in currency units. */
  savingsAmount?: number
  onApplyCode: (code: string) => Promise<void>
  onRemoveCoupon: () => void
  onViewAllCoupons: () => void
  availableCouponsCount?: number
  disabled?: boolean
}

/** A dumb input/badge — the caller owns the API call and the applied state
 *  (mirrors rally-mobile's `CouponApplyCard`). */
export function CouponApplyCard({
  appliedCoupon,
  savingsAmount = 0,
  onApplyCode,
  onRemoveCoupon,
  onViewAllCoupons,
  availableCouponsCount,
  disabled = false,
}: CouponApplyCardProps) {
  const { t } = useTranslation()
  const [code, setCode] = useState('')
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleApply = async () => {
    if (!code.trim() || applying || disabled) return
    setError(null)
    setApplying(true)
    try {
      await onApplyCode(code.trim())
      setCode('')
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : t('coupon.invalid'))
    } finally {
      setApplying(false)
    }
  }

  return (
    <div className="rounded-2xl bg-rally-surface border border-rally-border p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-rally-accent/10 text-rally-accent">
            <Tag className="w-4 h-4" />
          </span>
          <span className="font-display font-bold text-sm text-rally-text">
            {t('coupon.sectionTitle')}
          </span>
        </div>
        <button
          type="button"
          onClick={onViewAllCoupons}
          disabled={disabled}
          className="inline-flex items-center gap-1 text-xs font-semibold text-rally-accent disabled:opacity-50"
        >
          {t('coupon.viewAll')}
          {availableCouponsCount !== undefined && availableCouponsCount > 0
            ? ` (${availableCouponsCount})`
            : ''}
          <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
        </button>
      </div>

      <div className="flex items-center gap-2">
        <div
          className={cn(
            'flex-1 h-10 rounded-lg border px-3 flex items-center gap-2 min-w-0',
            appliedCoupon
              ? 'border-rally-accent/40 bg-rally-accent/5'
              : 'border-rally-border-strong bg-rally-surface-2',
          )}
        >
          {appliedCoupon ? (
            <>
              <Tag className="w-3.5 h-3.5 text-rally-accent shrink-0" />
              <span className="flex-1 font-bold text-sm tracking-wide text-rally-text truncate">
                {appliedCoupon.code}
              </span>
              <button
                type="button"
                onClick={onRemoveCoupon}
                disabled={disabled}
                aria-label={t('coupon.remove')}
                className="shrink-0 text-rally-text-muted hover:text-rally-text"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          ) : (
            <input
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase())
                if (error) setError(null)
              }}
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return
                // Enter applies the code — and only that. Inside a <form> (the /join
                // registration form) it would otherwise also submit the form.
                e.preventDefault()
                void handleApply()
              }}
              placeholder={t('coupon.placeholder')}
              disabled={disabled || applying}
              className="flex-1 min-w-0 bg-transparent text-sm text-rally-text placeholder:text-rally-text-muted focus:outline-none"
            />
          )}
        </div>

        {appliedCoupon ? (
          <span className="h-10 px-4 rounded-lg bg-rally-success/10 border border-rally-success/30 text-rally-success text-xs font-bold inline-flex items-center gap-1.5 shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {t('coupon.applied')}
          </span>
        ) : (
          <button
            type="button"
            onClick={() => void handleApply()}
            disabled={!code.trim() || applying || disabled}
            className="h-10 px-4 rounded-lg bg-rally-accent text-rally-accent-text text-xs font-bold disabled:opacity-40 shrink-0"
          >
            {applying ? '…' : t('coupon.apply')}
          </button>
        )}
      </div>

      {appliedCoupon && savingsAmount > 0 && (
        <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-rally-success">
          <Sparkles className="w-3.5 h-3.5" />
          {t('coupon.savingsApplied', { amount: formatCurrency(savingsAmount) })}
        </p>
      )}

      {error && (
        <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-rally-error">
          <AlertCircle className="w-3.5 h-3.5" />
          {error}
        </p>
      )}
    </div>
  )
}
