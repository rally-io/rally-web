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

  // rally-api reports a ₪0 sign-up as `completed` too, so "completed" alone does not mean money moved.
  it('a free event owes nothing, whether or not the free confirmation has run', () => {
    expect(waitlistPaymentState(reg(), 0, 2)).toBe('free')
    expect(waitlistPaymentState(reg({ payment_status: 'completed' }), 0, 2)).toBe('free')
    expect(waitlistPaymentState(reg({ payment_status: 'completed', service_fee: 0 }), 0, 1)).toBe('free')
  })

  // FeeConfig in rally-api can be flat, and then a ₪0 price still carries a fee.
  it('a service fee is still owed at a zero price', () => {
    expect(waitlistPaymentState(reg({ service_fee: 5 }), 0, 2)).toBe('awaiting')
    expect(waitlistPaymentState(reg({ payment_status: 'completed', service_fee: 5 }), 0, 2)).toBe('settled')
    const waived = reg({ fee_waiver_status: 'pending', fee_waiver_resident_count: 2, service_fee: 5 })
    expect(waitlistPaymentState(waived, 150, 2)).toBe('awaiting')
  })

  it('a hold outranks a zero price', () => {
    expect(waitlistPaymentState(reg({ payment_status: 'payment_held' }), 0, 2)).toBe('held')
  })
})
