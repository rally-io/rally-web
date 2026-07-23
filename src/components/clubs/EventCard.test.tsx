import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import i18n from '@/i18n'
import { EventCard } from './EventCard'
import type { ClubEvent } from '@/types/api'
import * as appLinks from '@/lib/appLinks'

const base: ClubEvent = {
  id: 'e1', club_id: 'c1', club_name: 'Padel Time', type: 'class',
  name: 'Technique Class', coach_name: 'Danny',
  start_at: '2999-06-01T19:00:00Z', end_at: '2999-06-01T20:30:00Z',
  price: 80, seats_left: 3, max_participants: 8,
  skill_level_min: 2, skill_level_max: 3,
  image_url: null, thumb_url: null, joined: false, participants_preview: [],
}

function renderCard(e: Partial<ClubEvent> = {}, variant?: 'default' | 'past') {
  return render(<EventCard event={{ ...base, ...e }} variant={variant} />)
}

describe('EventCard', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('renders the name, coach and join label', () => {
    renderCard()
    expect(screen.getByText('Technique Class')).toBeInTheDocument()
    expect(screen.getByText(i18n.t('clubs.eventCoach', { name: 'Danny' }))).toBeInTheDocument()
    expect(screen.getByText(i18n.t('clubs.eventJoin'))).toBeInTheDocument()
  })

  it('clicking the card tries to open the app on the event deep link', () => {
    const spy = vi.spyOn(appLinks, 'tryOpenInApp').mockReturnValue(true)
    renderCard()
    fireEvent.click(screen.getByRole('button', { name: /Technique Class/i }))
    expect(spy).toHaveBeenCalledWith('/events/e1')
  })

  it('falls back to the app-download modal when tryOpenInApp fails', () => {
    vi.spyOn(appLinks, 'tryOpenInApp').mockReturnValue(false)
    renderCard()
    fireEvent.click(screen.getByRole('button', { name: /Technique Class/i }))
    expect(screen.getByText(i18n.t('appDownload.title_join'))).toBeInTheDocument()
  })

  it('shows "free" instead of a price for a zero-price event', () => {
    renderCard({ price: 0 })
    expect(screen.getByText(i18n.t('clubs.eventFree'))).toBeInTheDocument()
  })
})

describe('EventCard past variant', () => {
  it('shows the ended badge and the view-in-app label instead of join', () => {
    renderCard({}, 'past')
    expect(screen.getByText(i18n.t('clubs.endedBadge'))).toBeInTheDocument()
    expect(screen.getByText(i18n.t('clubs.eventViewInApp'))).toBeInTheDocument()
    expect(screen.queryByText(i18n.t('clubs.eventJoin'))).not.toBeInTheDocument()
  })

  it('still deep-links to the event in the app on click', () => {
    const spy = vi.spyOn(appLinks, 'tryOpenInApp').mockReturnValue(true)
    renderCard({}, 'past')
    fireEvent.click(screen.getByRole('button', { name: /Technique Class/i }))
    expect(spy).toHaveBeenCalledWith('/events/e1')
  })
})
