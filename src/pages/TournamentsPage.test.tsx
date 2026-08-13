import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, createMemoryRouter, RouterProvider } from 'react-router-dom'
import TournamentsPage from './TournamentsPage'
import { getTournaments, getTournamentFilterOptions } from '@/services/api/tournaments'
import { useAppSession } from '@/hooks/useAppSession'

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
    await userEvent.click(screen.getByRole('button', { name: 'Show 4 tournaments' }))

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
})
