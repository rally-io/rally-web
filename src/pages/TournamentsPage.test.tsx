import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import TournamentsPage from './TournamentsPage'
import { getTournaments, getTournamentFilterOptions } from '@/services/api/tournaments'

vi.mock('@/services/api/tournaments')
vi.mock('@/hooks/useAppSession', () => ({
  useAppSession: () => ({ status: 'signed_out' }),
}))

const emptyPage = { success: true, data: { items: [], next_cursor: null } }

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

describe('TournamentsPage filters', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getTournaments).mockResolvedValue(emptyPage as never)
    vi.mocked(getTournamentFilterOptions).mockResolvedValue({
      success: true,
      data: { clubs: [{ id: 'c1', name: 'Padel Time', count: 4 }] },
    } as never)
  })

  it('bare URL queries with default sort and no club filter', async () => {
    renderPage()
    await waitFor(() => expect(getTournaments).toHaveBeenCalled())
    const params = vi.mocked(getTournaments).mock.calls[0][0]!
    expect(params.sort).toBeUndefined()
    expect(params.club_ids).toBeUndefined()
  })

  it('URL params flow into the query', async () => {
    renderPage('/tournaments?clubs=c1,c2&sort=latest')
    await waitFor(() => expect(getTournaments).toHaveBeenCalled())
    const params = vi.mocked(getTournaments).mock.calls[0][0]!
    expect(params.club_ids).toEqual(['c1', 'c2'])
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
})
