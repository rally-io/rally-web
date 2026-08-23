import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, createMemoryRouter, RouterProvider } from 'react-router-dom'
import TournamentsPage from './TournamentsPage'
import { getTournaments, getTournamentFilterOptions } from '@/services/api/tournaments'
import { useAppSession } from '@/hooks/useAppSession'
import type { Tournament } from '@/types/api'

vi.mock('@/services/api/tournaments')
vi.mock('@/hooks/useAppSession', () => ({ useAppSession: vi.fn() }))

const emptyPage = { success: true, data: { items: [], next_cursor: null } }

// Real UUID shapes: Fix 1 sanitizes `?clubs=` to UUID-looking ids only, so
// fixtures that round-trip through the URL (unlike filter-options' own club
// ids, which are never validated) must actually look like UUIDs.
const CLUB_A = '11111111-1111-1111-1111-111111111111'
const CLUB_B = '22222222-2222-2222-2222-222222222222'

function renderPage(url = '/tournaments') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[url]}>
        <TournamentsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

// Variant that exposes the router's live location, needed to assert the URL
// itself changed (MemoryRouter alone gives no way to read it back).
function renderPageWithRouter(url = '/tournaments') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createMemoryRouter([{ path: '/tournaments', element: <TournamentsPage /> }], {
    initialEntries: [url],
  })
  render(
    <QueryClientProvider client={qc}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}

