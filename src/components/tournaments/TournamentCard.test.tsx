import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import '@/i18n'
import { TournamentCard } from './TournamentCard'
import type { Tournament } from '@/types/api'

const base: Tournament = {
  id: 't1', name: 'Rally Open', format: 'doubles',
  start_date: '2999-06-01', end_date: '2999-06-02',
  registration_deadline: '2999-05-25',
  skill_level_min: 2.5, skill_level_max: 3.8, skill_level: '2.5 - 3.8 (C2)',
  entry_fee: 150, image_url: null, thumb_url: null, structure: 'single_elimination',
  club_name: 'Padel TLV', registration_id: null, registration_status: null,
  available_seats: 4,
}

function renderCard(t: Partial<Tournament>, tab: 'upcoming' | 'my' = 'upcoming') {
  return render(
    <MemoryRouter>
      <TournamentCard tournament={{ ...base, ...t }} tab={tab} />
    </MemoryRouter>,
  )
}

describe('TournamentCard CTA', () => {
  it('open registration shows Register', () => {
    renderCard({})
    expect(screen.getByRole('link', { name: /Rally Open/i })).toBeInTheDocument()
    expect(screen.getByText('Register')).toBeInTheDocument()
  })
  it('payment_pending shows Pay Now', () => {
    renderCard({ registration_status: 'payment_pending' })
    expect(screen.getByText('Pay Now')).toBeInTheDocument()
  })
  it('closed registration shows View', () => {
    renderCard({ registration_deadline: '2000-01-01' })
    expect(screen.getByText('View')).toBeInTheDocument()
  })
  it('my tab base label is View', () => {
    renderCard({}, 'my')
    expect(screen.getByText('View')).toBeInTheDocument()
  })
})
