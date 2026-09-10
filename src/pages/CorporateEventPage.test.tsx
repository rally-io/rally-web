import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

vi.mock('@/constants/corporateEvents')
vi.mock('./CorporateSignupPage', () => ({ default: () => <div>LEAD PAGE</div> }))
vi.mock('./CorporateRegistrationPage', () => ({
  default: ({ event }: { event: { slug: string } }) => <div>REG PAGE {event.slug}</div>,
}))

import CorporateEventPage from './CorporateEventPage'
import { getCorporateEvent } from '@/constants/corporateEvents'

function renderAt(slug: string) {
  return render(
    <MemoryRouter initialEntries={[`/join/${slug}`]}>
      <Routes>
        <Route path="/join/:slug" element={<CorporateEventPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.mocked(getCorporateEvent).mockImplementation((slug) => {
    if (slug === 'lead-co') return { mode: 'lead', slug, sheetSource: 'corporate_lead' } as any
    if (slug === 'reg-co') return { mode: 'tournament', slug, tournamentId: 't-1' } as any
    return null
  })
})

describe('CorporateEventPage', () => {
  it('renders the lead page for a lead-mode slug', () => {
    renderAt('lead-co')
    expect(screen.getByText('LEAD PAGE')).toBeInTheDocument()
  })
  it('renders the registration page for a tournament-mode slug', () => {
    renderAt('reg-co')
    expect(screen.getByText('REG PAGE reg-co')).toBeInTheDocument()
  })
  it('falls through to the lead page (which renders not-found) for an unknown slug', () => {
    renderAt('nope')
    expect(screen.getByText('LEAD PAGE')).toBeInTheDocument()
  })
})
