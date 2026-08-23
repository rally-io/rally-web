import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import i18n from '@/i18n'
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
  it('payment_pending shows the complete-registration label and links to detail', () => {
    renderCard({ registration_status: 'payment_pending', registration_id: 'r-1' })
    expect(
      screen.getByText(i18n.t('tournament.tournamentsCompleteRegistration')),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Rally Open/i })).toHaveAttribute(
      'href',
      '/tournaments/t1',
    )
  })
  it('closed registration shows View', () => {
    renderCard({ registration_deadline: '2000-01-01' })
    expect(screen.getByText('View')).toBeInTheDocument()
  })
  it('registered (payment already held/complete) shows View Details, not Complete Registration', () => {
    renderCard({ registration_status: 'registered', registration_id: 'r-1' })
    expect(
      screen.getByText(i18n.t('tournament.tournamentsViewDetails')),
    ).toBeInTheDocument()
    expect(
      screen.queryByText(i18n.t('tournament.tournamentsCompleteRegistration')),
    ).not.toBeInTheDocument()
  })
  it('approved also shows View Details, not Complete Registration', () => {
    renderCard({ registration_status: 'approved', registration_id: 'r-1' })
    expect(
      screen.getByText(i18n.t('tournament.tournamentsViewDetails')),
    ).toBeInTheDocument()
    expect(
      screen.queryByText(i18n.t('tournament.tournamentsCompleteRegistration')),
    ).not.toBeInTheDocument()
  })
  it('my tab base label is View', () => {
    renderCard({}, 'my')
    expect(screen.getByText('View')).toBeInTheDocument()
  })
})

function renderPast(t: Partial<Tournament> = {}) {
  return render(
    <MemoryRouter>
      <TournamentCard tournament={{ ...base, ...t }} variant="past" />
    </MemoryRouter>,
  )
}

describe('TournamentCard past variant', () => {
  it('shows the ended badge and ghost view CTA instead of Register', () => {
    renderPast()
    expect(screen.getByText(i18n.t('clubs.endedBadge'))).toBeInTheDocument()
    expect(screen.getByText(i18n.t('clubs.viewDetails'))).toBeInTheDocument()
    expect(screen.queryByText('Register')).not.toBeInTheDocument()
  })

  it('suppresses urgency chrome (last-spots flame and countdown)', () => {
    renderPast() // base has a far-future deadline that would show both by default
    expect(
      screen.queryByText(i18n.t('tournament.tournamentsLastSpots')),
    ).not.toBeInTheDocument()
    // en value is "{{count}} days left to register" — match the stable suffix
    expect(screen.queryByText(/left to register/)).not.toBeInTheDocument()
  })

  it('still links to the tournament detail page', () => {
    renderPast()
    expect(screen.getByRole('link', { name: /Rally Open/i })).toHaveAttribute(
      'href',
      '/tournaments/t1',
    )
  })
})

describe('TournamentCard status pill', () => {
  it('shows "registered" as a success (green) pill, matching approved/confirmed — not the neutral info blue', () => {
    renderCard({ registration_status: 'registered', registration_id: 'r-1' })
    const pill = screen.getByText(i18n.t('tournament.registrationStatus_registered'))
    expect(pill.className).toContain('bg-rally-success')
  })
  it('keeps "payment_pending" as the accent (attention) color', () => {
    renderCard({ registration_status: 'payment_pending', registration_id: 'r-1' })
    const pill = screen.getByText(i18n.t('tournament.registrationStatus_payment_pending'))
    expect(pill.className).toContain('bg-rally-accent')
  })
})

describe('TournamentCard live badge', () => {
  const hours = (n: number) => new Date(Date.now() + n * 3_600_000).toISOString()
  // The badge keys off `status`, not the date window — see below.
  const running = { start_date: hours(-1), end_date: hours(3), status: 'in_progress' }

  it('flags a tournament being played right now', () => {
    renderCard(running)
    expect(screen.getByText(i18n.t('tournament.liveBadge'))).toBeInTheDocument()
  })

  it('drops the last-spots flame while live — registering is moot', () => {
    renderCard({ ...running, registration_deadline: '2999-05-25' })
    expect(
      screen.queryByText(i18n.t('tournament.tournamentsLastSpots')),
    ).not.toBeInTheDocument()
  })

  it('stays off for a scheduled tournament', () => {
    renderCard({})
    expect(screen.queryByText(i18n.t('tournament.liveBadge'))).not.toBeInTheDocument()
  })

  it('stays off in the past variant even inside the date window', () => {
    renderPast(running)
    expect(screen.queryByText(i18n.t('tournament.liveBadge'))).not.toBeInTheDocument()
  })

  it('stays off inside the date window when status is not in_progress — dates alone do not count', () => {
    renderCard({ start_date: running.start_date, end_date: running.end_date })
    expect(screen.queryByText(i18n.t('tournament.liveBadge'))).not.toBeInTheDocument()
  })

  it('flags a tournament with status in_progress even outside the date window — status alone decides', () => {
    renderCard({ status: 'in_progress' })
    expect(screen.getByText(i18n.t('tournament.liveBadge'))).toBeInTheDocument()
  })
})
