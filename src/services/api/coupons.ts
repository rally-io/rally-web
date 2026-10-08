// src/services/api/coupons.ts
import client from './client'
import type { ApiResponse, ConsumerCoupon, CouponPreview } from '@/types/api'

export interface CouponContextParams {
  tournamentId: string
  /** The amount the discount is computed against — the registration's own
   *  (pre-coupon) amount due, never the tournament's base entry fee. */
  orderValue: number
}

/** Every visible, applicable-or-not coupon for this tournament/order — powers
 *  the "view all coupons" list. */
export async function listCoupons(
  params: CouponContextParams,
): Promise<ApiResponse<ConsumerCoupon[]>> {
  return client.get('/rally/v1/coupons', {
    params: { tournament_id: params.tournamentId, order_value: params.orderValue },
  })
}

/** Resolves a typed code (or a code picked from the list) against the same
 *  context — the authoritative discount/final amount for the order. */
export async function previewCoupon(
  code: string,
  params: CouponContextParams,
): Promise<ApiResponse<CouponPreview>> {
  return client.post('/rally/v1/coupons/preview', {
    code: code.trim().toUpperCase(),
    tournament_id: params.tournamentId,
    order_value: params.orderValue,
  })
}
