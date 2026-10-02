import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCouponFlow } from './useCouponFlow'
import { listCoupons, previewCoupon } from '@/services/api/coupons'

vi.mock('@/services/api/coupons', () => ({
  listCoupons: vi.fn(),
  previewCoupon: vi.fn(),
}))

const mockList = vi.mocked(listCoupons)
const mockPreview = vi.mocked(previewCoupon)

const preview = {
  coupon_id: 'c-1',
  code: 'SAVE10',
  name: '10% off',
  discount_amount: 15,
  original_amount: 150,
  final_amount: 135,
  currency: 'ILS',
  rule_points: [],
}

describe('useCouponFlow', () => {
  beforeEach(() => vi.clearAllMocks())

  it('starts with no applied coupon and the full order value as final amount', () => {
    const { result } = renderHook(() => useCouponFlow('t-1', 150))
    expect(result.current.appliedCoupon).toBeNull()
    expect(result.current.discountAmount).toBe(0)
    expect(result.current.finalAmount).toBe(150)
  })

  it('fetches the applicable-coupons list for the tournament/order context', async () => {
    mockList.mockResolvedValue({ success: true, data: [], meta: null, error: null })
    const { result } = renderHook(() => useCouponFlow('t-1', 150))
    await act(() => result.current.fetchCoupons())
    expect(mockList).toHaveBeenCalledWith({ tournamentId: 't-1', orderValue: 150 })
  })

  it('applies a typed code and derives the discount/final amount from the preview', async () => {
    mockPreview.mockResolvedValue({ success: true, data: preview, meta: null, error: null })
    const { result } = renderHook(() => useCouponFlow('t-1', 150))
    await act(() => result.current.applyCode('save10'))
    expect(mockPreview).toHaveBeenCalledWith('save10', { tournamentId: 't-1', orderValue: 150 })
    expect(result.current.appliedCoupon).toEqual(preview)
    expect(result.current.couponId).toBe('c-1')
    expect(result.current.discountAmount).toBe(15)
    expect(result.current.finalAmount).toBe(135)
  })

  it('throws the backend message on an invalid code and leaves nothing applied', async () => {
    mockPreview.mockResolvedValue({
      success: false,
      error: { code: 'INVALID', message: 'Invalid Coupon', details: null },
    })
    const { result } = renderHook(() => useCouponFlow('t-1', 150))
    await expect(act(() => result.current.applyCode('BAD'))).rejects.toThrow('Invalid Coupon')
    expect(result.current.appliedCoupon).toBeNull()
  })

  it('selecting a coupon from the list previews it by code', async () => {
    mockPreview.mockResolvedValue({ success: true, data: preview, meta: null, error: null })
    const { result } = renderHook(() => useCouponFlow('t-1', 150))
    await act(() =>
      result.current.selectCoupon({
        id: 'c-1',
        code: 'SAVE10',
        name: '10% off',
        scope_type: 'tournament',
        value_type: 'percentage',
        value: 10,
        max_discount_amount: null,
        min_order_value: null,
        currency: 'ILS',
        target_resource_id: null,
        split_scope: 'not_applicable',
        usage_limit_total: null,
        usage_limit_per_player: null,
        valid_from: null,
        valid_to: null,
        is_active: true,
        status: 'active',
        rule_points: [],
        is_applicable: true,
      }),
    )
    expect(mockPreview).toHaveBeenCalledWith('SAVE10', { tournamentId: 't-1', orderValue: 150 })
    expect(result.current.appliedCoupon).toEqual(preview)
  })

  it('removing the coupon resets the discount', async () => {
    mockPreview.mockResolvedValue({ success: true, data: preview, meta: null, error: null })
    const { result } = renderHook(() => useCouponFlow('t-1', 150))
    await act(() => result.current.applyCode('save10'))
    act(() => result.current.removeCoupon())
    expect(result.current.appliedCoupon).toBeNull()
    expect(result.current.finalAmount).toBe(150)
  })
})
