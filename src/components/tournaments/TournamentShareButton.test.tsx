import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TournamentShareButton } from './TournamentShareButton'

const mockGetShareLink = vi.fn()
vi.mock('@/services/api/tournaments', () => ({
  getTournamentShareLink: (id: string) => mockGetShareLink(id),
}))

const SHORT = 'https://link.rallypadel.app/abc123'

function renderButton() {
  return render(<TournamentShareButton tournamentId="t-1" tournamentName="Summer Open" />)
}

const originalShare = navigator.share
let writeText: ReturnType<typeof vi.fn>

beforeEach(() => {
  mockGetShareLink.mockReset()
  writeText = vi.fn().mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
  Object.defineProperty(navigator, 'share', { value: undefined, configurable: true })
})

afterEach(() => {
  Object.defineProperty(navigator, 'share', { value: originalShare, configurable: true })
})

describe('TournamentShareButton', () => {
  it('shares the manager short link through the native sheet when the browser has one', async () => {
    mockGetShareLink.mockResolvedValue({ success: true, data: { share_url: SHORT } })
    const share = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'share', { value: share, configurable: true })
    renderButton()
    // prefetched with the page: the tap reuses that request rather than starting its own
    expect(mockGetShareLink).toHaveBeenCalledWith('t-1')

    fireEvent.click(screen.getByTestId('tournament-share-button'))

    await waitFor(() => expect(share).toHaveBeenCalledTimes(1))
    expect(share.mock.calls[0][0]).toMatchObject({ title: 'Summer Open', url: SHORT })
    expect(mockGetShareLink).toHaveBeenCalledTimes(1)
  })

  it('copies the short link and confirms on the button when there is no share sheet', async () => {
    mockGetShareLink.mockResolvedValue({ success: true, data: { share_url: SHORT } })
    renderButton()
    await waitFor(() => expect(mockGetShareLink).toHaveBeenCalled())

    fireEvent.click(screen.getByTestId('tournament-share-button'))

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(SHORT))
    expect(await screen.findByRole('button', { name: 'Link copied' })).toBeTruthy()
  })

  it('falls back to the page URL when the link cannot be fetched', async () => {
    mockGetShareLink.mockRejectedValue({ code: 'NETWORK_ERROR' })
    renderButton()

    fireEvent.click(screen.getByTestId('tournament-share-button'))

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(window.location.href))
  })
})
