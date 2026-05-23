import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { I18nextProvider } from 'react-i18next'
import i18n from '@/i18n'
import PaymentFailedPage from './PaymentFailedPage'
import { pendingPayment } from '@/hooks/usePendingPayment'

function renderAt(path = '/payments/failed') {
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/payments/failed" element={<PaymentFailedPage />} />
          <Route path="/" element={<div>HOME</div>} />
        </Routes>
      </MemoryRouter>
    </I18nextProvider>,
  )
}

describe('PaymentFailedPage', () => {
  beforeEach(() => {
    sessionStorage.clear()
    pendingPayment.set({ type: 'booking', entityId: 'b-1', amount: 120 })
  })

  it('does NOT clear pendingPayment on mount (so Try Again can recover)', () => {
    renderAt()
    expect(pendingPayment.get()).not.toBeNull()
  })

  it('clears pendingPayment when Go Home is clicked', () => {
    renderAt()
    fireEvent.click(screen.getByText(i18n.t('payment.goHome')))
    expect(pendingPayment.get()).toBeNull()
  })
})
