// src/hooks/useCouponFlow.ts
import { useCallback, useState } from 'react'
import { listCoupons, previewCoupon } from '@/services/api/coupons'
import type { ConsumerCoupon, CouponPreview } from '@/types/api'

/**
 * Owns coupon state for one purchase context (tournament + its current
 * amount due) — the apply-a-code input, the "view all coupons" list, and the
 * resulting discount. Mirrors rally-mobile's per-screen local state (there is
 * no global coupon store there either), extracted once since rally-web wires
 * the same flow into both the payment step and (later) bookings.
 *
 * Both the typed-code and the list-selection paths resolve through the same
 * `/coupons/preview` call, so `appliedCoupon` is always its response — the
 * authoritative discount for this order, never re-derived from the coupon's
 * own `value`/`value_type` client-side.
 */
export function useCouponFlow(tournamentId: string, orderValue: number) {
  const [availableCoupons, setAvailableCoupons] = useState<ConsumerCoupon[]>([])
  const [appliedCoupon, setAppliedCoupon] = useState<CouponPreview | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loadingCoupons, setLoadingCoupons] = useState(false)

  const fetchCoupons = useCallback(async () => {
    if (!tournamentId) return
    setLoadingCoupons(true)
    try {
      const result = await listCoupons({ tournamentId, orderValue })
      setAvailableCoupons(result.success ? result.data : [])
    } finally {
      setLoadingCoupons(false)
    }
  }, [tournamentId, orderValue])

  const resolveCode = useCallback(
    async (code: string) => {
      const result = await previewCoupon(code, { tournamentId, orderValue })
      if (!result.success) throw new Error(result.error.message)
      setAppliedCoupon(result.data)
    },
    [tournamentId, orderValue],
  )

  const selectCoupon = useCallback(
    (coupon: ConsumerCoupon) => resolveCode(coupon.code),
    [resolveCode],
  )

  const removeCoupon = useCallback(() => setAppliedCoupon(null), [])

  const discountAmount = appliedCoupon?.discount_amount ?? 0

  return {
    availableCoupons,
    appliedCoupon,
    couponId: appliedCoupon?.coupon_id,
    isModalOpen,
    setIsModalOpen,
    loadingCoupons,
    discountAmount,
    finalAmount: Math.max(0, orderValue - discountAmount),
    fetchCoupons,
    applyCode: resolveCode,
    selectCoupon,
    removeCoupon,
  }
}
