import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { FollowButton } from '../FollowButton'

describe('FollowButton', () => {
  it('shows Follow and calls toggle', () => {
    const toggle = vi.fn()
    render(<FollowButton isFollowing={false} isLoaded onToggle={toggle} isPending={false} error={null} />)
    const btn = screen.getByRole('button', { name: /follow/i })
    expect(btn).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(btn)
    expect(toggle).toHaveBeenCalled()
  })

  it('shows Following when following, disabled while pending, and the error line', () => {
    render(<FollowButton isFollowing isLoaded onToggle={vi.fn()} isPending error={new Error('x')} />)
    const btn = screen.getByRole('button', { name: /following/i })
    expect(btn).toHaveAttribute('aria-pressed', 'true')
    expect(btn).toBeDisabled()
    expect(screen.getByRole('status')).toHaveTextContent(/could not/i)
  })

  it('renders nothing until the relationship is known', () => {
    const { container } = render(<FollowButton isFollowing={false} isLoaded={false} onToggle={vi.fn()} isPending={false} error={null} />)
    expect(container).toBeEmptyDOMElement()
  })
})
