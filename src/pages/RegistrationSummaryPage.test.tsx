import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import i18n from '@/i18n'

vi.mock('@/hooks/useRegistration', () => ({ useRegistration: vi.fn() }))
vi.mock('@/hooks/useTournament', () => ({ useTournament: vi.fn() }))
vi.mock('@/services/api/tournaments', () => ({ confirmZeroPayment: vi.fn() }))

import RegistrationSummaryPage from './RegistrationSummaryPage'
import { useRegistration } from '@/hooks/useRegistration'
import { useTournament } from '@/hooks/useTournament'

const mockUseRegistration = vi.mocked(useRegistration)
const mockUseTournament = vi.mocked(useTournament)

function reg(over: Record<string, unknown> = {}) {
  return {
    data: {
      id: 'r-1',
      tournament_id: 't-1',
      status: 'registered',
      payment_status: 'pending',
      requires_approval_event: true,
      amount_to_pay: 120,
      entry_fee: 120,
      service_fee: 0,
      credits_applied: 0,
      ...over,
    },
    isLoading: false,
  } as any
}

function tournament() {
  return {
    data: {
      id: 't-1', name: 'Cup', format: 'doubles',
      start_date: '2026-06-01', end_date: '2026-06-02',
      club_name: 'Club X', image_url: null,
    },
  } as any
}

// Captures the search string when navigation lands on /payment-method.
function MethodSentinel({ onSearch }: { onSearch: (s: string) => void }) {
  const loc = useLocation()
  onSearch(loc.search)
  return <div data-testid="method-sentinel" />
}

function renderPage(search: string, onSearch: (s: string) => void = () => {}) {
  return render(
    <MemoryRouter initialEntries={[`/registration-summary${search}`]}>
      <Routes>
        <Route path="/registration-summary" element={<RegistrationSummaryPage />} />
        <Route path="/payment-method" element={<MethodSentinel onSearch={onSearch} />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockUseTournament.mockReturnValue(tournament())
})

describe('RegistrationSummaryPage — registered status (G5)', () => {
  it('offers Pay Now for a registered registration that still owes money', () => {
    mockUseRegistration.mockReturnValue(reg({ amount_to_pay: 120 }))
    renderPage('?id=t-1&registration_id=r-1&status=registered&amount_to_pay=120&entry_fee=120&service_fee=0')
    expect(screen.getByRole('button', { name: /Pay .* Now/i })).toBeInTheDocument()
  })

  it('shows the success screen for a registered registration that owes nothing', () => {
    mockUseRegistration.mockReturnValue(reg({ amount_to_pay: 0 }))
    renderPage('?id=t-1&registration_id=r-1&status=registered&amount_to_pay=0&entry_fee=0&service_fee=0')
    expect(screen.queryByRole('button', { name: /Pay .* Now/i })).toBeNull()
    expect(
      screen.getByRole('button', { name: i18n.t('tournament.tournamentReturnHome') }),
    ).toBeInTheDocument()
  })
})

describe('RegistrationSummaryPage — forwards requires_approval_event (G4)', () => {
  it('passes requires_approval_event=true to /payment-method', async () => {
    mockUseRegistration.mockReturnValue(reg({ requires_approval_event: true, amount_to_pay: 120 }))
    let captured = ''
    renderPage(
      '?id=t-1&registration_id=r-1&status=registered&amount_to_pay=120&entry_fee=120&service_fee=0',
      (s) => { captured = s },
    )
    fireEvent.click(screen.getByRole('button', { name: /Pay .* Now/i }))
    await waitFor(() => expect(screen.getByTestId('method-sentinel')).toBeInTheDocument())
    const sp = new URLSearchParams(captured)
    expect(sp.get('type')).toBe('tournament_registration')
    expect(sp.get('entity_id')).toBe('r-1')
    expect(sp.get('tournament_id')).toBe('t-1')
    expect(sp.get('requires_approval_event')).toBe('true')
  })
})
