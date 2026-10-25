import { describe, it, expect } from 'vitest'
import { waitlistPaymentState } from './waitlistPayment'

const reg = (over: Record<string, unknown> = {}) => ({
  payment_status: null as string | null,
  fee_waiver_status: null as 'pending' | 'approved' | 'rejected' | null,
  fee_waiver_resident_count: null as number | null,
  ...over,
})

describe('waitlistPaymentState', () => {
  it('a card hold in place is held', () => {
    expect(waitlistPaymentState(reg({ payment_status: 'payment_held' }), 150, 2)).toBe('held')
  })

  it('nothing paid or held yet is awaiting', () => {
    expect(waitlistPaymentState(reg(), 150, 2)).toBe('awaiting')
    expect(waitlistPaymentState(reg({ payment_status: 'pending' }), 150, 2)).toBe('awaiting')
  })

  it('a fully paid (credits / coupon) row is settled', () => {
    expect(waitlistPaymentState(reg({ payment_status: 'completed' }), 150, 2)).toBe('settled')
  })

  it('two residents on a doubles tournament owe nothing, even before confirm-zero ran', () => {
    const r = reg({ fee_waiver_status: 'pending', fee_waiver_resident_count: 2 })
    expect(waitlistPaymentState(r, 150, 2)).toBe('free')
    expect(waitlistPaymentState({ ...r, payment_status: 'completed' }, 150, 2)).toBe('free')
  })

  it('one resident on doubles still owes half, so it is awaiting', () => {
    const r = reg({ fee_waiver_status: 'pending', fee_waiver_resident_count: 1 })
    expect(waitlistPaymentState(r, 150, 2)).toBe('awaiting')
  })

  it('a rejected waiver never zeroes the price', () => {
    const r = reg({ fee_waiver_status: 'rejected', fee_waiver_resident_count: 2 })
    expect(waitlistPaymentState(r, 150, 2)).toBe('awaiting')
  })
})
