import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import i18n from '@/i18n'
import { CouponsModal } from './CouponsModal'
import type { ConsumerCoupon } from '@/types/api'

const applicable: ConsumerCoupon = {
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
  rule_points: ['One use per player'],
  is_applicable: true,
  discount_amount: 15,
}

const notApplicable: ConsumerCoupon = {
  ...applicable,
  id: 'c-2',
  code: 'EXPIRED5',
  is_applicable: false,
  disabled_reason: 'Coupon has expired',
  discount_amount: null,
}

describe('CouponsModal', () => {
  it('shows the empty state when there are no coupons', () => {
    render(
      <CouponsModal open coupons={[]} onOpenChange={vi.fn()} onSelectCoupon={vi.fn()} />,
    )
    expect(screen.getByText(i18n.t('coupon.emptyTitle'))).toBeInTheDocument()
  })

  it('shows the loading state', () => {
    render(
      <CouponsModal open loading coupons={[]} onOpenChange={vi.fn()} onSelectCoupon={vi.fn()} />,
    )
    expect(screen.getByText(i18n.t('coupon.loading'))).toBeInTheDocument()
  })

  it('selecting an applicable coupon applies it and closes the modal', () => {
    const onSelectCoupon = vi.fn()
    const onOpenChange = vi.fn()
    render(
      <CouponsModal
        open
        coupons={[applicable]}
        onOpenChange={onOpenChange}
        onSelectCoupon={onSelectCoupon}
      />,
    )

    expect(screen.getByText('SAVE10')).toBeInTheDocument()
    expect(
      screen.getByText(i18n.t('coupon.savingsAmount', { amount: '₪15' })),
    ).toBeInTheDocument()
    expect(screen.getByText('One use per player')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: i18n.t('coupon.apply') }))
    expect(onSelectCoupon).toHaveBeenCalledWith(applicable)
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('shows a non-applicable coupon as disabled with its reason, no apply button', () => {
    render(
      <CouponsModal
        open
        coupons={[notApplicable]}
        onOpenChange={vi.fn()}
        onSelectCoupon={vi.fn()}
      />,
    )

    expect(screen.getByText(i18n.t('coupon.notApplicable'))).toBeInTheDocument()
    expect(screen.getByText('Coupon has expired')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: i18n.t('coupon.apply') })).not.toBeInTheDocument()
  })

  it('marks the already-applied coupon as Applied', () => {
    render(
      <CouponsModal
        open
        coupons={[applicable]}
        appliedCouponId="c-1"
        onOpenChange={vi.fn()}
        onSelectCoupon={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: i18n.t('coupon.applied') })).toBeInTheDocument()
  })
})
