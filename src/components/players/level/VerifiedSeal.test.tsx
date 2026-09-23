import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { VerifiedSeal } from './VerifiedSeal'

describe('VerifiedSeal', () => {
  it('is labelled "Verified level" and draws the mark at every size', () => {
    const { container, rerender } = render(<VerifiedSeal size={12} />)
    expect(screen.getByRole('img', { name: 'Verified level' })).toBeInTheDocument()
    expect(container.querySelector('svg')).toHaveAttribute('width', '12')
    // The old seal gated the seams at 16 and the ball at 22, because they were
    // hand-placed primitives that collided with the R at small sizes. The mark is
    // one traced letterform now — ball and seams included — so there is nothing to
    // switch off and no size at which the seal is missing part of itself.
    expect(container.querySelector('[data-part="seal-mark"]')).toBeInTheDocument()
    rerender(<VerifiedSeal size={72} />)
    expect(container.querySelector('[data-part="seal-mark"]')).toBeInTheDocument()
  })

  it('uses the Appendix A palette by token, so a brand change in App.css reaches the seal', () => {
    const { container } = render(<VerifiedSeal size={22} />)
    // The ground is the logo's BLUE. Pinned because the seal shipped lime-on-lime
    // once, which renders the R invisible except for its outline.
    expect(container.querySelector('g')).toHaveAttribute('fill', 'var(--color-rally-seal-ground)')
    expect(container.querySelector('circle[r="7.7"]')).toHaveAttribute(
      'fill',
      'var(--color-rally-seal-ground)',
    )
    // Each layer of the mark pinned separately: face on top, ink as the outline
    // beneath it. Pinning only one leaves the other free to drift with the suite
    // still green.
    expect(container.querySelector('[data-part="seal-r"]')).toHaveAttribute(
      'fill',
      'var(--color-rally-seal-face)',
    )
    expect(container.querySelector('[data-part="seal-r-outline"]')).toHaveAttribute(
      'fill',
      'var(--color-rally-seal-ink)',
    )
  })

  it('fills both mark layers evenodd, or the bowl and the ball seams fill in', () => {
    const { container } = render(<VerifiedSeal size={48} />)
    // Not cosmetic: the R's counter and the ball's seams are holes in the outline.
    // Under the default nonzero rule they paint solid and the R becomes a blob.
    for (const part of ['seal-r', 'seal-r-outline']) {
      expect(container.querySelector(`[data-part="${part}"]`)).toHaveAttribute(
        'fill-rule',
        'evenodd',
      )
    }
  })

  it('ghost: a dashed grey outline, decorative (the text beside it carries the state)', () => {
    const { container } = render(<VerifiedSeal size={22} ghost />)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    const g = container.querySelector('g')!
    expect(g).toHaveAttribute('fill', 'none')
    expect(g).toHaveAttribute('stroke', 'var(--color-rally-text-muted)')
    expect(g).toHaveAttribute('stroke-dasharray', '2 1.6')
    expect(container.querySelectorAll('path')).toHaveLength(0)
    // `verified-seal` belongs to the real seal only — a ghost render must never
    // silently satisfy a `getByTestId('verified-seal')` query.
    expect(screen.queryByTestId('verified-seal')).not.toBeInTheDocument()
    // The ghost has its own stable testid so `VerificationMark` can assert on it.
    expect(screen.getByTestId('verified-seal-ghost')).toBeInTheDocument()
  })

  it('draws the R, not a check', () => {
    const { container } = render(<VerifiedSeal size={16} />)
    expect(container.querySelector('[data-part="seal-r"]')).toBeInTheDocument()
    expect(container.querySelector('[data-part="seal-check"]')).not.toBeInTheDocument()
  })

  it('the ghost draws no mark at all', () => {
    const { container } = render(<VerifiedSeal size={22} ghost />)
    expect(container.querySelector('[data-part="seal-mark"]')).not.toBeInTheDocument()
    expect(container.querySelector('[data-part="seal-r"]')).not.toBeInTheDocument()
  })

  it('keeps the testids the e2e flows and VerificationMark query', () => {
    // Both suites assert on these by name across several flows; renaming them
    // would pass every unit test here and fail only on a device.
    const solid = render(<VerifiedSeal size={20} />)
    expect(solid.getByTestId('verified-seal')).toBeInTheDocument()
    solid.unmount()
    const ghost = render(<VerifiedSeal size={20} ghost />)
    expect(ghost.getByTestId('verified-seal-ghost')).toBeInTheDocument()
  })
})
