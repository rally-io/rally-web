import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useSearchParams } from 'react-router-dom'
import { I18nextProvider } from 'react-i18next'
import i18n from '@/i18n'
import PaymentReturnPage from './PaymentReturnPage'
import { pendingPayment } from '@/hooks/usePendingPayment'

function ConfirmingProbe() {
  const [sp] = useSearchParams()
  return (
    <>
      <div>CONFIRMING</div>
      <div data-testid="route-probe">{sp.toString()}</div>
    </>
  )
}

function renderAt(search: string) {
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter initialEntries={[`/payments/return${search}`]}>
        <Routes>
          <Route path="/payments/return" element={<PaymentReturnPage />} />
          <Route path="/payments/confirming" element={<ConfirmingProbe />} />
          <Route path="/payments/failed" element={<div>FAILED</div>} />
        </Routes>
      </MemoryRouter>
    </I18nextProvider>,
  )
}

beforeEach(() => {
  sessionStorage.clear()
})

describe('PaymentReturnPage — UUID validation', () => {
  beforeAll(() => {
    i18n.changeLanguage('en')
  })

  it('routes status=success + valid UUID to /payments/confirming', async () => {
    renderAt('?status=success&type=booking&id=11111111-1111-4111-8111-111111111111')
    expect(await screen.findByText('CONFIRMING')).toBeInTheDocument()
  })

  it('routes status=success + non-UUID id to /payments/failed', async () => {
    renderAt('?status=success&type=booking&id=not-a-uuid')
    expect(await screen.findByText('FAILED')).toBeInTheDocument()
  })

  it('routes status=success + unknown type to /payments/failed', async () => {
    renderAt('?status=success&type=invalid_type&id=11111111-1111-4111-8111-111111111111')
    expect(await screen.findByText('FAILED')).toBeInTheDocument()
  })
})

describe('PaymentReturnPage — return_to', () => {
  beforeAll(() => {
    i18n.changeLanguage('en')
  })

  it('copies pendingPayment.returnTo into the confirming URL', async () => {
    pendingPayment.set({
      type: 'tournament_registration',
      entityId: '11111111-1111-1111-1111-111111111111',
      amount: 150,
      tournamentId: 't-1',
      returnTo: '/join/acme',
    })
    renderAt('?status=success&type=tournament_registration&id=11111111-1111-1111-1111-111111111111')
    expect(await screen.findByTestId('route-probe')).toHaveTextContent('return_to=%2Fjoin%2Facme')
  })
})
