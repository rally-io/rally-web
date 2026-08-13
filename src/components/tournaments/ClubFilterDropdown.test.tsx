import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ClubFilterDropdown } from './ClubFilterDropdown'
import { getTournamentFilterOptions } from '@/services/api/tournaments'

vi.mock('@/services/api/tournaments')

function renderDropdown(selected: string[] = [], onApply = vi.fn()) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={qc}>
      <ClubFilterDropdown selected={selected} onApply={onApply} />
    </QueryClientProvider>,
  )
  return { onApply }
}

describe('ClubFilterDropdown', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // This is a club picker, so Apply counts CLUBS. The per-club numbers in the
  // list are tournament counts, which is exactly why a tournament total on the
  // button was confusing. The counts below (4 and 3) are deliberately different
  // from the club counts (1 and 2) so a regression to summing tournaments fails
  // here rather than passing by coincidence.
  it('counts clubs on Apply, and drops the number entirely when nothing is selected', async () => {
    vi.mocked(getTournamentFilterOptions).mockResolvedValue({
      success: true,
      data: {
        clubs: [
          { id: 'club-1', name: 'Padel Time', count: 4 },
          { id: 'club-2', name: 'Smash Club', count: 3 },
        ],
      },
    } as never)
    renderDropdown([])

    await userEvent.click(screen.getByRole('button', { name: /Clubs/i }))
    await waitFor(() => expect(screen.getByText('Padel Time')).toBeInTheDocument())

    // Nothing selected applies as "no filter", so there is no honest number.
    expect(screen.getByRole('button', { name: 'Show' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('checkbox', { name: /Padel Time/i }))
    expect(screen.getByRole('button', { name: 'Show 1 club' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('checkbox', { name: /Smash Club/i }))
    expect(screen.getByRole('button', { name: 'Show 2 clubs' })).toBeInTheDocument()

    // The old behaviour, in both its forms.
    expect(screen.queryByRole('button', { name: /tournaments/i })).not.toBeInTheDocument()
  })

  // Fix 2: a failed filter-options fetch must not take the Clear/Apply
  // footer down with it — a shared `/tournaments?clubs=<id>` link needs to
  // stay clearable even while the endpoint 404s/errors.
  it('shows Retry on a failed fetch but keeps the Clear/Apply footer', async () => {
    vi.mocked(getTournamentFilterOptions).mockRejectedValue(new Error('network error'))
    renderDropdown([])

    await userEvent.click(screen.getByRole('button', { name: /Clubs/i }))

    expect(await screen.findByRole('button', { name: 'Retry' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Clear' })).toBeInTheDocument()
    // Options never loaded, so the count is unknowable — the bare label, not
    // a claimed number, must be what renders.
    expect(screen.getByRole('button', { name: 'Show' })).toBeInTheDocument()
  })

  // Search wiring: the counts query key must include the search term. Without
  // it, typing a new term into the page's search box would serve up to 60s
  // (staleTime) of stale counts from the cache instead of refetching — the
  // exact dead-end the counts↔list invariant forbids.
  it('refetches counts when the search prop changes, not serving cached counts', async () => {
    vi.mocked(getTournamentFilterOptions).mockImplementation(async (search = '') => ({
      success: true,
      data: {
        clubs:
          search === 'tel'
            ? [{ id: 'club-1', name: 'Padel Time', count: 1 }]
            : [{ id: 'club-1', name: 'Padel Time', count: 4 }],
      },
    } as never))

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const onApply = vi.fn()
    const { rerender } = render(
      <QueryClientProvider client={qc}>
        <ClubFilterDropdown selected={[]} onApply={onApply} search="" />
      </QueryClientProvider>,
    )

    await userEvent.click(screen.getByRole('button', { name: /Clubs/i }))
    await waitFor(() => expect(getTournamentFilterOptions).toHaveBeenCalledWith(''))

    rerender(
      <QueryClientProvider client={qc}>
        <ClubFilterDropdown selected={[]} onApply={onApply} search="tel" />
      </QueryClientProvider>,
    )

    await waitFor(() => expect(getTournamentFilterOptions).toHaveBeenCalledWith('tel'))
    expect(getTournamentFilterOptions).toHaveBeenCalledTimes(2)
  })
})
