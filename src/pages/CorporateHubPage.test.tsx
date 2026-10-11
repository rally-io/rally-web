import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { CorporateHubEvent } from '@/constants/corporateEvents'

// Keyed by tournament id; a missing key is a fetch that has not (or never) resolved.
const tournaments = vi.hoisted(() => ({ byId: {} as Record<string, unknown> }))
vi.mock('@/hooks/useTournament', () => ({
  useTournament: (id: string) => ({ data: tournaments.byId[id] }),
}))

import CorporateHubPage from './CorporateHubPage'
import { getCorporateEvent } from '@/constants/corporateEvents'

const hub = () => getCorporateEvent('holon-israel-open-2026') as CorporateHubEvent

const ID = {
  d2d1: '58eb2668-3a66-486b-94f8-8eabdd8d731a',
  d1c2: '6956aa01-973b-4eda-aa1d-0e4de3200047',
  c2c1: '50bd8fd1-14f6-4c25-9e26-f9e5ee707a02',
  c1b2: '0f1e1128-8d9c-4120-b64d-2f0b8e699542',
  b2a: 'fe183995-5e56-4ef2-85d0-c857cfdee42c',
}

const open = (confirmed: number, cap: number, extra: Record<string, unknown> = {}) => ({
  confirmed_registrations: confirmed, max_participants: cap, format: 'doubles', status: 'registration_open',
  registration_deadline: '2999-01-01T00:00:00Z', ...extra,
})

function renderHub() {
  return render(
    <MemoryRouter>
      <CorporateHubPage event={hub()} />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  tournaments.byId = {
    [ID.d2d1]: open(12, 16, { is_full: false }),
    [ID.d1c2]: open(32, 32, { is_full: true }),
    [ID.c2c1]: open(32, 32, { is_full: true }),
    [ID.c1b2]: open(13, 16, { is_full: false }),
    [ID.b2a]: open(12, 16, { is_full: false }),
  }
})

describe('CorporateHubPage', () => {
  it('says general registration is over and sends the pair to the tournament for its level and day', () => {
    renderHub()
    const notice = screen.getByTestId('hub-notice')
    expect(within(notice).getByText('General registration is over')).toBeInTheDocument()
    expect(within(notice).getByText(/relevant tournament by your skill level and preferred day/i)).toBeInTheDocument()
  })

  it('links every category to its own registration page, lowest level first', () => {
    renderHub()
    const links = screen.getAllByRole('link').filter((a) => a.getAttribute('href')?.startsWith('/join/'))
    expect(links.map((a) => a.getAttribute('href'))).toEqual(hub().categories.map((slug) => `/join/${slug}`))
    expect(links).toHaveLength(5)
  })

  it('shows registered / capacity per category', () => {
    renderHub()
    const card = screen.getByTestId('hub-category-holon-israel-open-2026-d2-d1')
    expect(within(card).getByText('12')).toBeInTheDocument()
    expect(within(card).getByText('16')).toBeInTheDocument()
    expect(within(card).getByText('pairs registered')).toBeInTheDocument()
  })

  it('badges exactly the full categories as a waiting list, with the way to join it, and keeps their link', () => {
    renderHub()
    expect(screen.getAllByTestId('hub-waitlist')).toHaveLength(2)
    // Registration is open and the waiting list is on, so nothing here is "sold out".
    expect(screen.queryByTestId('hub-sold-out')).not.toBeInTheDocument()
    for (const slug of ['holon-israel-open-2026-d1-c2', 'holon-israel-open-2026-c2-c1']) {
      const card = screen.getByTestId(`hub-category-${slug}`)
      expect(within(card).getByTestId('hub-waitlist')).toHaveTextContent('Waiting List')
      expect(within(card).getByText('Join Waiting List')).toBeInTheDocument()
      expect(card).toHaveAttribute('href', `/join/${slug}`)
    }
    const openCard = screen.getByTestId('hub-category-holon-israel-open-2026-d2-d1')
    expect(within(openCard).queryByTestId('hub-waitlist')).not.toBeInTheDocument()
    expect(within(openCard).getByText('Register')).toBeInTheDocument()
  })

  it('says sold out only when a full category cannot take a waiting-list entry', () => {
    // The global switch is off: the API would answer a join with a 409.
    tournaments.byId[ID.d1c2] = open(32, 32, { is_full: true, waitlist_enabled: false })
    // Full and registration already closed: the queue is closed with it.
    tournaments.byId[ID.c2c1] = open(32, 32, { is_full: true, registration_deadline: '2000-01-01T00:00:00Z' })
    renderHub()
    expect(screen.queryByTestId('hub-waitlist')).not.toBeInTheDocument()
    for (const slug of ['holon-israel-open-2026-d1-c2', 'holon-israel-open-2026-c2-c1']) {
      const card = screen.getByTestId(`hub-category-${slug}`)
      expect(within(card).getByTestId('hub-sold-out')).toBeInTheDocument()
      expect(within(card).getByText('Details')).toBeInTheDocument()
    }
  })

  it('falls back to the count when the API predates is_full', () => {
    tournaments.byId[ID.b2a] = open(16, 16) // no is_full field
    renderHub()
    const card = screen.getByTestId('hub-category-holon-israel-open-2026-b2-a')
    expect(within(card).getByTestId('hub-waitlist')).toBeInTheDocument()
  })

  it('trusts is_full over the count, as the category\'s own page does', () => {
    tournaments.byId[ID.b2a] = open(16, 16, { is_full: false })
    renderHub()
    const card = screen.getByTestId('hub-category-holon-israel-open-2026-b2-a')
    expect(within(card).queryByTestId('hub-waitlist')).not.toBeInTheDocument()
    expect(within(card).queryByTestId('hub-sold-out')).not.toBeInTheDocument()
  })

  it('still links every category when no tournament has loaded', () => {
    tournaments.byId = {}
    renderHub()
    expect(screen.queryByTestId('hub-sold-out')).not.toBeInTheDocument()
    expect(screen.queryByTestId('hub-waitlist')).not.toBeInTheDocument()
    expect(screen.queryByText('pairs registered')).not.toBeInTheDocument()
    const links = screen.getAllByRole('link').filter((a) => a.getAttribute('href')?.startsWith('/join/'))
    expect(links).toHaveLength(5)
  })

  it('marks a category whose registration has ended as closed, not sold out', () => {
    tournaments.byId[ID.c1b2] = open(13, 16, { is_full: false, registration_deadline: '2000-01-01T00:00:00Z' })
    renderHub()
    const card = screen.getByTestId('hub-category-holon-israel-open-2026-c1-b2')
    expect(within(card).getByTestId('hub-closed')).toBeInTheDocument()
    expect(within(card).queryByTestId('hub-sold-out')).not.toBeInTheDocument()
    expect(within(card).queryByTestId('hub-waitlist')).not.toBeInTheDocument()
  })
})
