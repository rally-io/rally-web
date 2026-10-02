// src/services/api/payments.ts
import client from './client'
import type { ApiResponse, InitiatePaymentResponse, WaitlistHoldStatusResponse } from '@/types/api'

export async function initiateTournamentRegistrationPayment(
  registrationId: string,
  couponId?: string,
): Promise<ApiResponse<InitiatePaymentResponse>> {
  const url = `/rally/v1/payments/tournament-registration/${registrationId}/initiate`
  return couponId ? client.post(url, { coupon_id: couponId }) : client.post(url)
}

/** Place a J4/J5 pre-auth hold for a tournament waitlist join. */
export async function initiateTournamentWaitlistHoldPayment(
  waitlistEntryId: string,
): Promise<ApiResponse<InitiatePaymentResponse>> {
  return client.post(`/rally/v1/payments/tournament-waitlist/${waitlistEntryId}/initiate`)
}

/** Polled on the confirming page — there is no registration to poll until promotion. */
export async function getWaitlistHoldStatus(
  waitlistEntryId: string,
): Promise<ApiResponse<WaitlistHoldStatusResponse>> {
  return client.get(`/rally/v1/payments/tournament-waitlist/${waitlistEntryId}/hold-status`)
}

export async function confirmTournamentZeroPayment(
  registrationId: string,
  couponId?: string,
): Promise<ApiResponse<{ confirmed: boolean }>> {
  const url = `/rally/v1/payments/tournament-registration/${registrationId}/confirm-zero-payment`
  return couponId ? client.post(url, { coupon_id: couponId }) : client.post(url)
}
