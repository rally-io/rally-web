import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import ClubEventsPage from './ClubEventsPage'
import { getEvents } from '@/services/api/events'
import { getClub } from '@/services/api/clubs'
import type { ClubEvent } from '@/types/api'

vi.mock('@/services/api/events')
vi.mock('@/services/api/clubs')

const now = new Date()
const future1 = new Date(now.getFullYear(), now.getMonth() + 1, 10, 18)
const past1 = new Date(now.getFullYear(), now.getMonth() - 1, 10, 18)

const ev = (id: string, name: string, start: Date): ClubEvent => ({
  id,
  club_id: 'c1',
  club_name: 'Kash Club',
  type: 'class',
  name,
  coach_name: null,
  start_at: start.toISOString(),
  end_at: new Date(start.getTime() + 3_600_000).toISOString(),
  price: 0,
  seats_left: 5,
  max_participants: 10,
  skill_level_min: null,
  skill_level_max: null,
  image_url: null,
  thumb_url: null,
  joined: false,
  participants_preview: [],
})

const pastCalled = () =>
  vi.mocked(getEvents).mock.calls.some(([p]) => p != null && 'date_to' in p)

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getClub).mockResolvedValue({
    success: true,
    data: { id: 'c1', name: 'Kash Club' } as any,
    meta: null,
    error: null,
  })
  vi.mocked(getEvents).mockImplementation(async (params = {}) => {
    if ('date_to' in params) {
      return {
        success: true,
        data: { items: [ev('p1', 'Past Class', past1)], count: 1 },
        meta: null,
        error: null,
      }
    }
    return {
      success: true,
      data: { items: [ev('u1', 'Open Class', future1)], count: 1 },
      meta: null,
      error: null,
    }
  })
})

function renderPage(path = '/clubs/c1/events') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/clubs/:id/events" element={<ClubEventsPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ClubEventsPage', () => {
  it('default view shows upcoming events only, fetched with date_from', async () => {
    renderPage()
    await screen.findByText('Open Class')
    expect(screen.queryByText('Past Class')).not.toBeInTheDocument()
    expect(pastCalled()).toBe(false)
    const [params] = vi.mocked(getEvents).mock.calls[0]
    expect(params).toMatchObject({ club_id: 'c1' })
    expect(params && 'date_from' in params).toBe(true)
  })

  it('status=all shows both directions with the divider and past variant', async () => {
    renderPage('/clubs/c1/events?status=all')
    await screen.findByText('Past Class')
    expect(screen.getByText('Open Class')).toBeInTheDocument()
    expect(screen.getByText('Earlier months')).toBeInTheDocument()
    expect(screen.getByText('Ended')).toBeInTheDocument()
    expect(screen.getByText('View in the app')).toBeInTheDocument()
  })

  it('clicking Completed lazily fetches the past list', async () => {
    renderPage()
    await screen.findByText('Open Class')
    expect(pastCalled()).toBe(false)
    await userEvent.click(screen.getByRole('button', { name: 'Completed' }))
    await waitFor(() => expect(pastCalled()).toBe(true))
    await screen.findByText('Past Class')
  })

  it('renders an in-progress event as happening-now, not Ended', async () => {
    // The server partitions on start_at, so an event that started 30 minutes
    // ago (and ends in 30) arrives in the past (date_to) list.
    const inProgress: ClubEvent = {
      ...ev('ip1', 'Live Class', new Date(Date.now() - 30 * 60_000)),
      end_at: new Date(Date.now() + 30 * 60_000).toISOString(),
    }
    vi.mocked(getEvents).mockImplementation(async (params = {}) => {
      if ('date_to' in params) {
        return {
          success: true,
          data: { items: [inProgress], count: 1 },
          meta: null,
          error: null,
        } as any
      }
      return { success: true, data: { items: [], count: 0 }, meta: null, error: null } as any
    })
    renderPage('/clubs/c1/events?status=all')
    await screen.findByText('Live Class')
    expect(screen.queryByText('Ended')).not.toBeInTheDocument()
    expect(screen.getByText('Join in the app')).toBeInTheDocument()
  })
})
