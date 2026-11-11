import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

vi.mock('@/features/corporateDynamic/api', async (orig) => ({
  ...(await orig<typeof import('@/features/corporateDynamic/api')>()),
  fetchRoster: vi.fn(),
}))
vi.mock('@/features/corporateDynamic/csv', async (orig) => ({
  ...(await orig<typeof import('@/features/corporateDynamic/csv')>()),
  downloadCsv: vi.fn(),
}))

import CorporateRosterPage from './CorporateRosterPage'
import { fetchRoster } from '@/features/corporateDynamic/api'
import { downloadCsv } from '@/features/corporateDynamic/csv'
import type { PublicRoster } from '@/features/corporateDynamic/types'

const ROSTER: PublicRoster = {
  customer_name: 'Acme', event_name: 'Acme Padel Day', generated_at: '2026-11-05T10:00:00Z',
  questions: [{ id: 'q_aaaaaa11', label: 'Department', type: 'text', required: false, options: [], per_participant: false, archived: false }],
  rows: [
    { category: 'Open', status: 'confirmed', first_name: 'Dana', last_name: 'Levi', phone: '(+972) 501234567', email: 'd@acme.com', skill_level: 3.5, partner_name: 'Omer', answers: { q_aaaaaa11: 'Sales' }, has_documents: true, registered_at: '2026-11-05T09:00:00Z' },
    { category: 'Open', status: 'waitlisted', first_name: 'Omer', last_name: '', phone: '(+972) 521112222', email: null, skill_level: null, partner_name: null, answers: {}, has_documents: false, registered_at: '2026-11-05T09:30:00Z' },
  ],
}

function renderAt(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes><Route path="/join/:slug/roster/:token" element={<CorporateRosterPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => { vi.mocked(fetchRoster).mockReset(); vi.mocked(downloadCsv).mockReset() })
afterEach(() => { document.head.querySelectorAll('meta[name="robots"]').forEach((m) => m.remove()) })

describe('CorporateRosterPage', () => {
  it('reads the roster by the token in the path and renders a read-only table, noindex', async () => {
    vi.mocked(fetchRoster).mockResolvedValue(ROSTER)
    renderAt('/join/acme-day/roster/secret-token')
    expect(await screen.findByRole('table')).toBeInTheDocument()
    expect(fetchRoster).toHaveBeenCalledWith('secret-token')
    expect(screen.getByText('Dana Levi')).toBeInTheDocument()
    expect(screen.getByText('(+972) 501234567')).toBeInTheDocument()
    expect(screen.getByText('Sales')).toBeInTheDocument()
    expect(screen.getByText('Waiting list')).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(document.querySelector('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow')
  })

  it('downloads a CSV client-side', async () => {
    const user = userEvent.setup()
    vi.mocked(fetchRoster).mockResolvedValue(ROSTER)
    renderAt('/join/acme-day/roster/t')
    await user.click(await screen.findByRole('button', { name: 'Download CSV' }))
    expect(downloadCsv).toHaveBeenCalledTimes(1)
    const [filename, csv] = vi.mocked(downloadCsv).mock.calls[0]
    expect(filename).toBe('Acme-Padel-Day-roster.csv')
    expect(csv.charCodeAt(0)).toBe(0xfeff)
    expect(csv).toContain('Dana')
  })

  it('shows a not-found card for a rotated or unknown token', async () => {
    vi.mocked(fetchRoster).mockRejectedValue({ status: 404, code: 'NOT_FOUND', message: '' })
    renderAt('/join/acme-day/roster/old')
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Link not found'))
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
})
