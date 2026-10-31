import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { makeCard, makeMatch } from '@/lib/partners/testCards'
import type { PartnerMatch } from '@/types/partnerPool'
import { PartnerMatchDialog } from './PartnerMatchDialog'

/* Ported from rally-mobile's PartnerMatchSheet.test.tsx; PartnerMatchActions is covered here. */

const MATCH = makeMatch({ player: makeCard({ name: 'Noa Levi' }) })

function renderMatch(match: PartnerMatch | null = MATCH) {
  const handlers = { onRegisterTogether: vi.fn(), onWhatsApp: vi.fn(), onClose: vi.fn() }
  render(<PartnerMatchDialog match={match} tournamentTitle="Summer Cup" {...handlers} />)
  return handlers
}

describe('PartnerMatchDialog', () => {
  it('draws nothing without a match', () => {
    renderMatch(null)
    expect(screen.queryByTestId('partner-match-dialog')).toBeNull()
  })

  it('is a named dialog that names the partner and the tournament', () => {
    renderMatch()
    expect(screen.getByRole('dialog', { name: "It's a match!" })).toBeTruthy()
    expect(screen.getByText('You and Noa Levi matched for Summer Cup')).toBeTruthy()
  })

  it('both still free: Register together and WhatsApp, each with this match', () => {
    const { onRegisterTogether, onWhatsApp, onClose } = renderMatch()
    fireEvent.click(screen.getByRole('button', { name: 'Register together' }))
    fireEvent.click(screen.getByRole('button', { name: 'Message on WhatsApp' }))
    fireEvent.click(screen.getByRole('button', { name: 'Keep swiping' }))
    expect(onRegisterTogether).toHaveBeenCalledWith(MATCH)
    expect(onWhatsApp).toHaveBeenCalledWith(MATCH)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('Escape closes it, like Keep swiping', () => {
    const { onClose } = renderMatch()
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('already registered as this pair: says so instead of offering to register', () => {
    renderMatch(makeMatch({ player: makeCard({ name: 'Noa Levi' }), can_register_together: false, registered_together: true }))
    expect(screen.queryByTestId('partner-match-register')).toBeNull()
    expect(screen.getByTestId('partner-match-already').textContent).toBe("You're already registered with Noa Levi")
  })

  it('one of them is registered with someone else: no register button, no note', () => {
    renderMatch(makeMatch({ can_register_together: false, registered_together: false }))
    expect(screen.queryByTestId('partner-match-register')).toBeNull()
    expect(screen.queryByTestId('partner-match-already')).toBeNull()
  })

  it('no phone number: a note instead of the WhatsApp button', () => {
    renderMatch(makeMatch({ whatsapp_url: null }))
    expect(screen.queryByTestId('partner-match-whatsapp')).toBeNull()
    expect(screen.getByTestId('partner-match-no-phone').textContent).toBe('No phone number on their profile')
  })
})
