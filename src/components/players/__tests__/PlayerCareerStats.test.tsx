import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PlayerCareerStats } from '../PlayerCareerStats'

const stats = {
  matches_played: 12, matches_won: 7, matches_lost: 5, win_rate: 58,
  current_streak: 2, best_streak: 4, tournaments_played: 3, tournaments_won: 1,
}

describe('PlayerCareerStats', () => {
  it('renders the four tiles and the win/loss bar', () => {
    render(<PlayerCareerStats stats={stats} />)
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('58%')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByTestId('player-season-stats')).toBeInTheDocument()
    expect(screen.getByTestId('career-win-bar')).toHaveStyle({ width: '58.333333333333336%' })
  })

  it('omits the bar when no match was played', () => {
    render(<PlayerCareerStats stats={{ ...stats, matches_played: 0, matches_won: 0, matches_lost: 0, win_rate: 0 }} />)
    expect(screen.queryByTestId('career-win-bar')).not.toBeInTheDocument()
  })
})
