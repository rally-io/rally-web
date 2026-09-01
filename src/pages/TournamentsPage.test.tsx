import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
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
        organizers: [
          { id: 'u1', slug: 'dana-cohen', name: 'Dana Cohen', avatar_url: null, count: 5 },
          { id: 'u2', slug: 'yossi-levi', name: 'Yossi Levi', avatar_url: null, count: 2 },
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

const MY_TAB = /My Tournaments|הטורנירים שלי/i

describe('TournamentsPage history tab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getTournaments).mockResolvedValue(emptyPage as never)
    vi.mocked(getTournamentFilterOptions).mockResolvedValue({
      success: true,
      data: { clubs: [], organizers: [] },
    } as never)
    vi.mocked(useAppSession).mockReturnValue({ status: 'signed_out' } as never)
  })

  it('is offered to signed-out visitors, unlike the "my tournaments" tab', async () => {
    // The `my` matcher is deliberately checked positively first: an
    // absence assertion on a label that never matches anything passes for
    // the wrong reason, and the tab copy has already changed once.
    vi.mocked(useAppSession).mockReturnValue({ status: 'ready' } as never)
    const { unmount } = renderPage()
    await waitFor(() => expect(getTournaments).toHaveBeenCalled())
    expect(screen.getByRole('button', { name: MY_TAB })).toBeInTheDocument()
    unmount()

    vi.mocked(useAppSession).mockReturnValue({ status: 'signed_out' } as never)
    renderPage()
    await waitFor(() => expect(getTournaments).toHaveBeenCalled())
    expect(
      screen.getByRole('button', { name: /Past Tournaments|טורנירים שהסתיימו/ }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: MY_TAB })).not.toBeInTheDocument()
  })

  it('queries the past scope', async () => {
    renderPage('/tournaments?tab=history')
    await waitFor(() => expect(getTournaments).toHaveBeenCalled())
    const params = vi.mocked(getTournaments).mock.calls[0][0]!
    expect(params.scope).toBe('past')
    expect(params.type).toBe('upcoming')
  })

  it('does not query the past scope from the upcoming tab', async () => {
    renderPage()
    await waitFor(() => expect(getTournaments).toHaveBeenCalled())
    for (const call of vi.mocked(getTournaments).mock.calls) {
      expect(call[0]!.scope).toBeUndefined()
    }
  })

  it('hides the sort toggle on history — the API ignores sort for the past scope', async () => {
    renderPage('/tournaments?tab=history')
    await waitFor(() => expect(getTournaments).toHaveBeenCalled())
    expect(
      screen.queryByRole('button', { name: /Soonest first|Latest first|הקרוב קודם|הרחוק קודם/ }),
    ).not.toBeInTheDocument()
  })

  it('switching to history rewrites the URL and re-queries', async () => {
    const router = renderPageWithRouter()
    await waitFor(() => expect(getTournaments).toHaveBeenCalled())
    await userEvent.click(screen.getByRole('button', { name: /Past Tournaments|טורנירים שהסתיימו/ }))
    await waitFor(() => expect(router.state.location.search).toContain('tab=history'))
    await waitFor(() => {
      const calls = vi.mocked(getTournaments).mock.calls
      expect(calls[calls.length - 1][0]!.scope).toBe('past')
    })
  })

  it('renders finished tournaments under a month heading', async () => {
    vi.mocked(getTournaments).mockResolvedValue({
      success: true,
      data: {
        items: [
          {
            id: 'past-1',
            name: 'Winter Slam',
            format: 'doubles',
            start_date: '2026-07-04T09:00:00',
            end_date: '2026-07-04T18:00:00',
            registration_deadline: '2026-07-01T00:00:00',
            skill_level_min: 3,
            skill_level_max: 3.5,
            skill_level: '3.0 - 3.5 (C1)',
            entry_fee: 400,
            image_url: null,
            thumb_url: null,
            structure: 'groups',
            club_name: 'Padel Time',
            registration_id: null,
            registration_status: null,
            available_seats: 0,
          },
        ],
        next_cursor: null,
      },
    } as never)
    renderPage('/tournaments?tab=history')
    expect(await screen.findByText('Winter Slam')).toBeInTheDocument()
    expect(screen.getByText(/July 2026/)).toBeInTheDocument()
  })
})

