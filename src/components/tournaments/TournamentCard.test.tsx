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
  // Inside the last-spots band on purpose: the past/live tests below assert
  // the badge is *suppressed*, which proves nothing if it would never show.
  available_seats: 2,
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
  const running = { start_date: hours(-1), end_date: hours(3) }

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
})

describe('TournamentCard last-spots badge', () => {
  const label = () => i18n.t('tournament.tournamentsLastSpots')

  it('shows inside the honest band', () => {
    renderCard({ available_seats: 2 })
    expect(screen.getByText(label())).toBeInTheDocument()
  })

  it('stays hidden with room left — it used to badge every open tournament', () => {
    renderCard({ available_seats: 4 })
    expect(screen.queryByText(label())).not.toBeInTheDocument()
  })

  it('stays hidden when the tournament is full: that is full, not nearly full', () => {
    renderCard({ available_seats: 0 })
    expect(screen.queryByText(label())).not.toBeInTheDocument()
  })
})

describe('TournamentCard registration count', () => {
  it('shows how full and how big, so the card conveys the size of the draw', () => {
    renderCard({ confirmed_registrations: 12, max_participants: 16 })
    expect(screen.getByText('pairs registered')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('16')).toBeInTheDocument()
  })

  it('isolates the number pair against RTL, which would mirror 12/16 into 16/12', () => {
    // The site runs dir="rtl" in Hebrew, where two digit runs around a neutral
    // "/" reorder — silently turning a half-full draw into an over-full one.
    // The cure is the ltr wrapper with the numbers as separate children; this
    // asserts the wrapper exists rather than the (bidi-free) jsdom output.
    // See wiki/gotchas/web-rtl-score-string-mirroring.
    const { container } = renderCard({ confirmed_registrations: 12, max_participants: 16 })
    const isolated = container.querySelector('[dir="ltr"].tabular-nums')
    expect(isolated).not.toBeNull()
    expect(isolated!.textContent).toBe('12/16')
    expect(isolated!.querySelectorAll('span')).toHaveLength(2)
  })

  it('counts players, not pairs, for a singles draw', () => {
    renderCard({ format: 'singles', confirmed_registrations: 12, max_participants: 16 })
    expect(screen.getByText('players registered')).toBeInTheDocument()
  })

  it('shows an empty draw as 0 of its size rather than hiding it', () => {
    // The earlier design stayed silent below half full; a player then had no
    // way to tell a 16-pair evening from a 32-pair weekend.
    renderCard({ confirmed_registrations: 0, max_participants: 32 })
    expect(screen.getByText('pairs registered')).toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument()
    expect(screen.getByText('32')).toBeInTheDocument()
  })

  it('shows a full draw', () => {
    renderCard({ confirmed_registrations: 16, max_participants: 16 })
    const isolated = document.querySelector('[dir="ltr"].tabular-nums')
    expect(isolated!.textContent).toBe('16/16')
  })

  it('says nothing on an API build that omits the count', () => {
    renderCard({})
    expect(screen.queryByText(/registered/)).not.toBeInTheDocument()
  })

  it('says nothing without a cap to size the draw against', () => {
    renderCard({ confirmed_registrations: 9, max_participants: 0 })
    expect(screen.queryByText(/registered/)).not.toBeInTheDocument()
  })

  it('never shows the seat count itself — the no-scarcity rule', () => {
    renderCard({ confirmed_registrations: 15, max_participants: 16, available_seats: 1 })
    expect(screen.getByText('pairs registered')).toBeInTheDocument()
    // The badge may shout "last spots", but how many seats remain stays private.
    expect(screen.queryByText(/1 (spot|seat)/i)).not.toBeInTheDocument()
  })

  it('is suppressed on a finished tournament', () => {
    render(
      <MemoryRouter>
        <TournamentCard
          tournament={{ ...base, confirmed_registrations: 15, max_participants: 16 }}
          variant="past"
        />
      </MemoryRouter>,
    )
    expect(screen.queryByText(/registered/)).not.toBeInTheDocument()
  })
})
