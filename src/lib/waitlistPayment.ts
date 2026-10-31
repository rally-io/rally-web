import { waivedAmount } from '@/lib/evidenceRules'
import type { MyRegistration } from '@/types/api'

export type WaitlistPaymentState = 'awaiting' | 'held' | 'settled' | 'free'

/**
 * What a queued registration's payment looks like to its owner. Mirrors the
 * rules TournamentDetailPage and the corporate RegisteredCard apply to a seated
 * registration: a claimed waiver that takes the price to ₪0 owes nothing,
 * whatever the club has or has not confirmed yet. A free event is the same case
 * with no waiver: rally-api marks it `completed` though nothing was paid, so that
 * status alone does not mean money moved. A service fee can be flat, so it is
 * still owed at ₪0 (rally-api FeeConfig; rally-mobile reads the price the same way).
 */
export function waitlistPaymentState(
  reg: Pick<MyRegistration, 'payment_status' | 'service_fee' | 'fee_waiver_status' | 'fee_waiver_resident_count'>,
  entryFee: number,
  seats: 1 | 2,
): WaitlistPaymentState {
  const residents = (reg.fee_waiver_resident_count ?? 0) as 0 | 1 | 2
  const claimed = reg.fee_waiver_status === 'pending' || reg.fee_waiver_status === 'approved'
  const free = waivedAmount(entryFee, seats, claimed ? residents : 0) + (reg.service_fee ?? 0) === 0
  if (reg.payment_status === 'payment_held') return 'held'
  if (free) return 'free'
  if (reg.payment_status === 'completed') return 'settled'
  return 'awaiting'
}
