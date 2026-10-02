import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import i18n from '@/i18n'
import { CouponApplyCard } from './CouponApplyCard'

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

describe('CouponApplyCard', () => {
  it('applies a typed code and clears the input', async () => {
    const onApplyCode = vi.fn().mockResolvedValue(undefined)
    render(
      <CouponApplyCard
        onApplyCode={onApplyCode}
        onRemoveCoupon={vi.fn()}
        onViewAllCoupons={vi.fn()}
      />,
    )

    const input = screen.getByPlaceholderText(i18n.t('coupon.placeholder'))
    fireEvent.change(input, { target: { value: 'save10' } })
    expect(input).toHaveValue('SAVE10')
    fireEvent.click(screen.getByRole('button', { name: i18n.t('coupon.apply') }))

    await waitFor(() => expect(onApplyCode).toHaveBeenCalledWith('SAVE10'))
  })

  it('shows the backend error message when applying fails', async () => {
    const onApplyCode = vi.fn().mockRejectedValue(new Error('Coupon has expired'))
    render(
      <CouponApplyCard
        onApplyCode={onApplyCode}
        onRemoveCoupon={vi.fn()}
        onViewAllCoupons={vi.fn()}
      />,
    )

    fireEvent.change(screen.getByPlaceholderText(i18n.t('coupon.placeholder')), {
      target: { value: 'EXPIRED' },
    })
    fireEvent.click(screen.getByRole('button', { name: i18n.t('coupon.apply') }))

    expect(await screen.findByText('Coupon has expired')).toBeInTheDocument()
  })

  it('renders the applied badge, code and savings, with a working remove button', () => {
    const onRemoveCoupon = vi.fn()
    render(
      <CouponApplyCard
        appliedCoupon={preview}
        savingsAmount={15}
        onApplyCode={vi.fn()}
        onRemoveCoupon={onRemoveCoupon}
        onViewAllCoupons={vi.fn()}
      />,
    )

    expect(screen.getByText('SAVE10')).toBeInTheDocument()
    expect(screen.getByText(i18n.t('coupon.applied'))).toBeInTheDocument()
    expect(
      screen.getByText(i18n.t('coupon.savingsApplied', { amount: '₪15' })),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText(i18n.t('coupon.remove')))
    expect(onRemoveCoupon).toHaveBeenCalled()
  })

  it('shows the available count on "view all" and calls through on click', () => {
    const onViewAllCoupons = vi.fn()
    render(
      <CouponApplyCard
        onApplyCode={vi.fn()}
        onRemoveCoupon={vi.fn()}
        onViewAllCoupons={onViewAllCoupons}
        availableCouponsCount={3}
      />,
    )

    const viewAll = screen.getByText(`${i18n.t('coupon.viewAll')} (3)`)
    fireEvent.click(viewAll)
    expect(onViewAllCoupons).toHaveBeenCalled()
  })

  // On /join the card sits inside the registration <form>: Enter must apply the
  // code and nothing else — never submit the registration.
  it('Enter inside a form applies the code without submitting the form', async () => {
    const onApplyCode = vi.fn(async () => {})
    const onSubmit = vi.fn((e: { preventDefault: () => void }) => e.preventDefault())
    render(
      <form onSubmit={onSubmit}>
        <CouponApplyCard onApplyCode={onApplyCode} onRemoveCoupon={vi.fn()} onViewAllCoupons={vi.fn()} />
      </form>,
    )
    const input = screen.getByPlaceholderText(i18n.t('coupon.placeholder'))
    fireEvent.change(input, { target: { value: 'vip' } })
    const enter = fireEvent.keyDown(input, { key: 'Enter' })
    await waitFor(() => expect(onApplyCode).toHaveBeenCalledWith('VIP'))
    // keyDown's default action IS the implicit submission; returning false means prevented.
    expect(enter).toBe(false)
    expect(onSubmit).not.toHaveBeenCalled()
  })
})

