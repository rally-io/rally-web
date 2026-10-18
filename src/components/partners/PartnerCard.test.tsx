import { act, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import i18n from '@/i18n'
import { NO_TIER_COLOR, TIER_COLOR } from '@/features/playerGlobe/constants'
import { makeCard } from '@/lib/partners/testCards'
import type { PartnerReason } from '@/types/partnerPool'
import { PartnerCard } from './PartnerCard'

/* Ported from rally-mobile's PartnerCard.test.tsx. The copy is the real English. */

const slot = (testId: string) => screen.getByTestId(testId).style
const viewer = (side: string | null) => ({ side, name: 'Dana Levi', avatarUrl: null })

/** jsdom normalises colours in inline styles to rgb(). */
function rgb(hex: string): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`
}

afterEach(async () => {
  await act(() => i18n.changeLanguage('en'))
})

describe('PartnerCard', () => {
  it('shows level, matches and wins in the stats row, and the side on the court', () => {
    render(<PartnerCard card={makeCard()} />)
    expect(within(screen.getByTestId('partner-tile-level')).getByTestId('level-chip')).toBeTruthy()
    expect(within(screen.getByTestId('partner-court')).getByTestId('partner-tile-side').textContent).toBe('SideRight')
    expect(within(screen.getByTestId('partner-tile-matches')).getByText('42')).toBeTruthy()
    expect(within(screen.getByTestId('partner-tile-wins')).getByText('57%')).toBeTruthy()
  })

  it('a player with no matches is "New to Rally", not 0%', () => {
    render(<PartnerCard card={makeCard({ matches_played: 0, win_rate: null })} />)
    expect(within(screen.getByTestId('partner-tile-wins')).getByText('New to Rally')).toBeTruthy()
  })

  it('no level prints a dash; an unknown side shows no side label and puts the player mid-court', () => {
    render(<PartnerCard card={makeCard({ skill_level: null, skill_tier: null, court_side: 'middle' })} />)
    expect(within(screen.getByTestId('partner-tile-level')).getByText('—')).toBeTruthy()
    expect(screen.queryByTestId('partner-tile-side')).toBeNull()
    expect(screen.queryByText('middle')).toBeNull()
    expect(slot('partner-court-player').left).toBe('0%')
    expect(slot('partner-court-player').width).toBe('100%')
  })

  it('stands the player in their half of the court: right, left, or across both', () => {
    const { rerender } = render(<PartnerCard card={makeCard({ court_side: 'right_side' })} />)
    expect(slot('partner-court-player').left).toBe('50%')
    rerender(<PartnerCard card={makeCard({ court_side: 'left_side' })} />)
    expect(slot('partner-court-player').left).toBe('10%')
    rerender(<PartnerCard card={makeCard({ court_side: 'both_sides' })} />)
    expect(slot('partner-court-player').left).toBe('0%')
    expect(screen.getByTestId('partner-tile-side').textContent).toBe('SideBoth')
  })

  describe('you, on the court', () => {
    it('a left-side viewer stands in the left half, across from a right-side player', () => {
      render(<PartnerCard card={makeCard({ court_side: 'right_side' })} viewer={viewer('left_side')} />)
      expect(slot('partner-court-player').left).toBe('50%')
      expect(slot('partner-court-you-slot').left).toBe('10%')
      expect(within(screen.getByTestId('partner-court-you')).getByText('You')).toBeTruthy()
      expect(within(screen.getByTestId('partner-court-you')).getByText('DL')).toBeTruthy()
    })

    it('a player who plays both sides takes the half you leave free', () => {
      render(<PartnerCard card={makeCard({ court_side: 'both_sides' })} viewer={viewer('right_side')} />)
      expect(slot('partner-court-player').left).toBe('10%')
      expect(slot('partner-court-you-slot').left).toBe('50%')
      // Their side label still says what they told us.
      expect(screen.getByTestId('partner-tile-side').textContent).toBe('SideBoth')
    })

    it('the same side puts you in their half, on their ring, so the clash shows', () => {
      render(<PartnerCard card={makeCard({ court_side: 'right_side' })} viewer={viewer('right_side')} />)
      const player = screen.getByTestId('partner-court-player')
      expect(within(player).getByTestId('partner-court-you')).toBeTruthy()
      expect(screen.queryByTestId('partner-court-you-slot')).toBeNull()
      expect(player.style.left).toBe('50%')
    })

    it('no marker without your side, without theirs, or when you both play both sides', () => {
      const { rerender } = render(<PartnerCard card={makeCard({ court_side: 'right_side' })} viewer={viewer(null)} />)
      expect(screen.queryByTestId('partner-court-you')).toBeNull()
      rerender(<PartnerCard card={makeCard({ court_side: null })} viewer={viewer('left_side')} />)
      expect(screen.queryByTestId('partner-court-you')).toBeNull()
      rerender(<PartnerCard card={makeCard({ court_side: 'both_sides' })} viewer={viewer('both_sides')} />)
      expect(screen.queryByTestId('partner-court-you')).toBeNull()
      expect(slot('partner-court-player').left).toBe('0%')
    })

    it('the court does not mirror in Hebrew: a left-side viewer is still on the left', async () => {
      await act(() => i18n.changeLanguage('he'))
      render(<PartnerCard card={makeCard({ court_side: 'right_side' })} viewer={viewer('left_side')} />)
      expect(slot('partner-court-you-slot').left).toBe('10%')
      expect(slot('partner-court-player').left).toBe('50%')
    })
  })

  it('shows the year they joined, and nothing when it is unknown', () => {
    const { rerender } = render(<PartnerCard card={makeCard({ since: 2024 })} />)
    expect(screen.getByTestId('partner-card-since').textContent).toBe('On Rally since 2024')
    rerender(<PartnerCard card={makeCard({ since: 0 })} />)
    expect(screen.queryByTestId('partner-card-since')).toBeNull()
  })

  it('prints the tier code and colours the ring from globe_tier', () => {
    render(<PartnerCard card={makeCard({ skill_tier: 'B1', globe_tier: 'gold' })} />)
    expect(within(screen.getByTestId('partner-tile-level')).getByText('B1')).toBeTruthy()
    expect(slot('partner-card-ring').borderColor).toBe(rgb(TIER_COLOR.gold))
  })

  it('a card with no globe tier gets the no-tier ring', () => {
    render(<PartnerCard card={makeCard({ globe_tier: null })} />)
    expect(slot('partner-card-ring').borderColor).toBe(rgb(NO_TIER_COLOR))
  })

  it('badges: wants to partner with you, looking, outside your network (ring 3)', () => {
    render(<PartnerCard card={makeCard({ likes_you: true, looking: true, ring: 3 })} />)
    expect(screen.getByTestId('partner-badge-likes-you').textContent).toBe('Wants to partner with you')
    expect(screen.getByTestId('partner-badge-looking').textContent).toBe('Looking')
    expect(screen.getByTestId('partner-badge-outside').textContent).toBe('Outside your network')
  })

  it('a ring-1 card that is not looking and has not liked you shows no badge', () => {
    render(<PartnerCard card={makeCard()} />)
    expect(screen.queryByTestId('partner-badge-likes-you')).toBeNull()
    expect(screen.queryByTestId('partner-badge-looking')).toBeNull()
    expect(screen.queryByTestId('partner-badge-outside')).toBeNull()
  })

  it('"Why you two" skips unknown codes and shows at most three lines', () => {
    const reasons: PartnerReason[] = [
      { code: 'from_the_future', params: {} },
      { code: 'similar_level', params: {} },
      { code: 'mutual_partners', params: { count: 2 } },
      { code: 'shared_tournaments', params: { count: 1 } },
      { code: 'played_together', params: { count: 3, role: 'partner' } },
    ]
    render(<PartnerCard card={makeCard({ reasons })} />)
    expect(screen.getAllByTestId('partner-reason').map((el) => el.textContent)).toEqual([
      'Similar level',
      '2 partners in common',
      '1 tournament in common',
    ])
  })

  it('no reasons, no "Why you two" section', () => {
    render(<PartnerCard card={makeCard({ reasons: [] })} />)
    expect(screen.queryByTestId('partner-reasons')).toBeNull()
  })
})
