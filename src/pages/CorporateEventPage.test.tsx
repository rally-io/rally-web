import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

vi.mock('@/constants/corporateEvents')
vi.mock('@/features/corporateDynamic/api', () => ({ fetchCorporateEvent: vi.fn() }))
vi.mock('./CorporateSignupPage', () => ({ default: () => <div>LEAD PAGE</div> }))
vi.mock('./CorporateRegistrationPage', () => ({
  default: ({ event }: { event: { slug: string } }) => <div>REG PAGE {event.slug}</div>,
}))
vi.mock('./CorporateHubPage', () => ({
  default: ({ event }: { event: { slug: string } }) => <div>HUB PAGE {event.slug}</div>,
}))
vi.mock('./CorporateDynamicPage', () => ({
  default: ({ event }: { event: { slug: string } }) => <div>DYNAMIC PAGE {event.slug}</div>,
}))

import CorporateEventPage from './CorporateEventPage'
import { getCorporateEvent } from '@/constants/corporateEvents'
import { fetchCorporateEvent } from '@/features/corporateDynamic/api'

function renderAt(slug: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/join/${slug}`]}>
        <Routes>
          <Route path="/join/:slug" element={<CorporateEventPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.mocked(fetchCorporateEvent).mockReset()
  // Default: the API has no such event (404 -> null), so the legacy registry decides.
  vi.mocked(fetchCorporateEvent).mockResolvedValue(null)
  vi.mocked(getCorporateEvent).mockImplementation((slug) => {
    if (slug === 'lead-co') return { mode: 'lead', slug, sheetSource: 'corporate_lead' } as any
    if (slug === 'reg-co') return { mode: 'tournament', slug, tournamentId: 't-1' } as any
    if (slug === 'hub-co') return { mode: 'hub', slug, categories: ['reg-co'] } as any
    return null
  })
})

describe('CorporateEventPage — API first, legacy registry as the fallback', () => {
  it('renders the dynamic page when the API has the event, even for a slug the registry also knows', async () => {
    vi.mocked(fetchCorporateEvent).mockResolvedValue({ slug: 'reg-co' } as any)
    renderAt('reg-co')
    expect(await screen.findByText('DYNAMIC PAGE reg-co')).toBeInTheDocument()
    expect(screen.queryByText('REG PAGE reg-co')).not.toBeInTheDocument()
    expect(fetchCorporateEvent).toHaveBeenCalledWith('reg-co')
  })

  it('shows a neutral loader while the API answers — never the not-found card', () => {
    vi.mocked(fetchCorporateEvent).mockReturnValue(new Promise(() => {}))
    renderAt('whatever')
    expect(screen.getByTestId('corporate-event-loading')).toBeInTheDocument()
    expect(screen.queryByText('LEAD PAGE')).not.toBeInTheDocument()
  })

  it('renders the lead page for a lead-mode slug on a 404', async () => {
    renderAt('lead-co')
    expect(await screen.findByText('LEAD PAGE')).toBeInTheDocument()
  })
  it('renders the registration page for a tournament-mode slug on a 404', async () => {
    renderAt('reg-co')
    expect(await screen.findByText('REG PAGE reg-co')).toBeInTheDocument()
  })
  it('renders the category hub for a hub-mode slug on a 404', async () => {
    renderAt('hub-co')
    expect(await screen.findByText('HUB PAGE hub-co')).toBeInTheDocument()
  })
  it('falls through to the lead page (which renders not-found) for a slug in neither', async () => {
    renderAt('nope')
    expect(await screen.findByText('LEAD PAGE')).toBeInTheDocument()
  })

  it('keeps a legacy link working while the API is down', async () => {
    vi.mocked(fetchCorporateEvent).mockRejectedValue(new Error('network down'))
    renderAt('reg-co')
    expect(await screen.findByText('REG PAGE reg-co')).toBeInTheDocument()
  })

  it('says the page could not load (not "not found") when the API is down and the slug is not legacy', async () => {
    vi.mocked(fetchCorporateEvent).mockRejectedValue(new Error('network down'))
    renderAt('crm-built')
    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn't load this page/i)
    expect(screen.queryByText('LEAD PAGE')).not.toBeInTheDocument()
  })
})
