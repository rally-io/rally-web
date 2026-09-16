import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { LevelExplainerSheet } from './LevelExplainerSheet'

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
