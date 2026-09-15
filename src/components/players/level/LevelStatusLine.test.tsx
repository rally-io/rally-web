import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { describeLevel } from './describeLevel'
import { LevelStatusLine } from './LevelStatusLine'

describe('LevelStatusLine', () => {
  it('verified: the seal, "Verified" in lime, then the reliability line', () => {
    render(<LevelStatusLine descriptor={describeLevel(4, true, 91)} />)
    expect(screen.getByRole('img', { name: 'Verified level' })).toBeInTheDocument()
    const word = screen.getByText('Verified')
    expect(word.className).toMatch(/text-rally-accent/)
    expect(screen.getByText(/level reliability/)).toBeInTheDocument()
  })

  it('unverified: the ghost seal and "Not verified yet", muted', () => {
    render(<LevelStatusLine descriptor={describeLevel(3.5, false, 40)} />)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(document.querySelector('svg[aria-hidden="true"]')).toBeInTheDocument()
    const word = screen.getByText('Not verified yet')
    expect(word.className).toMatch(/text-rally-text-2/)
  })

  it('isolates the percentage as one LTR token before interpolation', () => {
    render(<LevelStatusLine descriptor={describeLevel(3.5, false, 72)} />)
    // U+2066 LRI … U+2069 PDI around "72%", inside the sentence — the bidi-bug class
    expect(screen.getByText(/level reliability/).textContent).toBe('⁦72%⁩ level reliability')
  })

  it('drops the reliability line when the backend sent none', () => {
    render(<LevelStatusLine descriptor={describeLevel(3.5, false, null)} />)
    expect(screen.getByText('Not verified yet')).toBeInTheDocument()
    expect(screen.queryByText(/level reliability/)).not.toBeInTheDocument()
  })

  it('renders nothing for none and unknown', () => {
    const { container, rerender } = render(<LevelStatusLine descriptor={describeLevel(null, true, 90)} />)
    expect(container).toBeEmptyDOMElement()
    rerender(<LevelStatusLine descriptor={describeLevel(3.5, undefined, 72)} />)
    expect(container).toBeEmptyDOMElement()
  })
})