describe('TournamentsPage filters', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getTournaments).mockResolvedValue(emptyPage as never)
    vi.mocked(getTournamentFilterOptions).mockResolvedValue({
      success: true,
      data: {
        clubs: [
          { id: CLUB_A, name: 'Padel Time', count: 4 },
          { id: CLUB_B, name: 'Smash Club', count: 3 },
        ],
      },
    } as never)
    vi.mocked(useAppSession).mockReturnValue({ status: 'signed_out' } as never)
  })

  it('bare URL queries with default sort and no club filter', async () => {
    renderPage()
    await waitFor(() => expect(getTournaments).toHaveBeenCalled())
    const params = vi.mocked(getTournaments).mock.calls[0][0]!
    expect(params.sort).toBeUndefined()
    expect(params.club_ids).toBeUndefined()
  })

  it('URL params flow into the query', async () => {
    renderPage(`/tournaments?clubs=${CLUB_A},${CLUB_B}&sort=latest`)
    await waitFor(() => expect(getTournaments).toHaveBeenCalled())
    const params = vi.mocked(getTournaments).mock.calls[0][0]!
    expect(params.club_ids).toEqual([CLUB_A, CLUB_B])
    expect(params.sort).toBe('latest')
  })

  it('unknown sort value falls back to soonest', async () => {
    renderPage('/tournaments?sort=name')
    await waitFor(() => expect(getTournaments).toHaveBeenCalled())
    expect(vi.mocked(getTournaments).mock.calls[0][0]!.sort).toBeUndefined()
  })

  it('sort toggle flips to latest and re-queries', async () => {
    renderPage()
    await waitFor(() => expect(getTournaments).toHaveBeenCalled())
    await userEvent.click(screen.getByRole('button', { name: /הקרוב קודם|Soonest first/ }))
    await waitFor(() => {
      const calls = vi.mocked(getTournaments).mock.calls
      expect(calls[calls.length - 1][0]!.sort).toBe('latest')
    })
  })

  it('my tab ignores club/sort URL params and hides the toolbar', async () => {
    vi.mocked(useAppSession).mockReturnValue({ status: 'ready' } as never)
    renderPage(`/tournaments?tab=my&clubs=${CLUB_A}&sort=latest`)
    await waitFor(() => expect(getTournaments).toHaveBeenCalled())
    const params = vi.mocked(getTournaments).mock.calls[0][0]!
    expect(params.club_ids).toBeUndefined()
    expect(params.sort).toBeUndefined()
    expect(screen.queryByRole('button', { name: /Clubs|מועדונים/ })).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /הקרוב קודם|הרחוק קודם|Soonest first|Latest first/ }),
    ).not.toBeInTheDocument()
  })

  // Fix 1: sanitize `?clubs=` at parse time — a hand-edited or stale URL must
  // degrade to "no filter" instead of shipping a bad id to the API, which
  // 422s the whole page today.
  it('drops non-UUID ?clubs= ids instead of forwarding them to the API', async () => {
    renderPage('/tournaments?clubs=not-a-uuid,also-bad')
    await waitFor(() => expect(getTournaments).toHaveBeenCalled())
    const params = vi.mocked(getTournaments).mock.calls[0][0]!
    expect(params.club_ids).toBeUndefined()
  })

  it('keeps only the UUID-shaped ids out of a mixed valid/invalid ?clubs=', async () => {
    renderPage(`/tournaments?clubs=${CLUB_A},not-a-uuid`)
    await waitFor(() => expect(getTournaments).toHaveBeenCalled())
    const params = vi.mocked(getTournaments).mock.calls[0][0]!
    expect(params.club_ids).toEqual([CLUB_A])
  })

  // Fix 1: dedupe + canonical order so ?clubs=A,B and ?clubs=B,A (or a
  // repeated id) produce one filter, not two.
  it('dedupes and canonically sorts club ids regardless of URL order', async () => {
    renderPage(`/tournaments?clubs=${CLUB_B},${CLUB_A},${CLUB_A}`)
    await waitFor(() => expect(getTournaments).toHaveBeenCalled())
    const params = vi.mocked(getTournaments).mock.calls[0][0]!
    expect(params.club_ids).toEqual([CLUB_A, CLUB_B])
  })

  // Fix 4, test 1: the seam neither the page tests nor the service tests
  // cover on their own — opening the popover, selecting a club and applying
  // must both rewrite the URL and change what the next API call carries.
  it('selecting a club in the dropdown and applying updates the URL and the next query', async () => {
    const router = renderPageWithRouter()
    await waitFor(() => expect(getTournaments).toHaveBeenCalled())

    await userEvent.click(screen.getByRole('button', { name: /Clubs/i }))
    await waitFor(() => expect(screen.getByText('Padel Time')).toBeInTheDocument())
    await userEvent.click(screen.getByRole('checkbox', { name: /Padel Time/i }))
    await userEvent.click(screen.getByRole('button', { name: 'Show 1 club' }))

    await waitFor(() => expect(router.state.location.search).toContain(`clubs=${CLUB_A}`))
    await waitFor(() => {
      const calls = vi.mocked(getTournaments).mock.calls
      const lastParams = calls[calls.length - 1][0]!
      expect(lastParams.club_ids).toEqual([CLUB_A])
    })
  })

  // Fix 6: the empty-state "clear filters" CTA must reset sort as well as
  // clubs (spec §7), not just clubs.
  it('the empty-state clear CTA resets both clubs and sort', async () => {
    vi.mocked(getTournaments).mockResolvedValue(emptyPage as never)
    const router = renderPageWithRouter(`/tournaments?clubs=${CLUB_A}&sort=latest`)
    await waitFor(() => expect(getTournaments).toHaveBeenCalled())
    await userEvent.click(await screen.findByRole('button', { name: /Clear filters|ניקוי סינון/ }))
    await waitFor(() => expect(router.state.location.search).toBe(''))
  })

  // Search wiring: the club picker's counts must respect the active search
  // term, or a club can advertise a count a search-narrowed list then yields
  // 0 results for. Type into the page's own search box (not the popover's
  // club-name filter) and confirm the term reaches filter-options once the
  // popover opens (the counts query is `enabled: open`).
  it('the search box term flows through to filter-options once the popover opens', async () => {
    renderPage()
    await waitFor(() => expect(getTournaments).toHaveBeenCalled())

    const input = screen.getByRole('textbox')
    await userEvent.type(input, 'padel')

    await userEvent.click(screen.getByRole('button', { name: /Clubs/i }))
    await waitFor(() =>
      expect(getTournamentFilterOptions).toHaveBeenCalledWith('padel'),
    )
  })

  // Search wiring, the load-bearing seam: the list call and the
  // filter-options call must agree on the exact same search string,
  // including the 100-char truncation, or the counts↔list invariant breaks.
  // Uses fireEvent.change (not userEvent.type) to set a value past the input's
  // maxLength=100 — typing would be capped by the DOM before either call ever
  // saw the untruncated string, making the truncation path unexercised.
  it('sends the identical (truncated) search term to the list and to filter-options', async () => {
    renderPage()
    await waitFor(() => expect(getTournaments).toHaveBeenCalled())

    const input = screen.getByRole('textbox')
    const longTerm = 'x'.repeat(150)
    fireEvent.change(input, { target: { value: longTerm } })

    await userEvent.click(screen.getByRole('button', { name: /Clubs/i }))
    await waitFor(() => {
      const listCalls = vi.mocked(getTournaments).mock.calls
      expect(listCalls[listCalls.length - 1][0]!.search).toBeTruthy()
    })
    await waitFor(() => {
      const optionsCalls = vi.mocked(getTournamentFilterOptions).mock.calls
      expect(optionsCalls[optionsCalls.length - 1][0]).toBeTruthy()
    })

    const listCalls = vi.mocked(getTournaments).mock.calls
    const optionsCalls = vi.mocked(getTournamentFilterOptions).mock.calls
    const listSearch = listCalls[listCalls.length - 1][0]!.search
    const optionsSearch = optionsCalls[optionsCalls.length - 1][0]

    // Compare the two calls to each other, not to a hardcoded "100" literal,
    // so this still holds if the truncation length is ever changed.
    expect(optionsSearch).toBe(listSearch)
    // And confirm truncation actually happened (proves this isn't a vacuous
    // pass from a short, untruncated string being trivially equal to itself).
    expect(listSearch!.length).toBeLessThan(longTerm.length)
  })
})

