import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { VerificationMark } from './VerificationMark'

// Assertions use the English copy: src/test-setup.ts forces the 'en' locale for
// every test in this suite (the Hebrew strings live in he.json and are covered
// there, not by rendering here).
describe('VerificationMark renders the three states and only the three states', () => {
  it('true: seal plus the verified word', () => {
    render(<VerificationMark verified={true} />)
    expect(screen.getByTestId('verified-seal')).toBeInTheDocument()
    expect(screen.getByText('Verified')).toBeInTheDocument()
  })

  it('false: ghost plus the not-verified word', () => {
    render(<VerificationMark verified={false} />)
    expect(screen.getByTestId('verified-seal-ghost')).toBeInTheDocument()
    expect(screen.getByText('Not verified')).toBeInTheDocument()
  })

  it('null: nothing — no seal, no ghost, no words', () => {
    const { container } = render(<VerificationMark verified={null} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('undefined behaves as null', () => {
    const { container } = render(<VerificationMark verified={undefined} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('showLabel=false renders the mark alone, still three states', () => {
    const { container, rerender } = render(<VerificationMark verified={true} showLabel={false} />)
    expect(screen.getByTestId('verified-seal')).toBeInTheDocument()
    expect(screen.queryByText('Verified')).not.toBeInTheDocument()
    rerender(<VerificationMark verified={null} showLabel={false} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('never renders a seal below the 16px floor', () => {
    const { container } = render(<VerificationMark verified={true} size={12} />)
    expect(container.querySelector('svg')?.getAttribute('width')).toBe('16')
  })

  it('the verified label reads visually louder than the unverified one', () => {
    const { rerender } = render(<VerificationMark verified={true} />)
    expect(screen.getByText('Verified')).toHaveClass('text-rally-text-2')
    rerender(<VerificationMark verified={false} />)
    expect(screen.getByText('Not verified')).toHaveClass('text-rally-text-muted')
  })
})
