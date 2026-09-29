import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { LevelExplainerSheet } from './LevelExplainerSheet'
import { SkillLadderContext } from '@/contexts/SkillLadderContext'
import { FALLBACK_LADDERS } from '@/lib/skillLadder'

describe('LevelExplainerSheet', () => {
  it('renders the six blocks with the engine numbers interpolated, plus Close and Read more', () => {
    render(
      <MemoryRouter>
        <LevelExplainerSheet open onOpenChange={() => {}} />
      </MemoryRouter>,
    )
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveTextContent('How your level works')
    for (const title of ['Your level', 'Level reliability', 'Verified', 'What counts', 'Keeping it', 'Tier']) {
      expect(screen.getByRole('heading', { name: title })).toBeInTheDocument()
    }
    expect(dialog).toHaveTextContent(/the notch — ⁦82%⁩ —/) // the % token is bidi-isolated (Global constraints)
    expect(dialog).toHaveTextContent('about 10 rated matches, roughly 3 tournaments')
    expect(dialog).toHaveTextContent('3 months without a rated match')
    // The scale is the served ladder's, isolated for Hebrew — 1.00 to 7.00 before the flip.
    expect(dialog).toHaveTextContent('A number from ⁦1.00⁩ to ⁦7.00⁩.')
    expect(screen.getByRole('link', { name: 'Read more' })).toHaveAttribute('href', '/level')
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument()
  })

  it('the Close button closes the sheet', () => {
    const onOpenChange = vi.fn()
    render(
      <MemoryRouter>
        <LevelExplainerSheet open onOpenChange={onOpenChange} />
      </MemoryRouter>,
    )
    screen.getByRole('button', { name: 'Close' }).click()
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('renders nothing when closed', () => {
    render(
      <MemoryRouter>
        <LevelExplainerSheet open={false} onOpenChange={() => {}} />
      </MemoryRouter>,
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('LevelExplainerSheet on the 1–5 ladder', () => {
  it('says the level is a number from 1.00 to 5.00', () => {
    render(
      <SkillLadderContext.Provider value={{ ladder: FALLBACK_LADDERS[5], refresh: () => {} }}>
        <MemoryRouter>
          <LevelExplainerSheet open onOpenChange={() => {}} />
        </MemoryRouter>
      </SkillLadderContext.Provider>,
    )
    expect(screen.getByRole('dialog')).toHaveTextContent('A number from ⁦1.00⁩ to ⁦5.00⁩.')
    expect(screen.getByRole('dialog')).not.toHaveTextContent('7.00')
  })
})
