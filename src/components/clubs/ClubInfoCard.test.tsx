import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import i18n from '@/i18n'
import { ClubInfoCard } from './ClubInfoCard'
import type { Club } from '@/types/api'

const base: Club = {
  id: 'c1', name: 'Padel Time', city: 'Ramat Gan', address_line1: 'HaRokmim 26',
  image_url: null, thumb_url: null, distance_km: null, starts_from: 120,
  has_availability: true, court_types: ['indoor'], amenities: [], description: '',
  booking_ahead_limit: 14, setup_complete: true, available_slots: [],
}

describe('ClubInfoCard', () => {
  it('hides phone/hours/website when absent', () => {
    render(<ClubInfoCard club={base} />)
    expect(screen.queryByText(i18n.t('clubs.phone'))).toBeNull()
    expect(screen.queryByText(i18n.t('clubs.hours'))).toBeNull()
    expect(screen.queryByText(i18n.t('clubs.website'))).toBeNull()
  })

  it('renders phone and a maps link from lat/lng when present', () => {
    render(
      <ClubInfoCard
        club={{ ...base, contact_number: '03-1234567', latitude: 32.07, longitude: 34.79 }}
      />,
    )
    expect(screen.getByText('03-1234567')).toBeInTheDocument()
    const maps = screen.getByRole('link', { name: i18n.t('clubs.directions') })
    expect(maps).toHaveAttribute(
      'href',
      'https://www.google.com/maps/dir/?api=1&destination=32.07%2C34.79',
    )
  })
})
