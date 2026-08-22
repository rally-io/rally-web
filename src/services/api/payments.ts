// src/services/api/payments.ts
import client from './client'
import type { ApiResponse, InitiatePaymentResponse } from '@/types/api'

export async function initiateTournamentRegistrationPayment(
  registrationId: string,
): Promise<ApiResponse<InitiatePaymentResponse>> {
  return client.post(`/rally/v1/payments/tournament-registration/${registrationId}/initiate`)
}

export async function confirmTournamentZeroPayment(
  registrationId: string,
): Promise<ApiResponse<{ confirmed: boolean }>> {
  return client.post(
    `/rally/v1/payments/tournament-registration/${registrationId}/confirm-zero-payment`,
  )
}
