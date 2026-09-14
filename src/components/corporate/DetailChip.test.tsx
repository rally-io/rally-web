import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DetailChip } from './DetailChip'

describe('DetailChip', () => {
  it('renders a bare time range as one LTR island', () => {
    render(<DetailChip icon={null} label="Hours" value="19:30–03:00" isolateLtr />)
    const island = screen.getByText('19:30–03:00')
    expect(island.tagName).toBe('BDI')
    expect(island).toHaveAttribute('dir', 'ltr')
  })

  it('breaks lines on \\n and keeps each clock range unbreakable and LTR inside Hebrew', () => {
    const { container } = render(
      <DetailChip icon={null} label="Hours" value={'רביעי–חמישי 16:00–00:00\nשישי 07:30–13:00'} isolateLtr />,
    )
    const lines = container.querySelectorAll('dd > span.block')
    expect(lines).toHaveLength(2)
    expect(lines[0]).toHaveTextContent('רביעי–חמישי 16:00–00:00')
    expect(lines[1]).toHaveTextContent('שישי 07:30–13:00')
    for (const range of ['16:00–00:00', '07:30–13:00']) {
      const island = screen.getByText(range)
      expect(island.tagName).toBe('BDI')
      expect(island).toHaveAttribute('dir', 'ltr')
      expect(island.className).toContain('whitespace-nowrap')
    }
    // The Hebrew words are NOT inside an LTR island — bidi keeps their order.
    expect(screen.getByText('שישי').closest('bdi')).toBeNull()
  })

  it('leaves a plain Hebrew value alone', () => {
    render(<DetailChip icon={null} label="Where" value="מתחם פאדל טיים, חולון" />)
    expect(screen.getByText('מתחם פאדל טיים, חולון').closest('bdi')).toBeNull()
  })
})
