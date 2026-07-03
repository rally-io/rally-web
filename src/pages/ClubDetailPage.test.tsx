import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import i18n from '@/i18n'

vi.mock('@/hooks/useClub', () => ({ useClub: vi.fn() }))

import ClubDetailPage from './ClubDetailPage'
import { useClub } from '@/hooks/useClub'

const mockUseClub = vi.mocked(useClub)

// TimeSlot shape consumed by ClubSlotPicker (filters on available + duration,
// renders start_time.slice(0, 5) as the button label).
const slot = {
  start_time: '10:00', end_time: '11:00',
  price: 120, service_fee: 8,
  available: true, duration: 60,
  available_courts: [{ id: 'c-1', name: 'Court 1' }],
}

function club() {
  return {
    data: {
      id: 'club-1', name: 'Padel TLV', city: 'Tel Aviv',
      address_line1: 'Herzl 1', distance_km: null,
      amenities: [], description: '', image_url: null,
      available_slots: [slot],
    },
    isLoading: false,
    isError: false,
  } as any
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/clubs/club-1']}>
      <Routes>
        <Route path="/clubs/:id" element={<ClubDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockUseClub.mockReturnValue(club())
})

describe('ClubDetailPage booking CTA', () => {
  it('selecting a slot shows the book-in-app CTA which opens the modal', () => {
    renderPage()
    fireEvent.click(screen.getByText('10:00'))
    const cta = screen.getByRole('button', { name: i18n.t('appDownload.cta_book') })
    fireEvent.click(cta)
    expect(screen.getByText(i18n.t('appDownload.title_book'))).toBeInTheDocument()
  })
})
