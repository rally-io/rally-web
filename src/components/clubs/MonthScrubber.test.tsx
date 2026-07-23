import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MonthScrubber } from './MonthScrubber'

describe('MonthScrubber', () => {
  it('renders one anchor link per month', () => {
    render(
      <MonthScrubber
        months={[
          { key: '2026-07', label: 'Jul' },
          { key: '2026-08', label: 'Aug' },
        ]}
      />,
    )
    expect(screen.getByRole('link', { name: 'Jul' })).toHaveAttribute('href', '#m-2026-07')
    expect(screen.getByRole('link', { name: 'Aug' })).toHaveAttribute('href', '#m-2026-08')
  })

  it('renders nothing with fewer than two months', () => {
    const { container } = render(<MonthScrubber months={[{ key: '2026-07', label: 'Jul' }]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('scrolls in place on click without writing the hash', () => {
    const target = document.createElement('section')
    target.id = 'm-2026-07'
    target.scrollIntoView = vi.fn()
    document.body.appendChild(target)
    render(
      <MonthScrubber
        months={[
          { key: '2026-07', label: 'Jul' },
          { key: '2026-08', label: 'Aug' },
        ]}
      />,
    )
    fireEvent.click(screen.getByRole('link', { name: 'Jul' }))
    expect(target.scrollIntoView).toHaveBeenCalled()
    expect(window.location.hash).toBe('')
    target.remove()
  })
})
