import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@/i18n'
import { SignInRequiredPanel } from './SignInRequiredPanel'

describe('SignInRequiredPanel', () => {
  it('renders message and CTA label', () => {
    render(
      <SignInRequiredPanel
        message="Sign in to register"
        ctaLabel="Sign in / Create account"
        onSignIn={vi.fn()}
      />,
    )
    expect(screen.getByText('Sign in to register')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Sign in / Create account' }),
    ).toBeInTheDocument()
  })

  it('calls onSignIn when the CTA is clicked', () => {
    const onSignIn = vi.fn()
    render(
      <SignInRequiredPanel
        message="Sign in to register"
        ctaLabel="Sign in / Create account"
        onSignIn={onSignIn}
      />,
    )
    fireEvent.click(
      screen.getByRole('button', { name: 'Sign in / Create account' }),
    )
    expect(onSignIn).toHaveBeenCalledTimes(1)
  })

  it('has a lock icon for visual recognition', () => {
    render(
      <SignInRequiredPanel
        message="x"
        ctaLabel="y"
        onSignIn={vi.fn()}
      />,
    )
    // Lucide icons render as <svg> with class containing "lucide-lock"
    const svg = document.querySelector('svg.lucide-lock')
    expect(svg).not.toBeNull()
  })
})
