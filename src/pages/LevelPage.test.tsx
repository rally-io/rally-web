import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import LevelPage from './LevelPage'

// The page and the in-app sheet used to hand-copy the six explainer blocks, with a test here
// asserting the copies were equal. They now import one list from `explainerBlocks.ts`, so the
// spec's "the page and the sheet must never disagree" holds by construction and the parity
// assertion is gone with the duplicate.
describe('LevelPage', () => {
  it('shows the Verified level section: a three-state legend and the six explainer blocks', () => {
    render(
      <MemoryRouter>
        <LevelPage />
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { level: 2, name: 'Verified level' })).toBeInTheDocument()
    const chips = screen.getAllByTestId('level-chip')
    expect(chips.map((c) => c.getAttribute('data-state'))).toEqual(['verified', 'unverified', 'none'])
    expect(screen.getByText('4.25')).toBeInTheDocument()
    expect(screen.getByText('3.50')).toBeInTheDocument()
    for (const title of ['Your level', 'Level reliability', 'Verified', 'What counts', 'Keeping it', 'Tier']) {
      expect(screen.getByRole('heading', { level: 3, name: title })).toBeInTheDocument()
    }
    // 82, not 86: the notch reads VERIFIED_RELIABILITY_THRESHOLD, moved by the 2026-09-16
    // verification decision (σ_on 0.45). Pinned as a literal so a constant drift shows here.
    expect(screen.getByText(/the notch — \u206682%\u2069 —/)).toBeInTheDocument()
  })

  it('the old games→influence table is gone', () => {
    render(
      <MemoryRouter>
        <LevelPage />
      </MemoryRouter>,
    )
    expect(screen.queryByText('Matches played')).not.toBeInTheDocument()
    expect(screen.queryByText('Influence of match results')).not.toBeInTheDocument()
    expect(screen.queryByText('~71%')).not.toBeInTheDocument()
  })
})
