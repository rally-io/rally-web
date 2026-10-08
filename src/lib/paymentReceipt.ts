import type { TFunction } from 'i18next'
import type { PriceBreakdownRow } from '@/components/coupons/PriceBreakdown'
import { formatCurrency } from '@/lib/tournamentHelpers'
import type { MyPayment } from '@/types/api'

/**
 * The receipt for the viewer's own settled registration — entry fee, coupon
 * discount, amount paid — or no rows when there is nothing beyond a plain fee to
 * explain. Shared by the tournament page and the /join registered card.
 *
 * Only once money has actually moved (payment_status completed/refunded), the
 * gate rally-mobile's `buildPaymentSections` uses too.
 *
 * The arithmetic follows rally-api (`TournamentService.get_my_payment`):
 * `gross_amount` is what the registration came to AFTER the coupon
 * (`entry_fee + service_fee - discount`), and `base_amount` is that minus the
 * service fee — so `base_amount` is post-discount too and must not be labelled
 * the entry fee (a 100% coupon read "₪0, −₪300, ₪0"). The price before the
 * coupon is `gross_amount + discount_amount`. Credits pay part of `gross_amount`
 * (it is not reduced by them), so the total left to the card is
 * `gross_amount - credits_applied`.
 * Every row therefore adds up: fee − credits − coupon = total.
 */
export function paymentReceiptRows(myPayment: MyPayment | null | undefined, t: TFunction): PriceBreakdownRow[] {
  if (!myPayment) return []
  const settled = myPayment.payment_status === 'completed' || myPayment.payment_status === 'refunded'
  const discount = myPayment.discount_amount ?? 0
  const credits = myPayment.credits_applied ?? 0
  if (!settled || (discount <= 0 && credits <= 0)) return []
  return [
    { key: 'entryFee', label: t('coupon.entryFee'), value: formatCurrency(myPayment.gross_amount + discount) },
    ...(credits > 0
      ? [{ key: 'credits', label: t('coupon.creditsApplied'), value: `-${formatCurrency(credits)}`, tone: 'success' as const }]
      : []),
    ...(discount > 0
      ? [{ key: 'discount', label: t('coupon.discount'), value: `-${formatCurrency(discount)}`, tone: 'success' as const }]
      : []),
    {
      key: 'total',
      label: t('coupon.totalPaid'),
      value: formatCurrency(Math.max(0, myPayment.gross_amount - credits)),
      bold: true,
    },
  ]
}
