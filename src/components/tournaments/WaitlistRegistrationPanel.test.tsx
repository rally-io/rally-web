import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useSearchParams } from 'react-router-dom'
import i18n from '@/i18n'

vi.mock('@/services/api/registrationEvidence', () => ({
  uploadRegistrationEvidence: vi.fn(() => Promise.resolve([])),
  listRegistrationEvidence: vi.fn(() => Promise.resolve([])),
}))

import { WaitlistRegistrationPanel } from './WaitlistRegistrationPanel'
import type { MyRegistration } from '@/types/api'

function Probe() {
  const [params] = useSearchParams()
  return <div data-testid="route-probe">{params.toString()}</div>
}

const TOURNAMENT = { id: 't-1', format: 'doubles', entry_fee: 150 }

function reg(over: Partial<MyRegistration> = {}): MyRegistration {
  return {
    id: 'r-1', tournament_id: 't-1', player_1_id: 'p-1', status: 'payment_pending',
    payment_status: null, player_2_name: 'Yossi Levi', ...over,
  }
}

function renderPanel(registration: MyRegistration, returnTo?: string) {
  return render(
    <MemoryRouter initialEntries={['/x']}>
      <Routes>
        <Route
          path="/x"
          element={
            <WaitlistRegistrationPanel
              registration={registration}
              tournament={TOURNAMENT}
              returnTo={returnTo}
              onEvidenceChanged={async () => {}}
            />
          }
        />
        <Route path="/payment-method" element={<Probe />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('WaitlistRegistrationPanel', () => {
  it('unpaid: says awaiting payment and Complete payment resumes at /payment-method', () => {
    renderPanel(reg())
    expect(screen.getByTestId('waitlist-payment-state')).toHaveTextContent(
      i18n.t('tournament.tournamentWaitlistPaymentAwaiting'),
    )
    fireEvent.click(screen.getByTestId('waitlist-complete-payment'))
    expect(screen.getByTestId('route-probe').textContent).toBe('registration_id=r-1&tournament_id=t-1&waitlist=1')
  })

  it('carries return_to through to the payment page when given one', () => {
    renderPanel(reg(), '/join/acme')
    fireEvent.click(screen.getByTestId('waitlist-complete-payment'))
    expect(screen.getByTestId('route-probe').textContent).toBe(
      'registration_id=r-1&tournament_id=t-1&waitlist=1&return_to=%2Fjoin%2Facme',
    )
  })

  it('card hold in place: says payment held and offers no payment button', () => {
    renderPanel(reg({ status: 'registered', payment_status: 'payment_held' }))
    expect(screen.getByTestId('waitlist-payment-state')).toHaveTextContent(
      i18n.t('tournament.tournamentWaitlistPaymentHeld'),
    )
    expect(screen.queryByTestId('waitlist-complete-payment')).not.toBeInTheDocument()
  })

  it('two residents: nothing to pay, no payment button, claim line shown', () => {
    renderPanel(reg({
      status: 'registered', payment_status: 'completed',
      fee_waiver_type: 'holon_resident', fee_waiver_status: 'pending',
      fee_waiver_resident_count: 2, evidence_counts: { '1': 1, '2': 1 },
    }))
    expect(screen.getByTestId('waitlist-payment-state')).toHaveTextContent(
      i18n.t('tournament.tournamentWaitlistPaymentFree'),
    )
    expect(screen.queryByTestId('waitlist-complete-payment')).not.toBeInTheDocument()
    expect(screen.getByTestId('waitlist-waiver-line')).toBeInTheDocument()
  })

  it('a pending claim with an empty document slot warns and offers the picker', () => {
    renderPanel(reg({
      fee_waiver_type: 'holon_resident', fee_waiver_status: 'pending',
      fee_waiver_resident_count: 1, evidence_counts: {},
    }))
    expect(screen.getByRole('alert')).toHaveTextContent(i18n.t('corporate.reg.evidenceMissingTitle'))
    expect(document.getElementById('registered-evidence-1')).toBeInTheDocument()
  })

  it('shows the partner on a doubles tournament and none on singles', () => {
    const { unmount } = renderPanel(reg())
    expect(screen.getByText('Yossi Levi')).toBeInTheDocument()
    unmount()
    render(
      <MemoryRouter>
        <WaitlistRegistrationPanel
          registration={reg({ player_2_name: null })}
          tournament={{ ...TOURNAMENT, format: 'singles' }}
          onEvidenceChanged={async () => {}}
        />
      </MemoryRouter>,
    )
    expect(screen.queryByText(i18n.t('tournament.tournamentPartner'), { exact: false })).not.toBeInTheDocument()
  })
})
