import { describe, it, expect, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { I18nextProvider } from 'react-i18next'
import i18n from '@/i18n'
import PaymentReturnPage from './PaymentReturnPage'

function renderAt(search: string) {
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter initialEntries={[`/payments/return${search}`]}>
        <Routes>
          <Route path="/payments/return" element={<PaymentReturnPage />} />
          <Route path="/payments/confirming" element={<div>CONFIRMING</div>} />
          <Route path="/payments/failed" element={<div>FAILED</div>} />
        </Routes>
      </MemoryRouter>
    </I18nextProvider>,
  )
}

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
