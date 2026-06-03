// src/services/api/payments.ts
// API-layer wrappers for PAYMENT_SPEC.md §3 endpoints.
//
// NOTE: The axios response interceptor rejects (throws) on non-2xx responses.
// Payment page callers expect resolved ApiResponse shapes. Every exported
// function here normalizes thrown errors into { success: false, error: {…} }
// so callers can use `if (!r.success)` uniformly without try/catch at the UI layer.
import client from './client'
import type {
  ApiResponse,
  PaymentEntity,
  SavedCard,
  InitiatePaymentResponse,
  InitiateBookingPaymentBody,
  ChargeSavedCardResponse,
} from '@/types/api'

// PaymentEntity.type → URL segment. Note the dashes: backend uses
// `tournament-registration` / `event-participation`, not the underscored
// enum values. (PAYMENT_SPEC.md §3.1.)
const entitySegment = {
  booking: 'booking',
  tournament_registration: 'tournament-registration',
  event_participation: 'event-participation',
} as const

// --- 3.3 Saved cards ---

export async function getSavedCards(): Promise<ApiResponse<SavedCard[]>> {
  try {
    return await client.get('/rally/v1/payments/saved-cards')
  } catch (err: any) {
    return { success: false, error: { code: err?.code ?? 'SERVER_ERROR', message: err?.message ?? 'An unexpected error occurred', details: null } }
  }
}

export async function deleteSavedCard(cardId: string): Promise<ApiResponse<null>> {
  try {
    return await client.delete(`/rally/v1/payments/saved-cards/${cardId}`)
  } catch (err: any) {
    return { success: false, error: { code: err?.code ?? 'SERVER_ERROR', message: err?.message ?? 'An unexpected error occurred', details: null } }
  }
}

// --- 3.1 Initiate hosted-checkout (entity payment) ---

export async function initiatePayment(
  entity: PaymentEntity,
  body: InitiateBookingPaymentBody = {},
): Promise<ApiResponse<InitiatePaymentResponse>> {
  // Booking forwards save_card; tournament forwards use_credits (applied
  // server-side before computing the Grow amount); everything else posts an
  // empty body so the backend never sees an unexpected key.
  let requestBody: Record<string, unknown> = {}
  if (entity.type === 'booking') {
    requestBody = { ...body }
  } else if (
    entity.type === 'tournament_registration' &&
    entity.use_credits !== undefined
  ) {
    requestBody = { use_credits: entity.use_credits }
  }
  try {
    return await client.post(
      `/rally/v1/payments/${entitySegment[entity.type]}/${entity.id}/initiate`,
      requestBody,
    )
  } catch (err: any) {
    return { success: false, error: { code: err?.code ?? 'SERVER_ERROR', message: err?.message ?? 'An unexpected error occurred', details: err?.status ? { status: err.status } : null } }
  }
}

// --- 3.2 Charge a saved card (no redirect — server-to-server) ---

/**
 * Charges the player's saved card for the given entity. No Grow redirect.
 *
 * On a 4xx response with status 402 the page should:
 *   1. Show the inline "card declined" error to the user.
 *   2. Re-call getSavedCards(). If the backend marked the failure as
 *      "final" (stolen/blocked/expired card) it soft-deletes the card,
 *      so the next list response won't include it — that's how the page
 *      detects final-vs-transient declines (PAYMENT_SPEC.md §9).
 */
export async function chargeSavedCard(
  entity: PaymentEntity,
  cardId: string,
): Promise<ApiResponse<ChargeSavedCardResponse>> {
  const body: Record<string, unknown> = { card_id: cardId }
  if (entity.type === 'tournament_registration' && entity.use_credits !== undefined) {
    body.use_credits = entity.use_credits
  }
  try {
    return await client.post(
      `/rally/v1/payments/${entitySegment[entity.type]}/${entity.id}/charge-saved-card`,
      body,
    )
  } catch (err: any) {
    // Normalize 402 to a structured decline response so the UI can detect it.
    if (err?.status === 402) {
      return {
        success: false,
        error: { code: 'PAYMENT_DECLINED', message: err?.message ?? 'Payment declined', details: { status: 402 } },
      }
    }
    return { success: false, error: { code: err?.code ?? 'SERVER_ERROR', message: err?.message ?? 'An unexpected error occurred', details: err?.status ? { status: err.status } : null } }
  }
}