import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import i18n from '@/i18n'

vi.mock('@/hooks/useRegistration', () => ({ useRegistration: vi.fn() }))
vi.mock('@/hooks/useTournament', () => ({ useTournament: vi.fn() }))

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

function renderPage(search: string) {
  return render(
    <MemoryRouter initialEntries={[`/registration-summary${search}`]}>
      <Routes>
        <Route path="/registration-summary" element={<RegistrationSummaryPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockUseTournament.mockReturnValue(tournament())
})

describe('RegistrationSummaryPage — pending payment routes to the app', () => {
  it('shows the complete-in-app CTA for a registration that owes money', () => {
    mockUseRegistration.mockReturnValue(reg({ amount_to_pay: 120 }))
    renderPage('?id=t-1&registration_id=r-1&status=registered&amount_to_pay=120&entry_fee=120&service_fee=0')
    expect(
      screen.getByRole('button', { name: i18n.t('appDownload.cta_pay') }),
    ).toBeInTheDocument()
  })

  it('opens the app-download modal on click instead of navigating', () => {
    mockUseRegistration.mockReturnValue(reg({ amount_to_pay: 120 }))
    renderPage('?id=t-1&registration_id=r-1&status=registered&amount_to_pay=120&entry_fee=120&service_fee=0')
    fireEvent.click(screen.getByRole('button', { name: i18n.t('appDownload.cta_pay') }))
    expect(screen.getByText(i18n.t('appDownload.title_pay'))).toBeInTheDocument()
  })

  it('shows the success screen for a registration that owes nothing', () => {
    mockUseRegistration.mockReturnValue(reg({ amount_to_pay: 0 }))
    renderPage('?id=t-1&registration_id=r-1&status=registered&amount_to_pay=0&entry_fee=0&service_fee=0')
    expect(
      screen.queryByRole('button', { name: i18n.t('appDownload.cta_pay') }),
    ).toBeNull()
    expect(
      screen.getByRole('button', { name: i18n.t('tournament.tournamentReturnHome') }),
    ).toBeInTheDocument()
  })
})