// Coherence: the list ordering must read the same live signal as the
// LiveBadge (isTournamentInProgress), or a tournament can show LIVE while
// sorting as not-live.
describe('TournamentsPage live ordering', () => {
  const baseTr: Tournament = {
    id: 't-base', name: 'Base', format: 'doubles',
    start_date: '2999-06-01', end_date: '2999-06-02',
    registration_deadline: '2999-05-25',
    skill_level_min: 2.5, skill_level_max: 3.8, skill_level: '2.5 - 3.8 (C2)',
    entry_fee: 150, image_url: null, thumb_url: null, structure: 'single_elimination',
    club_name: 'Padel TLV', registration_id: null, registration_status: null,
    available_seats: 4,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getTournamentFilterOptions).mockResolvedValue({
      success: true, data: { clubs: [] },
    } as never)
    vi.mocked(useAppSession).mockReturnValue({ status: 'signed_out' } as never)
  })

  it('bubbles an in_progress tournament with a future start date above a not-live one', async () => {
    // Phase A: a manager can start play ahead of schedule, so a future
    // start_date must not stop an in_progress tournament from being live —
    // this is exactly what the old isTournamentLive date heuristic got wrong.
    const scheduledSoon: Tournament = {
      ...baseTr, id: 't-soon', name: 'Scheduled Soon Cup',
      start_date: '2999-01-10', end_date: '2999-01-11',
    }
    const liveButFuture: Tournament = {
      ...baseTr, id: 't-future-live', name: 'Future Live Cup',
      start_date: '2999-12-01', end_date: '2999-12-02', status: 'in_progress',
    }
    // Server order (e.g. sort=soonest) puts the earlier date first.
    vi.mocked(getTournaments).mockResolvedValue({
      success: true, data: { items: [scheduledSoon, liveButFuture], next_cursor: null },
    } as never)

    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter initialEntries={['/tournaments']}>
          <TournamentsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    await waitFor(() => expect(screen.getByText('Future Live Cup')).toBeInTheDocument())
    const headings = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)
    expect(headings.indexOf('Future Live Cup')).toBeLessThan(headings.indexOf('Scheduled Soon Cup'))
  })

  it('does not bubble a tournament whose dates overlap now but is not in_progress', async () => {
    // Discriminates against reverting to the date-window heuristic: a
    // tournament "running" by dates alone must not outrank an actually
    // in_progress one that starts later.
    const now = new Date()
    const runningByDateOnly: Tournament = {
      ...baseTr, id: 't-date-only', name: 'Old Heuristic Cup',
      start_date: new Date(now.getTime() - 3_600_000).toISOString(),
      end_date: new Date(now.getTime() + 3_600_000).toISOString(),
      status: 'registration_open',
    }
    const actuallyLive: Tournament = {
      ...baseTr, id: 't-actually-live', name: 'Actually Live Cup',
      start_date: '2999-12-01', end_date: '2999-12-02', status: 'in_progress',
    }
    vi.mocked(getTournaments).mockResolvedValue({
      success: true, data: { items: [runningByDateOnly, actuallyLive], next_cursor: null },
    } as never)

    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter initialEntries={['/tournaments']}>
          <TournamentsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    await waitFor(() => expect(screen.getByText('Actually Live Cup')).toBeInTheDocument())
    const headings = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)
    expect(headings.indexOf('Actually Live Cup')).toBeLessThan(headings.indexOf('Old Heuristic Cup'))
  })
})