describe('TournamentsPage organizer, skill and month filters', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getTournaments).mockResolvedValue(emptyPage as never)
    vi.mocked(getTournamentFilterOptions).mockResolvedValue({
      success: true,
      data: {
        clubs: [{ id: CLUB_A, name: 'Padel Time', count: 4 }],
        organizers: [
          { id: 'u1', slug: 'dana-cohen', name: 'Dana Cohen', avatar_url: null, count: 5 },
        ],
      },
    } as never)
    vi.mocked(useAppSession).mockReturnValue({ status: 'signed_out' } as never)
  })

  it('sends organizer slugs to the API as manager_slugs', async () => {
    renderPage('/tournaments?organizers=dana-cohen,yossi-levi')
    await waitFor(() => expect(getTournaments).toHaveBeenCalled())
    const params = vi.mocked(getTournaments).mock.calls[0][0]!
    expect(params.manager_slugs).toEqual(['dana-cohen', 'yossi-levi'])
  })

  it('carries organizer filters into the history tab too', async () => {
    renderPage('/tournaments?tab=history&organizers=dana-cohen')
    await waitFor(() => expect(getTournaments).toHaveBeenCalled())
    const params = vi.mocked(getTournaments).mock.calls[0][0]!
    expect(params.scope).toBe('past')
    expect(params.manager_slugs).toEqual(['dana-cohen'])
  })

  it('drops a malformed organizer slug instead of forwarding it', async () => {
    renderPage('/tournaments?organizers=has%20space')
    await waitFor(() => expect(getTournaments).toHaveBeenCalled())
    expect(vi.mocked(getTournaments).mock.calls[0][0]!.manager_slugs).toBeUndefined()
  })

  it('never sends skill or month to the API — they have no server params yet', async () => {
    renderPage('/tournaments?skill=advanced&month=2026-07')
    await waitFor(() => expect(getTournaments).toHaveBeenCalled())
    const params = vi.mocked(getTournaments).mock.calls[0][0]! as Record<string, unknown>
    expect(params.skill).toBeUndefined()
    expect(params.month).toBeUndefined()
    expect(params.skill_level).toBeUndefined()
  })

  it('hides a loaded tournament that falls outside the selected skill bucket', async () => {
    vi.mocked(getTournaments).mockResolvedValue({
      success: true,
      data: {
        items: [
          {
            id: 'up-1',
            name: 'Beginners Cup',
            format: 'doubles',
            start_date: '2099-07-04T09:00:00',
            end_date: '2099-07-04T18:00:00',
            registration_deadline: '2099-07-01T00:00:00',
            skill_level_min: 1,
            skill_level_max: 2,
            skill_level: '1.0 - 2.0 (D2)',
            entry_fee: 400,
            image_url: null,
            thumb_url: null,
            structure: 'groups',
            club_name: 'Padel Time',
            registration_id: null,
            registration_status: null,
            available_seats: 4,
          },
        ],
        next_cursor: null,
      },
    } as never)

    const { unmount } = renderPage('/tournaments?skill=beginner')
    expect(await screen.findByText('Beginners Cup')).toBeInTheDocument()
    unmount()

    renderPage('/tournaments?skill=pro')
    // Wait for the *filtered* empty state before asserting absence — asserting
    // straight away would pass while the query was still in flight.
    expect(
      await screen.findByText(/No tournaments match these filters|אין טורנירים שמתאימים/),
    ).toBeInTheDocument()
    expect(screen.queryByText('Beginners Cup')).not.toBeInTheDocument()
  })

  it('the clear-all control wipes every filter param and the sort', async () => {
    const router = renderPageWithRouter(
      `/tournaments?clubs=${CLUB_A}&organizers=dana-cohen&skill=pro&month=2026-07&sort=latest`,
    )
    await waitFor(() => expect(getTournaments).toHaveBeenCalled())
    await userEvent.click(
      screen.getByRole('button', { name: /Clear all filters|ניקוי כל הסינונים/ }),
    )
    await waitFor(() => expect(router.state.location.search).toBe(''))
  })
})
