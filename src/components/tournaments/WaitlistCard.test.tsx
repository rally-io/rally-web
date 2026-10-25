import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import i18n from '@/i18n'

vi.mock('@/services/api/registrationEvidence', () => ({
  uploadRegistrationEvidence: vi.fn(() => Promise.resolve([])),
  listRegistrationEvidence: vi.fn(() => Promise.resolve([])),
}))

import { WaitlistCard } from './WaitlistCard'

const TOURNAMENT = { id: 't-1', format: 'doubles', entry_fee: 150 }
const REG = {
  id: 'r-1', tournament_id: 't-1', player_1_id: 'p-1', status: 'payment_pending', payment_status: null,
}

function renderCard(props: Partial<React.ComponentProps<typeof WaitlistCard>> = {}) {
  return render(
    <MemoryRouter>
      <WaitlistCard position={3} onLeave={vi.fn()} {...props} />
    </MemoryRouter>,
  )
}

describe('WaitlistCard', () => {
  it('an old card-only entry shows the place in line and Leave, no registration panel', () => {
    renderCard({ registration: null, tournament: TOURNAMENT })
    expect(screen.getByTestId('tournament-waitlist-position')).toHaveTextContent(
      i18n.t('tournament.tournamentWaitlistPosition', { position: 3 }),
    )
    expect(screen.getByTestId('tournament-leave-waitlist-button')).toBeInTheDocument()
    expect(screen.queryByTestId('waitlist-registration-panel')).not.toBeInTheDocument()
  })

  it('a sign-up shows its payment state under the place in line', () => {
    renderCard({ registration: REG, tournament: TOURNAMENT, onEvidenceChanged: async () => {} })
    expect(screen.getByTestId('waitlist-payment-state')).toHaveTextContent(
      i18n.t('tournament.tournamentWaitlistPaymentAwaiting'),
    )
    expect(screen.getByTestId('waitlist-complete-payment')).toBeInTheDocument()
  })
})
