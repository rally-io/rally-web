import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import LevelPage from './LevelPage'
import en from '@/i18n/locales/en.json'
import he from '@/i18n/locales/he.json'
import { SkillLadderContext } from '@/contexts/SkillLadderContext'
import { FALLBACK_LADDERS, type SkillLadder } from '@/lib/skillLadder'

function renderOn(ladder: SkillLadder) {
  return render(
    <SkillLadderContext.Provider value={{ ladder, refresh: () => {} }}>
      <MemoryRouter>
        <LevelPage />
      </MemoryRouter>
    </SkillLadderContext.Provider>,
  )
}

const bodyRows = () =>
  within(screen.getByRole('table')).getAllByRole('row').slice(1) as HTMLTableRowElement[]

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

describe('LevelPage — the level table is the served ladder', () => {
  it('1–7: eight rows, B1 4.0 – 4.9, A1 on top at 6.0 – 7.0', () => {
    renderOn(FALLBACK_LADDERS[7])
    const rows = bodyRows()
    expect(rows.map((r) => r.cells[0].textContent)).toEqual([
      '🟤 D2', '🟤 D1', '🟤 C2', '⚪ C1', '⚪ B2', '🟡 B1', '🟡 A2', '🟡 A1',
    ])
    expect(rows[5]).toHaveTextContent('4.0 – 4.9')
    expect(rows[7]).toHaveTextContent('6.0 – 7.0')
    expect(screen.getByText(/a number between \u20661\.0\u2069 and \u20667\.0\u2069/)).toBeInTheDocument()
  })

  it('1–5: seven rows, B1 4.0 – 4.4, A on top at 4.5 – 5.0 — no A2, no A1, no 7.0', () => {
    renderOn(FALLBACK_LADDERS[5])
    const rows = bodyRows()
    expect(rows.map((r) => r.cells[0].textContent)).toEqual([
      '🟤 D2', '🟤 D1', '🟤 C2', '⚪ C1', '⚪ B2', '🟡 B1', '🟡 A',
    ])
    expect(rows[5]).toHaveTextContent('4.0 – 4.4')
    expect(rows[6]).toHaveTextContent('4.5 – 5.0')
    expect(rows[6]).toHaveTextContent(/through to national or professional tour/)
    expect(screen.getByText(/a number between \u20661\.0\u2069 and \u20665\.0\u2069/)).toBeInTheDocument()
    expect(screen.getByText(/A number from \u20661\.00\u2069 to \u20665\.00\u2069/)).toBeInTheDocument()
    expect(screen.queryByText(/7\.0/)).not.toBeInTheDocument()
  })

  it('every band range cell is pinned left-to-right', () => {
    renderOn(FALLBACK_LADDERS[5])
    for (const row of bodyRows()) expect(row.cells[1]).toHaveAttribute('dir', 'ltr')
  })

  it('every code either ladder serves has a description in both languages', () => {
    // The descriptions resolve through a switch on the code — list them here, because no
    // static scan can see which codes a served ladder will carry.
    const codes = new Set([...FALLBACK_LADDERS[7].bands, ...FALLBACK_LADDERS[5].bands].map((b) => b.code))
    for (const bundle of [en, he] as Array<{ level_page: Record<string, unknown> }>) {
      for (const code of codes) {
        const desc = bundle.level_page[`tier_${code.toLowerCase()}_desc`]
        expect(typeof desc === 'string' && desc.trim().length > 0, `tier_${code.toLowerCase()}_desc`).toBe(true)
      }
    }
  })
})
