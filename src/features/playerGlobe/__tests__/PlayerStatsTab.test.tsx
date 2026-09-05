import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import * as api from '../api/playerStats'
import { PlayerStatsTab } from '../components/PlayerStatsTab'
import type { GlobeNode } from '../types'

const node: GlobeNode = {
  id: 'p1', name: 'Dana Levi', avatarUrl: null, skillLevel: 3.5, skillTier: 'silver',
  club: { id: 'c', name: 'Rally TLV', city: 'Tel Aviv' }, matches: 12, winRate: 58, since: 2024,
}
const career = {
  matches_played: 12, matches_won: 7, matches_lost: 5, win_rate: 58,
  current_streak: 2, best_streak: 4, tournaments_played: 3, tournaments_won: 1,
}
const full = {
  ...career,
  skill_history: [{ skill_level: 3.2, recorded_at: '2026-08-01T10:00:00Z' }, { skill_level: 3.5, recorded_at: '2026-08-20T10:00:00Z' }],
  top_partners: [{ player_id: 'p2', display_name: 'Omer', avatar_url: null, matches_played: 6 }],
  top_clubs: [{ club_id: 'c', name: 'Rally TLV', logo_url: null, matches_played: 9 }],
}

function renderTab(viewerId: string | null = 'me') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <PlayerStatsTab node={node} viewerId={viewerId} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('PlayerStatsTab', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(api, 'fetchSocialProfile').mockResolvedValue({ isFollowing: false })
  })

  it('shows career tiles, the chart, partners and clubs when the full stats are visible', async () => {
    vi.spyOn(api, 'fetchPublicPlayerStats').mockResolvedValue(career)
    vi.spyOn(api, 'fetchFullPlayerStats').mockResolvedValue(full)
    renderTab()
    expect(await screen.findByTestId('player-season-stats')).toBeInTheDocument()
    expect(await screen.findByTestId('skill-line')).toBeInTheDocument()
    expect(screen.getByText('Omer')).toBeInTheDocument()
    expect(screen.getByText('Rally TLV', { selector: 'span' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /full profile/i })).toHaveAttribute('href', '/ranking/player/p1')
  })

  it('omits the chart, partners and clubs when the full stats are not visible', async () => {
    vi.spyOn(api, 'fetchPublicPlayerStats').mockResolvedValue(career)
    vi.spyOn(api, 'fetchFullPlayerStats').mockRejectedValue({ status: 404, isNotFound: true })
    renderTab()
    expect(await screen.findByTestId('player-season-stats')).toBeInTheDocument()
    expect(screen.queryByTestId('skill-line')).not.toBeInTheDocument()
    expect(screen.queryByText(/top partners/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/could not/i)).not.toBeInTheDocument()
  })

  it('shows the error line with retry when the public stats fail', async () => {
    const spy = vi.spyOn(api, 'fetchPublicPlayerStats').mockRejectedValue(new Error('boom'))
    vi.spyOn(api, 'fetchFullPlayerStats').mockResolvedValue(full)
    renderTab()
    expect(await screen.findByText(/could not load/i)).toBeInTheDocument()
    spy.mockResolvedValue(career)
    screen.getByRole('button', { name: /try again/i }).click()
    expect(await screen.findByTestId('player-season-stats')).toBeInTheDocument()
  })

  it('never requests the full stats or the follow relationship when the viewer is signed out', async () => {
    vi.spyOn(api, 'fetchPublicPlayerStats').mockResolvedValue(career)
    const fullSpy = vi.spyOn(api, 'fetchFullPlayerStats')
    const socialSpy = vi.spyOn(api, 'fetchSocialProfile').mockResolvedValue({ isFollowing: false })
    renderTab(null)
    expect(await screen.findByTestId('player-season-stats')).toBeInTheDocument()
    expect(screen.queryByTestId('skill-line')).not.toBeInTheDocument()
    expect(fullSpy).not.toHaveBeenCalled()
    expect(socialSpy).not.toHaveBeenCalled()
  })
})
