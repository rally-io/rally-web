import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { VERIFIED_RELIABILITY_THRESHOLD } from './constants'
import { ReliabilityRing } from './ReliabilityRing'

const CIRC = 2 * Math.PI * 42 // 263.9

// Same formula as the component: derive the notch endpoints from the threshold rather than
// pinning the literal, so a future threshold tune doesn't silently break this test.
function expectedNotch() {
  const CENTER = 48
  const NOTCH_INNER_RADIUS = 34.4
  const NOTCH_OUTER_RADIUS = 44.7
  const angle = (VERIFIED_RELIABILITY_THRESHOLD / 100) * 2 * Math.PI
  const round1 = (v: number) => Math.round(v * 10) / 10
  const point = (r: number) => ({
    x: round1(CENTER + r * Math.sin(angle)),
    y: round1(CENTER - r * Math.cos(angle)),
  })
  return { inner: point(NOTCH_INNER_RADIUS), outer: point(NOTCH_OUTER_RADIUS) }
}

function fillDash(): number | null {
  const fill = screen.queryByTestId('ring-fill')
  if (!fill) return null
  const dash = fill.getAttribute('stroke-dasharray')
  return dash == null ? Infinity : parseFloat(dash.split(' ')[0])
}

describe('ReliabilityRing', () => {
  it('draws the track, the notch and the number; 0 % has no fill arc', () => {
    const { container } = render(<ReliabilityRing value="3.50" reliability={0} verified={false} />)
    expect(container.querySelector('circle[stroke="var(--color-rally-surface-2)"]')).toHaveAttribute('stroke-width', '6')
    expect(container.querySelector('line')).toHaveAttribute('x1', '16.9') // 82 % notch; the derived check is the next test
    expect(screen.getByText('3.50')).toHaveAttribute('fill', 'var(--color-rally-accent)')
    expect(fillDash()).toBeNull()
  })

  it('notch position is derived from VERIFIED_RELIABILITY_THRESHOLD', () => {
    const { container } = render(<ReliabilityRing value="3.50" reliability={0} verified={false} />)
    const { inner, outer } = expectedNotch()
    const line = container.querySelector('line')
    expect(line).toHaveAttribute('x1', String(inner.x))
    expect(line).toHaveAttribute('y1', String(inner.y))
    expect(line).toHaveAttribute('x2', String(outer.x))
    expect(line).toHaveAttribute('y2', String(outer.y))
  })

  it('fill length is reliability × circumference, drawn from 12 o\'clock', () => {
    const { rerender } = render(<ReliabilityRing value="3.50" reliability={50} verified={false} />)
    expect(fillDash()).toBeCloseTo(CIRC * 0.5, 1)
    expect(screen.getByTestId('ring-fill')).toHaveAttribute('transform', 'rotate(-90 48 48)')
    expect(screen.getByTestId('ring-fill')).toHaveAttribute('stroke-linecap', 'round')
    rerender(<ReliabilityRing value="4.00" reliability={86} verified />)
    expect(fillDash()).toBeCloseTo(CIRC * 0.86, 1)
  })

  it('100 % is a full circle, not a dash', () => {
    render(<ReliabilityRing value="4.00" reliability={100} verified />)
    expect(fillDash()).toBe(Infinity)
    expect(screen.getByTestId('ring-fill')).not.toHaveAttribute('stroke-dasharray')
  })

  it('fill colour follows the verified flag, not the threshold', () => {
    const { rerender } = render(<ReliabilityRing value="4.00" reliability={80} verified />)
    expect(screen.getByTestId('ring-fill')).toHaveAttribute('stroke', 'var(--color-rally-accent)')
    rerender(<ReliabilityRing value="4.00" reliability={90} verified={false} />)
    expect(screen.getByTestId('ring-fill')).toHaveAttribute('stroke', 'var(--color-rally-accent-muted)')
  })

  it('null reliability: track only; null value: em dash', () => {
    const { rerender } = render(<ReliabilityRing value="4.00" reliability={null} verified />)
    expect(fillDash()).toBeNull()
    expect(screen.getByText('4.00')).toBeInTheDocument()
    rerender(<ReliabilityRing value={null} reliability={null} verified={false} />)
    expect(screen.getByText('—')).toBeInTheDocument()
    expect(screen.getByRole('img')).toHaveAccessibleName('No level yet')
  })

  it('never mirrors: dir="ltr" on the svg', () => {
    render(<ReliabilityRing value="4.00" reliability={50} verified />)
    expect(screen.getByRole('img')).toHaveAttribute('dir', 'ltr')
  })
})
