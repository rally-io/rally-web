import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BallMark } from './BallMark'

describe('BallMark', () => {
  it('is a decorative svg at the requested size', () => {
    const { container } = render(<BallMark size={16} />)
    const svg = container.querySelector('svg')!
    expect(svg).toHaveAttribute('width', '16')
    expect(svg).toHaveAttribute('height', '16')
    expect(svg).toHaveAttribute('aria-hidden', 'true')
    // felt, two seams, three dots: the product's mark, not a generic globe
    expect(container.querySelectorAll('[data-part="seam"]')).toHaveLength(2)
    expect(container.querySelectorAll('[data-part="dot"]')).toHaveLength(3)
  })

  it('takes a className for colour and layout', () => {
    const { container } = render(<BallMark size={20} className="shrink-0" />)
    expect(container.querySelector('svg')).toHaveClass('shrink-0')
  })

  it('gives each mount its own gradient id, so two marks on one page both paint', () => {
    const { container } = render(<><BallMark /><BallMark /></>)
    const ids = Array.from(container.querySelectorAll('radialGradient')).map((g) => g.id)
    expect(new Set(ids).size).toBe(2)
  })
})
