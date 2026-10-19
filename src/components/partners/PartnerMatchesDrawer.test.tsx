import type { ComponentProps } from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/services/api/partnerPools', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/api/partnerPools')>()),
  getMatches: vi.fn(),
}))

import { getMatches } from '@/services/api/partnerPools'
import { makeCard, makeMatch, ok } from '@/lib/partners/testCards'
import { PartnerMatchesDrawer } from './PartnerMatchesDrawer'

/* Ported from rally-mobile's PartnerMatchesSheet.test.tsx. */

const NOA = makeMatch({ player: makeCard({ player_id: 'p-1', name: 'Noa Levi' }) })
const DANA = makeMatch({
  player: makeCard({ player_id: 'p-2', name: 'Dana Cohen' }),
  can_register_together: false,
  whatsapp_url: null,
})

function renderMatches(props: Partial<ComponentProps<typeof PartnerMatchesDrawer>> = {}) {
  const handlers = { onClose: vi.fn(), onRegisterTogether: vi.fn(), onWhatsApp: vi.fn(), onLoaded: vi.fn() }
  render(<PartnerMatchesDrawer open poolId="pool-1" {...handlers} {...props} />)
  return handlers
}

beforeEach(() => vi.mocked(getMatches).mockReset())

describe('PartnerMatchesDrawer', () => {
  it('draws nothing and fetches nothing while closed', () => {
    renderMatches({ open: false })
    expect(screen.queryByTestId('partner-matches')).toBeNull()
    expect(getMatches).not.toHaveBeenCalled()
  })

  it('is a dialog titled "Your matches" that lists the matches and reports the fresh count', async () => {
    vi.mocked(getMatches).mockResolvedValue(ok([NOA, DANA]))
    const { onLoaded } = renderMatches()
    expect(screen.getByRole('dialog', { name: 'Your matches' })).toBeTruthy()
    expect(await screen.findByTestId('partner-match-row-p-1')).toBeTruthy()
    expect(screen.getByTestId('partner-match-row-p-2')).toBeTruthy()
    expect(getMatches).toHaveBeenCalledWith('pool-1')
    expect(onLoaded).toHaveBeenCalledWith(2)
  })

  it("each row's buttons act on that row's match", async () => {
    vi.mocked(getMatches).mockResolvedValue(ok([NOA, DANA]))
    const { onRegisterTogether, onWhatsApp } = renderMatches()
    const noa = await screen.findByTestId('partner-match-row-p-1')
    fireEvent.click(within(noa).getByTestId('partner-match-register'))
    fireEvent.click(within(noa).getByTestId('partner-match-whatsapp'))
    expect(onRegisterTogether).toHaveBeenCalledWith(NOA)
    expect(onWhatsApp).toHaveBeenCalledWith(NOA)
    const dana = screen.getByTestId('partner-match-row-p-2')
    expect(within(dana).queryByTestId('partner-match-register')).toBeNull()
    expect(within(dana).getByTestId('partner-match-no-phone')).toBeTruthy()
  })

  it('says so when there are no matches yet', async () => {
    vi.mocked(getMatches).mockResolvedValue(ok([]))
    renderMatches()
    expect((await screen.findByTestId('partner-matches-empty')).textContent).toBe('No matches yet. Keep swiping!')
  })

  it('a failed load can be retried', async () => {
    vi.mocked(getMatches).mockRejectedValueOnce({ code: 'NETWORK_ERROR' }).mockResolvedValueOnce(ok([NOA]))
    renderMatches()
    fireEvent.click(await screen.findByTestId('partner-matches-retry'))
    expect(await screen.findByTestId('partner-match-row-p-1')).toBeTruthy()
    expect(getMatches).toHaveBeenCalledTimes(2)
  })

  it('the close button closes it', async () => {
    vi.mocked(getMatches).mockResolvedValue(ok([]))
    const { onClose } = renderMatches()
    await screen.findByTestId('partner-matches-empty')
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
