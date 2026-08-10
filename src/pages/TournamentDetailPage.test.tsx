import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import i18n from '@/i18n'

vi.mock('@/hooks/useTournament', () => ({ useTournament: vi.fn() }))
// ParticipantsSection pulls this in via a real useQuery hook, which needs a
// QueryClientProvider this test doesn't set up — null keeps it hidden and
// out of scope (it has its own test file).
vi.mock('@/hooks/useTournamentParticipants', () => ({
  useTournamentParticipants: () => ({ data: null }),
}))
// ParticipantsSection also calls useAppSession/useAuthGate directly (no
// providers mounted here). Mock a fully-onboarded session ('ready') so the
// section takes the data-gated branch above (null data ⇒ hidden) instead of
// rendering the signed-out or complete-your-profile prompt, both out of
// scope for these CTA-focused tests.
vi.mock('@/hooks/useAppSession', () => ({
  useAppSession: () => ({
    status: 'ready',
    onboardingStatus: null,
    playerProfile: null,
    refetchOnboarding: vi.fn(),
    clearSession: vi.fn(),
  }),
}))
vi.mock('@/hooks/useAuthGate', () => ({
  useAuthGate: () => ({ requireSignIn: vi.fn() }),
}))
// window.location.assign is unforgeable in jsdom — mock the helper instead;
// its own behavior is covered by the appLinks/AppDownloadModal tests.
vi.mock('@/lib/appLinks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/appLinks')>()
  return { ...actual, tryOpenInApp: vi.fn(() => false) }
})

import TournamentDetailPage from './TournamentDetailPage'
import { useTournament } from '@/hooks/useTournament'
import { tryOpenInApp } from '@/lib/appLinks'

const mockTryOpenInApp = vi.mocked(tryOpenInApp)

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
  mockTryOpenInApp.mockReturnValue(false)
})

afterEach(() => {
  vi.restoreAllMocks()
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

  it('on mobile the CTA opens the tournament deep link directly, no modal', () => {
    mockTryOpenInApp.mockReturnValue(true) // helper navigated (mobile device)
    mockUseTournament.mockReturnValue(tr())
    renderPage()
    fireEvent.click(
      screen.getByRole('button', { name: i18n.t('appDownload.cta_register') }),
    )
    expect(mockTryOpenInApp).toHaveBeenCalledWith('/tournaments/t-1')
    expect(screen.queryByText(i18n.t('appDownload.title_register'))).toBeNull()
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

/** A tournament that is being played right now, with a live-results token. */
function liveTr(over: Record<string, unknown> = {}) {
  const hours = (n: number) => new Date(Date.now() + n * 3_600_000).toISOString()
  return tr({
    start_date: hours(-1),
    end_date: hours(3),
    registration_deadline: hours(-48),
    share_token: 'abc123',
    status: 'in_progress',
    ...over,
  })
}

describe('TournamentDetailPage live results', () => {
  it('links to the live screen in a new tab while the tournament runs', () => {
    mockUseTournament.mockReturnValue(liveTr())
    renderPage()
    const link = screen.getByTestId('live-results-link')
    expect(link).toHaveAttribute('href', '/live/abc123')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
    expect(screen.getAllByText(i18n.t('tournament.liveBadge')).length).toBeGreaterThan(0)
  })

  it('replaces the dead registration-closed button with the live CTA', () => {
    mockUseTournament.mockReturnValue(liveTr())
    renderPage()
    expect(screen.getByTestId('live-results-sticky-link')).toHaveAttribute(
      'href',
      '/live/abc123',
    )
    expect(
      screen.queryByText(i18n.t('tournament.tournamentDetailRegistrationClosed')),
    ).toBeNull()
  })

  it('shows no live link when the tournament has no share token', () => {
    mockUseTournament.mockReturnValue(liveTr({ share_token: null }))
    renderPage()
    expect(screen.queryByTestId('live-results-link')).toBeNull()
    expect(screen.queryByTestId('live-results-sticky-link')).toBeNull()
    // Still flagged as live — only the link is missing.
    expect(screen.getAllByText(i18n.t('tournament.liveBadge')).length).toBeGreaterThan(0)
  })

  it('does not go live for a tournament that has not started', () => {
    mockUseTournament.mockReturnValue(tr({ share_token: 'abc123' }))
    renderPage()
    expect(screen.queryByTestId('live-results-link')).toBeNull()
    expect(screen.queryByText(i18n.t('tournament.liveBadge'))).toBeNull()
  })

  it('leaves a pending payment CTA alone', () => {
    mockUseTournament.mockReturnValue(
      liveTr({
        my_registration: { id: 'r-1', status: 'payment_pending', payment_status: 'pending' },
      }),
    )
    renderPage()
    expect(
      screen.getByRole('button', { name: i18n.t('appDownload.cta_pay') }),
    ).toBeInTheDocument()
    expect(screen.queryByTestId('live-results-sticky-link')).toBeNull()
    // The in-page call-out still offers the scoreboard.
    expect(screen.getByTestId('live-results-link')).toBeInTheDocument()
  })
})
