import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import i18n from '@/i18n'
import ClubDetailPage from './ClubDetailPage'
import type { Club, Tournament, ClubEvent } from '@/types/api'
import * as clubsApi from '@/services/api/clubs'
import * as tournamentsApi from '@/services/api/tournaments'
import * as eventsApi from '@/services/api/events'

const club: Club = {
  id: 'c1', name: 'Padel Time', city: 'Ramat Gan', address_line1: 'HaRokmim 26',
  image_url: null, thumb_url: null, distance_km: null, starts_from: 120,
  has_availability: true, court_types: ['indoor'], amenities: ['parking'],
  description: 'A great club', booking_ahead_limit: 14, setup_complete: true,
  available_slots: [],
}

const tournament: Tournament = {
  id: 't1', name: 'Rally Open', format: 'doubles',
  start_date: '2999-06-01', end_date: '2999-06-02',
  registration_deadline: '2999-05-25',
  skill_level_min: 2.5, skill_level_max: 3.8, skill_level: '2.5 - 3.8 (C2)',
  entry_fee: 150, image_url: null, thumb_url: null, structure: 'single_elimination',
  club_name: 'Padel Time', registration_id: null, registration_status: null,
  available_seats: 4,
}

const event: ClubEvent = {
  id: 'e1', club_id: 'c1', club_name: 'Padel Time', type: 'class',
  name: 'Technique Class', coach_name: 'Danny',
  start_at: '2999-06-01T19:00:00Z', end_at: '2999-06-01T20:30:00Z',
  price: 80, seats_left: 3, max_participants: 8,
  skill_level_min: 2, skill_level_max: 3,
  image_url: null, thumb_url: null, joined: false, participants_preview: [],
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/clubs/c1']}>
        <Routes>
          <Route path="/clubs/:id" element={<ClubDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ClubDetailPage', () => {
  beforeEach(() => {
    vi.spyOn(clubsApi, 'getClub').mockResolvedValue({ success: true, data: club, meta: null, error: null })
    vi.spyOn(tournamentsApi, 'getTournaments').mockResolvedValue({
      success: true, data: { items: [], next_cursor: null }, meta: null, error: null,
    })
    vi.spyOn(eventsApi, 'getEvents').mockResolvedValue({
      success: true, data: { items: [], count: 0 }, meta: null, error: null,
    })
  })

  it('renders the club name and about, and hides empty sections', async () => {
    renderPage()
    expect(await screen.findByRole('heading', { name: 'Padel Time' })).toBeInTheDocument()
    expect(screen.getByText('A great club')).toBeInTheDocument()
    expect(screen.queryByText(i18n.t('clubs.sectionTournaments'))).toBeNull()
    expect(screen.queryByText(i18n.t('clubs.sectionEvents'))).toBeNull()
    expect(await screen.findByText(i18n.t('clubs.noActivitiesTitle'))).toBeInTheDocument()
    expect(screen.getByText(i18n.t('clubs.noActivitiesBody'))).toBeInTheDocument()
  })

  it('renders the tournaments/events sections and the info card when data exists', async () => {
    vi.spyOn(tournamentsApi, 'getTournaments').mockResolvedValue({
      success: true, data: { items: [tournament], next_cursor: null }, meta: null, error: null,
    })
    vi.spyOn(eventsApi, 'getEvents').mockResolvedValue({
      success: true, data: { items: [event], count: 1 }, meta: null, error: null,
    })

    renderPage()

    expect(await screen.findByText(i18n.t('clubs.sectionTournaments'))).toBeInTheDocument()
    expect(await screen.findByText(i18n.t('clubs.sectionEvents'))).toBeInTheDocument()
    expect(screen.queryByText(i18n.t('clubs.noActivitiesTitle'))).toBeNull()
    // ClubInfoCard is rendered twice (mobile-inline + desktop sidebar), both
    // present in the DOM regardless of the lg:hidden/hidden lg:block classes
    // jsdom doesn't evaluate — assert at least one is present.
    expect(screen.getAllByText(i18n.t('clubs.infoTitle')).length).toBeGreaterThan(0)
  })

  it('caps the sections at one row: 3 events and 2 tournaments', async () => {
    const tournaments = Array.from({ length: 3 }, (_, i) => ({
      ...tournament, id: `t${i + 1}`, name: `Tournament ${i + 1}`,
    }))
    const events = Array.from({ length: 4 }, (_, i) => ({
      ...event, id: `e${i + 1}`, name: `Event ${i + 1}`,
    }))
    vi.spyOn(tournamentsApi, 'getTournaments').mockResolvedValue({
      success: true, data: { items: tournaments, next_cursor: null }, meta: null, error: null,
    })
    vi.spyOn(eventsApi, 'getEvents').mockResolvedValue({
      success: true, data: { items: events, count: events.length }, meta: null, error: null,
    })

    renderPage()

    expect(await screen.findByText('Tournament 1')).toBeInTheDocument()
    expect(screen.getByText('Tournament 2')).toBeInTheDocument()
    expect(screen.queryByText('Tournament 3')).toBeNull()
    expect(await screen.findByText('Event 1')).toBeInTheDocument()
    expect(screen.getByText('Event 2')).toBeInTheDocument()
    expect(screen.getByText('Event 3')).toBeInTheDocument()
    expect(screen.queryByText('Event 4')).toBeNull()
  })
})
