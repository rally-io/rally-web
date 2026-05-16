import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@/i18n'
import { BookingSummaryScreen } from './BookingSummaryScreen'

const baseProps = {
  title: 'Registration Summary',
  clubName: 'Padel TLV',
  scheduleText: 'Jun 1 - Jun 2, 2026',
  subtitleText: 'Doubles',
  imageUrl: null as string | null,
  onClose: vi.fn(),
}

describe('BookingSummaryScreen', () => {
  it('success mode shows success message, no CTA', () => {
    render(
      <BookingSummaryScreen
        {...baseProps}
        mode="success"
        successMessage="You are registered."
      />,
    )
    expect(screen.getByText('You are registered.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Pay/i })).toBeNull()
  })

  it('zero-payment mode shows confirm CTA', () => {
    const onConfirm = vi.fn()
    render(
      <BookingSummaryScreen
        {...baseProps}
        mode="zero_payment"
        onConfirm={onConfirm}
        confirmLabel="Confirm Registration"
      />,
    )
    expect(
      screen.getByRole('button', { name: 'Confirm Registration' }),
    ).toBeEnabled()
  })

  it('deferred-pay mode disables CTA and shows notice', () => {
    render(
      <BookingSummaryScreen
        {...baseProps}
        mode="deferred_pay"
        price={150}
        serviceFee={5}
        deferredNotice="Payment will open soon"
      />,
    )
    expect(screen.getByText('Payment will open soon')).toBeInTheDocument()
  })
})
