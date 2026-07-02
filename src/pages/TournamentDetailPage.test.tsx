import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import i18n from '@/i18n'

vi.mock('@/hooks/useTournament', () => ({ useTournament: vi.fn() }))

import TournamentDetailPage from './TournamentDetailPage'
import { useTournament } from '@/hooks/useTournament'

const mockUseTournament = vi.mocked(useTournament)

function tr(over: Record<string, unknown> = {}) {
  return {
    data: {
      id: 't-1', name: 'Rally Open', format: 'doubles',
      start_date: '2999-06-01', end_date: '2999-06-02',
      registration_deadline: '2999-05-25',
      skill_level_min: 2.5, skill_level_max: 3.8, skill_level: '2.5 - 3.8 (C2)',
      entry_fee: 150, image_url: null, thumb_url: null,
      structure: 'single_elimination', club_name: 'Padel TLV',
      description: '', prizes: [], sponsors: [],
      my_registration: null,
      ...over,
    },
    isLoading: false,
    isError: false,
  } as any
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/tournaments/t-1']}>
      <Routes>
        <Route path="/tournaments/:id" element={<TournamentDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('TournamentDetailPage CTA', () => {
  it('open registration shows the app CTA and opens the modal', () => {
    mockUseTournament.mockReturnValue(tr())
    renderPage()
    const cta = screen.getByRole('button', {
      name: i18n.t('appDownload.cta_register'),
    })
    fireEvent.click(cta)
    expect(
      screen.getByText(i18n.t('appDownload.title_register')),
    ).toBeInTheDocument()
  })

  it('pay-pending registration shows the complete-in-app CTA with pay copy', () => {
    mockUseTournament.mockReturnValue(
      tr({ my_registration: { id: 'r-1', status: 'payment_pending', payment_status: 'pending' } }),
    )
    renderPage()
    const cta = screen.getByRole('button', { name: i18n.t('appDownload.cta_pay') })
    fireEvent.click(cta)
    expect(screen.getByText(i18n.t('appDownload.title_pay'))).toBeInTheDocument()
  })

  it('closed registration shows a disabled button and no modal trigger', () => {
    mockUseTournament.mockReturnValue(tr({ registration_deadline: '2000-01-01' }))
    renderPage()
    expect(
      screen.getByRole('button', {
        name: i18n.t('tournament.tournamentDetailRegistrationClosed'),
      }),
    ).toBeDisabled()
  })

  it('paid registration shows the already-registered disabled button', () => {
    mockUseTournament.mockReturnValue(
      tr({ my_registration: { id: 'r-1', status: 'registered', payment_status: 'completed' } }),
    )
    renderPage()
    expect(
      screen.getByRole('button', {
        name: i18n.t('tournament.tournamentDetailAlreadyRegistered'),
      }),
    ).toBeDisabled()
  })
})
