import { describe, it, expect } from 'vitest'
import i18n from '@/i18n'
import { paymentReceiptRows } from './paymentReceipt'
import type { MyPayment } from '@/types/api'

const t = i18n.t.bind(i18n)
// rally-api's shape (TournamentService.get_my_payment): gross = fee + service − coupon,
// base = gross − service; credits pay part of the gross.
const pay = (over: Partial<MyPayment>): MyPayment => ({
  base_amount: 0, fee_portion: 0, gross_amount: 0, discount_amount: 0, credits_applied: 0,
  card_charged: 0, auto_charged_amount: 0, payment_status: 'completed', refund: null, ...over,
})
const values = (rows: ReturnType<typeof paymentReceiptRows>) => rows.map((r) => [r.key, r.value])

describe('paymentReceiptRows', () => {
  it('a 100% coupon reads 300, −300, 0 — not "0, −300, 0"', () => {
    expect(values(paymentReceiptRows(pay({ base_amount: 0, gross_amount: 0, discount_amount: 300 }), t)))
      .toEqual([['entryFee', '₪300'], ['discount', '-₪300'], ['total', '₪0']])
  })

  it('credits and a coupon: every row adds up to what reached the card', () => {
    const rows = paymentReceiptRows(
      pay({ base_amount: 135, gross_amount: 135, discount_amount: 15, credits_applied: 35, card_charged: 100 }), t,
    )
    expect(values(rows)).toEqual([['entryFee', '₪150'], ['credits', '-₪35'], ['discount', '-₪15'], ['total', '₪100']])
  })

  it('nothing to explain → no rows: a plain fee, an unsettled payment, or no payment at all', () => {
    expect(paymentReceiptRows(pay({ base_amount: 300, gross_amount: 300 }), t)).toEqual([])
    expect(paymentReceiptRows(pay({ gross_amount: 0, discount_amount: 300, payment_status: 'payment_held' }), t)).toEqual([])
    expect(paymentReceiptRows(null, t)).toEqual([])
  })
})
