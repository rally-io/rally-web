import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { TournamentRulesSection } from './TournamentRulesSection'
import type { ScreenMessage } from '@/features/screenMessages/types'

function makeMessage(overrides: Partial<ScreenMessage> = {}): ScreenMessage {
  return {
    id: 'msg-1',
    scope: 'tournament',
    version: 1,
    title: 'Official Tournament Rules',
    body: 'Rule 1: All participants must arrive 15 minutes before the match.\nRule 2: Fair play applies.',
    kind: 'info',
    display_mode: 'inline',
    is_dismissible: true,
    gate_actions: [],
    requires_acknowledgment: false,
    is_acknowledged: false,
    starts_at: null,
    ends_at: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('TournamentRulesSection', () => {
  it('renders nothing when messages is empty', () => {
    const { container } = render(<TournamentRulesSection messages={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders accordion with title as message.title, collapsed by default', () => {
    const message = makeMessage({ title: 'תקנון וכללי הטורניר' })
    render(<TournamentRulesSection messages={[message]} />)

    // The accordion header shows the message title
    const header = screen.getByRole('button', { name: /תקנון וכללי הטורניר/i })
    expect(header).toBeInTheDocument()
    expect(header).toHaveAttribute('aria-expanded', 'false')

    // The body is NOT visible by default
    expect(screen.queryByText(/Rule 1: All participants/i)).not.toBeInTheDocument()
  })

  it('expands when clicked to show message.body, and collapses when clicked again', () => {
    const message = makeMessage({
      title: 'Padel Rules',
      body: 'Standard FIP rules apply to all sets.',
    })
    render(<TournamentRulesSection messages={[message]} />)

    const header = screen.getByRole('button', { name: /Padel Rules/i })
    expect(screen.queryByText('Standard FIP rules apply to all sets.')).not.toBeInTheDocument()

    // Click to expand
    fireEvent.click(header)
    expect(header).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('Standard FIP rules apply to all sets.')).toBeInTheDocument()

    // Click to collapse
    fireEvent.click(header)
    expect(header).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('Standard FIP rules apply to all sets.')).not.toBeInTheDocument()
  })

  it('renders multiple messages as separate accordions each titled by their message.title', () => {
    const msg1 = makeMessage({ id: 'm-1', title: 'Tournament Regulations', body: 'Regulation body text' })
    const msg2 = makeMessage({ id: 'm-2', title: 'Resident Waiver Eligibility', body: 'Waiver criteria text' })

    render(<TournamentRulesSection messages={[msg1, msg2]} />)

    expect(screen.getByRole('button', { name: /Tournament Regulations/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Resident Waiver Eligibility/i })).toBeInTheDocument()

    expect(screen.queryByText('Regulation body text')).not.toBeInTheDocument()
    expect(screen.queryByText('Waiver criteria text')).not.toBeInTheDocument()

    // Expand only the second one
    fireEvent.click(screen.getByRole('button', { name: /Resident Waiver Eligibility/i }))
    expect(screen.queryByText('Regulation body text')).not.toBeInTheDocument()
    expect(screen.getByText('Waiver criteria text')).toBeInTheDocument()
  })
})
