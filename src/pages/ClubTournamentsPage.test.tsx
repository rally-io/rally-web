import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import ClubTournamentsPage from './ClubTournamentsPage'
import { getTournaments } from '@/services/api/tournaments'
import { getClub } from '@/services/api/clubs'
import type { Tournament } from '@/types/api'

vi.mock('@/services/api/tournaments')
vi.mock('@/services/api/clubs')

const now = new Date()
// Explicit month construction — offset-based dates flake at month boundaries.
const future1 = new Date(now.getFullYear(), now.getMonth() + 1, 10)
const future2 = new Date(now.getFullYear(), now.getMonth() + 2, 10)
const past1 = new Date(now.getFullYear(), now.getMonth() - 1, 10)
const past2 = new Date(now.getFullYear(), now.getMonth() - 2, 10)
const monthLabel = (d: Date) =>
  d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

const tr = (id: string, name: string, start: Date): Tournament => ({
  id,
  name,
  format: 'doubles',
  start_date: start.toISOString(),
  end_date: start.toISOString(),
  registration_deadline: start.toISOString(),
  skill_level_min: 2,
  skill_level_max: 3,
  skill_level: '2 - 3',
  entry_fee: 100,
  image_url: null,
  thumb_url: null,
  structure: 'single_elimination',
  club_name: 'Kash Club',
  registration_id: null,
  registration_status: null,
  available_seats: 4,
})

const pastCalled = () =>
  vi.mocked(getTournaments).mock.calls.some(([p]) => p?.scope === 'past')

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getClub).mockResolvedValue({
    success: true,
    data: { id: 'c1', name: 'Kash Club' } as any,
    meta: null,
    error: null,
  })
  vi.mocked(getTournaments).mockImplementation(async (params = {}) => {
    if (params.scope === 'past') {
      return {
        success: true,
        data: {
          items: [tr('p1', 'Past One', past1), tr('p2', 'Past Two', past2)],
          next_cursor: null,
        },
        meta: null,
        error: null,
      }
    }
    return {
      success: true,
      data: {
        items: [tr('u2', 'Open Two', future2), tr('u1', 'Open One', future1)],
        next_cursor: null,
      },
      meta: null,
      error: null,
    }
  })
})

function renderPage(path = '/clubs/c1/tournaments') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/clubs/:id/tournaments" element={<ClubTournamentsPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ClubTournamentsPage', () => {
  it('default view shows open months ascending and never fetches past', async () => {
    renderPage()
    await screen.findByText('Open One')
    const months = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
    expect(months).toEqual([monthLabel(future1), monthLabel(future2)])
    expect(screen.queryByText('Past One')).not.toBeInTheDocument()
    expect(screen.queryByText('Earlier months')).not.toBeInTheDocument()
    expect(pastCalled()).toBe(false)
  })

  it('status=all shows future asc, divider, then past desc', async () => {
    renderPage('/clubs/c1/tournaments?status=all')
    await screen.findByText('Past One')
    const months = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
    expect(months).toEqual([
      monthLabel(future1),
      monthLabel(future2),
      monthLabel(past1),
      monthLabel(past2),
    ])
    expect(screen.getByText('Earlier months')).toBeInTheDocument()
  })

  it('status=completed hides open tournaments and applies the past card variant', async () => {
    renderPage('/clubs/c1/tournaments?status=completed')
    await screen.findByText('Past One')
    expect(screen.queryByText('Open One')).not.toBeInTheDocument()
    expect(screen.getAllByText('Ended').length).toBeGreaterThan(0)
  })

  it('clicking Completed lazily triggers the past fetch', async () => {
    renderPage()
    await screen.findByText('Open One')
    expect(pastCalled()).toBe(false)
    await userEvent.click(screen.getByRole('button', { name: 'Completed' }))
    await waitFor(() => expect(pastCalled()).toBe(true))
    await screen.findByText('Past One')
  })

  it('empty filtered view offers a reset to All', async () => {
    vi.mocked(getTournaments).mockImplementation(async (params = {}) => {
      if (params.scope === 'past')
        return {
          success: true,
          data: { items: [], next_cursor: null },
          meta: null,
          error: null,
        }
      return {
        success: true,
        data: { items: [tr('u1', 'Open One', future1)], next_cursor: null },
        meta: null,
        error: null,
      }
    })
    renderPage('/clubs/c1/tournaments?status=completed')
    await screen.findByText('No tournaments in this view.')
    await userEvent.click(screen.getByRole('button', { name: 'Show all' }))
    await screen.findByText('Open One')
  })

  it('drops mispartitioned items from both lists (old-server / stale-status safety)', async () => {
    vi.mocked(getTournaments).mockImplementation(async (params = {}) => {
      if (params.scope === 'past') {
        // An API without scope support echoes the open (future) list back.
        return {
          success: true,
          data: { items: [tr('f1', 'Future In Past', future1)], next_cursor: null },
          meta: null,
          error: null,
        }
      }
      // An ended tournament that never flipped off registration_open.
      return {
        success: true,
        data: {
          items: [tr('e1', 'Ended In Open', past1), tr('u1', 'Open One', future1)],
          next_cursor: null,
        },
        meta: null,
        error: null,
      }
    })
    renderPage('/clubs/c1/tournaments?status=all')
    await screen.findByText('Open One')
    expect(screen.queryByText('Ended In Open')).not.toBeInTheDocument()
    expect(screen.queryByText('Future In Past')).not.toBeInTheDocument()
  })

  it('renders a month present in both partitions as two sections with unique anchors', async () => {
    // The current month legitimately exists in both lists: an open tournament
    // in a minute and an ended one a minute ago. (Theoretical flake window of
    // one minute per month at the exact month rollover — acceptable.)
    const inAMinute = new Date(Date.now() + 60_000)
    const aMinuteAgo = new Date(Date.now() - 60_000)
    vi.mocked(getTournaments).mockImplementation(async (params = {}) => {
      if (params.scope === 'past') {
        return {
          success: true,
          data: { items: [tr('p1', 'Just Ended', aMinuteAgo)], next_cursor: null },
          meta: null,
          error: null,
        }
      }
      return {
        success: true,
        data: { items: [tr('u1', 'Starting Soon', inAMinute)], next_cursor: null },
        meta: null,
        error: null,
      }
    })
    const { container } = renderPage('/clubs/c1/tournaments?status=all')
    await screen.findByText('Just Ended')
    expect(screen.getByText('Starting Soon')).toBeInTheDocument()
    const ids = [...container.querySelectorAll('section[id^="m-"]')].map((s) => s.id)
    expect(ids).toHaveLength(2)
    expect(new Set(ids).size).toBe(2)
  })
})
