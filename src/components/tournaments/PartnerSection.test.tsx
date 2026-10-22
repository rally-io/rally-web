import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import i18n from '@/i18n'

vi.mock('@/hooks/usePlayerSearch', () => ({ usePlayerSearch: vi.fn() }))

import { PartnerSection } from './PartnerSection'
import { usePlayerSearch } from '@/hooks/usePlayerSearch'
import type { PartnerSelectionState } from '@/types/partner'
import type { PartnerSelf } from '@/lib/selfPartner'

const mockUsePlayerSearch = vi.mocked(usePlayerSearch)

function renderSection(
  state: PartnerSelectionState,
  onPartnerChange = vi.fn(),
  searchEnabled?: boolean,
  self?: PartnerSelf,
) {
  render(
    <I18nextProvider i18n={i18n}>
      <PartnerSection
        selectionState={state}
        onPartnerChange={onPartnerChange}
        searchEnabled={searchEnabled}
        self={self}
      />
    </I18nextProvider>,
  )
  return onPartnerChange
}

beforeEach(() => {
  mockUsePlayerSearch.mockReturnValue({ results: [], isLoading: false, isActive: false })
})

describe('PartnerSection', () => {
  it('selects an existing player from search results', () => {
    mockUsePlayerSearch.mockReturnValue({
      results: [{ id: 'p-1', first_name: 'Dana', last_name: 'Levi', avatar_url: null, skill_level: 4.5, level_verified: true, level_reliability: 90 }],
      isLoading: false,
      isActive: true,
    })
    const onPartnerChange = renderSection({ phase: 'idle' })

    fireEvent.click(screen.getByRole('button', { name: /Dana Levi/ }))

    expect(onPartnerChange).toHaveBeenCalledWith({
      phase: 'selected',
      partner: { type: 'existing', id: 'p-1', displayName: 'Dana Levi', avatarUrl: null },
    })
  })

  it('shows a LevelChip on a search row when the result carries a level, nothing when it does not', () => {
    mockUsePlayerSearch.mockReturnValue({
      results: [
        { id: 'p-1', first_name: 'Dana', last_name: 'Levi', avatar_url: null, skill_level: 4.5, level_verified: true, level_reliability: 90 },
        { id: 'p-2', first_name: 'Noa', last_name: 'Cohen', avatar_url: null },
      ],
      isLoading: false,
      isActive: true,
    })
    renderSection({ phase: 'idle' })
    expect(screen.getByText('4.50')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Verified level' })).toBeInTheDocument()
    expect(screen.getAllByTestId('level-chip')).toHaveLength(1)
  })

  it('shows the no-results message once a search returns empty', () => {
    mockUsePlayerSearch.mockReturnValue({ results: [], isLoading: false, isActive: true })
    renderSection({ phase: 'idle' })
    expect(screen.getByText(i18n.t('tournament.partnerNoResults'))).toBeInTheDocument()
  })

  it('disables the invite button until first/last name and a phone are filled in', () => {
    renderSection({ phase: 'idle' })
    const inviteBtn = screen.getByRole('button', { name: i18n.t('tournament.partnerInviteButton') })
    expect(inviteBtn).toBeDisabled()

    fireEvent.change(screen.getByPlaceholderText(i18n.t('tournament.partnerFirstNamePlaceholder')), {
      target: { value: 'Noa' },
    })
    fireEvent.change(screen.getByPlaceholderText(i18n.t('tournament.partnerLastNamePlaceholder')), {
      target: { value: 'Cohen' },
    })
    expect(inviteBtn).toBeDisabled()

    fireEvent.change(screen.getByPlaceholderText(i18n.t('tournament.partnerMobileNumberPlaceholder')), {
      target: { value: '501234567' },
    })
    expect(inviteBtn).not.toBeDisabled()
  })

  it('submits the invite form as a selected invite partner', () => {
    const onPartnerChange = renderSection({ phase: 'idle' })

    fireEvent.change(screen.getByPlaceholderText(i18n.t('tournament.partnerFirstNamePlaceholder')), {
      target: { value: 'Noa' },
    })
    fireEvent.change(screen.getByPlaceholderText(i18n.t('tournament.partnerLastNamePlaceholder')), {
      target: { value: 'Cohen' },
    })
    fireEvent.change(screen.getByPlaceholderText(i18n.t('tournament.partnerMobileNumberPlaceholder')), {
      target: { value: '501234567' },
    })
    fireEvent.click(screen.getByRole('button', { name: i18n.t('tournament.partnerInviteButton') }))

    expect(onPartnerChange).toHaveBeenCalledWith({
      phase: 'selected',
      partner: {
        type: 'invite',
        firstName: 'Noa',
        lastName: 'Cohen',
        countryCode: '+972',
        phone: '501234567',
      },
    })
  })

  it('shows a chip with a remove button once a partner is selected', () => {
    const onPartnerChange = renderSection({
      phase: 'selected',
      partner: { type: 'existing', id: 'p-1', displayName: 'Dana Levi', avatarUrl: null },
    })

    expect(screen.getByText('Dana Levi')).toBeInTheDocument()
    expect(screen.getByText(i18n.t('tournament.partnerBadgeRally'))).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText(i18n.t('tournament.partnerRemove')))
    expect(onPartnerChange).toHaveBeenCalledWith({ phase: 'idle' })
  })

  it('renders the search box by default (existing callers keep today\'s behaviour)', () => {
    renderSection({ phase: 'idle' })
    expect(screen.getByPlaceholderText(i18n.t('tournament.partnerSearchPlaceholder'))).toBeInTheDocument()
    expect(screen.getByText(i18n.t('tournament.partnerOrDivider'))).toBeInTheDocument()
  })

  it('searchEnabled={false} hides search entirely, keeps invite present', () => {
    renderSection({ phase: 'idle' }, vi.fn(), false)

    expect(
      screen.queryByPlaceholderText(i18n.t('tournament.partnerSearchPlaceholder')),
    ).not.toBeInTheDocument()
    expect(screen.queryByText(i18n.t('tournament.partnerOrDivider'))).not.toBeInTheDocument()

    expect(
      screen.getByPlaceholderText(i18n.t('tournament.partnerFirstNamePlaceholder')),
    ).toBeInTheDocument()
    expect(
      screen.getByPlaceholderText(i18n.t('tournament.partnerLastNamePlaceholder')),
    ).toBeInTheDocument()
    expect(
      screen.getByPlaceholderText(i18n.t('tournament.partnerMobileNumberPlaceholder')),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: i18n.t('tournament.partnerInviteButton') }),
    ).toBeInTheDocument()
    // NOTE: this test alone does not prove '' comes from the searchEnabled branch
    // rather than from an empty `query` state that can never change (no box to
    // type into) — see the next test, which forces `query` non-empty first.
  })

  it('disabling search stops issuing a live query even though the typed text is still held (regression guard)', () => {
    const onPartnerChange = vi.fn()
    const tree = (searchEnabled: boolean) => (
      <I18nextProvider i18n={i18n}>
        <PartnerSection
          selectionState={{ phase: 'idle' }}
          onPartnerChange={onPartnerChange}
          searchEnabled={searchEnabled}
        />
      </I18nextProvider>
    )
    const { rerender } = render(tree(true))

    fireEvent.change(screen.getByPlaceholderText(i18n.t('tournament.partnerSearchPlaceholder')), {
      target: { value: 'Dana' },
    })
    // While search is enabled, the hook is driven by the live query.
    expect(mockUsePlayerSearch).toHaveBeenLastCalledWith('Dana')

    rerender(tree(false))

    // The component's own `query` state still holds 'Dana' — it is never cleared
    // by disabling search. So this passing with '' proves the '' comes from the
    // `searchEnabled ? query : ''` branch, not from an empty query: a reverted
    // `usePlayerSearch(query)` would still be last-called with 'Dana' here and
    // fail this assertion.
    expect(mockUsePlayerSearch).toHaveBeenLastCalledWith('')
    expect(
      screen.queryByPlaceholderText(i18n.t('tournament.partnerSearchPlaceholder')),
    ).not.toBeInTheDocument()
  })
})

describe('PartnerSection — nobody is their own partner', () => {
  const me: PartnerSelf = { id: 'p-me', firstName: 'Dana', lastName: 'Levi', phone: '501234567', countryCode: '+972' }

  const fill = (first: string, last: string, phone: string) => {
    fireEvent.change(screen.getByPlaceholderText(i18n.t('tournament.partnerFirstNamePlaceholder')), {
      target: { value: first },
    })
    fireEvent.change(screen.getByPlaceholderText(i18n.t('tournament.partnerLastNamePlaceholder')), {
      target: { value: last },
    })
    fireEvent.change(screen.getByPlaceholderText(i18n.t('tournament.partnerMobileNumberPlaceholder')), {
      target: { value: phone },
    })
  }
  const inviteButton = () => screen.getByRole('button', { name: i18n.t('tournament.partnerInviteButton') })

  it('shows my own search row as "That\'s you", disabled, and clicking it selects nobody', () => {
    mockUsePlayerSearch.mockReturnValue({
      results: [
        { id: 'p-me', first_name: 'Dana', last_name: 'Levi', avatar_url: null },
        { id: 'p-2', first_name: 'Dana', last_name: 'Cohen', avatar_url: null },
      ],
      isLoading: false,
      isActive: true,
    })
    const onPartnerChange = renderSection({ phase: 'idle' }, vi.fn(), undefined, me)

    const mine = screen.getByTestId('partner-result-self')
    expect(mine).toBeDisabled()
    expect(mine).toHaveAttribute('aria-disabled', 'true')
    expect(mine).toHaveTextContent('Dana Levi')
    expect(mine).toHaveTextContent(i18n.t('tournament.partnerSelfRow'))
    expect(mine).not.toHaveTextContent(i18n.t('tournament.partnerBadgeRally'))

    fireEvent.click(mine)
    expect(onPartnerChange).not.toHaveBeenCalled()

    // Everyone else stays pickable.
    const other = screen.getByRole('button', { name: /Dana Cohen/ })
    expect(other).not.toBeDisabled()
    expect(other).toHaveTextContent(i18n.t('tournament.partnerBadgeRally'))
    fireEvent.click(other)
    expect(onPartnerChange).toHaveBeenCalledWith(
      expect.objectContaining({ phase: 'selected', partner: expect.objectContaining({ id: 'p-2' }) }),
    )
  })

  it('without `self` no row is singled out', () => {
    mockUsePlayerSearch.mockReturnValue({
      results: [{ id: 'p-me', first_name: 'Dana', last_name: 'Levi', avatar_url: null }],
      isLoading: false,
      isActive: true,
    })
    renderSection({ phase: 'idle' })
    expect(screen.queryByTestId('partner-result-self')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Dana Levi/ })).not.toBeDisabled()
  })

  it.each(['501234567', '0501234567', '050-123-4567'])('blocks inviting my own number typed as %s', (typed) => {
    const onPartnerChange = renderSection({ phase: 'idle' }, vi.fn(), undefined, me)
    fill('Noa', 'Cohen', typed)

    expect(screen.getByRole('alert')).toHaveTextContent(i18n.t('tournament.partnerOwnPhoneError'))
    expect(inviteButton()).toBeDisabled()
    fireEvent.click(inviteButton())
    expect(onPartnerChange).not.toHaveBeenCalled()
  })

  it('lets the invite through once the number is someone else\'s', () => {
    const onPartnerChange = renderSection({ phase: 'idle' }, vi.fn(), undefined, me)
    fill('Noa', 'Cohen', '0501234567')
    expect(inviteButton()).toBeDisabled()

    fireEvent.change(screen.getByPlaceholderText(i18n.t('tournament.partnerMobileNumberPlaceholder')), {
      target: { value: '0501234568' },
    })
    expect(screen.queryByText(i18n.t('tournament.partnerOwnPhoneError'))).not.toBeInTheDocument()
    expect(inviteButton()).not.toBeDisabled()
    fireEvent.click(inviteButton())
    expect(onPartnerChange).toHaveBeenCalledWith({
      phase: 'selected',
      partner: { type: 'invite', firstName: 'Noa', lastName: 'Cohen', countryCode: '+972', phone: '0501234568' },
    })
  })

  it('my number under another dialling code is not mine', () => {
    renderSection({ phase: 'idle' }, vi.fn(), undefined, me)
    fill('Noa', 'Cohen', '501234567')
    expect(inviteButton()).toBeDisabled()

    fireEvent.change(screen.getByRole('combobox'), { target: { value: '+1' } })
    expect(screen.queryByText(i18n.t('tournament.partnerOwnPhoneError'))).not.toBeInTheDocument()
    expect(inviteButton()).not.toBeDisabled()
  })

  it('warns on my own name but never blocks: a namesake partner still submits', () => {
    const onPartnerChange = renderSection({ phase: 'idle' }, vi.fn(), undefined, me)
    fill(' dana ', 'LEVI', '0521112233')

    expect(screen.getByTestId('partner-invite-own-name')).toHaveTextContent(
      i18n.t('tournament.partnerOwnNameWarning'),
    )
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(inviteButton()).not.toBeDisabled()
    fireEvent.click(inviteButton())
    expect(onPartnerChange).toHaveBeenCalledWith({
      phase: 'selected',
      partner: { type: 'invite', firstName: ' dana ', lastName: 'LEVI', countryCode: '+972', phone: '0521112233' },
    })
  })

  it('shows no hint for a different name', () => {
    renderSection({ phase: 'idle' }, vi.fn(), undefined, me)
    fill('Dana', 'Cohen', '0521112233')
    expect(screen.queryByTestId('partner-invite-own-name')).not.toBeInTheDocument()
  })
})

describe('PartnerSection — find a partner in the app', () => {
  function renderWithFinder(state: PartnerSelectionState, lookingCount: number, onPress = vi.fn()) {
    render(
      <I18nextProvider i18n={i18n}>
        <PartnerSection selectionState={state} onPartnerChange={vi.fn()} findPartner={{ lookingCount, onPress }} />
      </I18nextProvider>,
    )
    return onPress
  }

  it('has no finder row unless the page offers one', () => {
    renderSection({ phase: 'idle' })
    expect(screen.queryByTestId('tournament-find-partner')).toBeNull()
  })

  it('pitches the finder while nobody is looking yet', () => {
    renderWithFinder({ phase: 'idle' }, 0)
    const row = screen.getByTestId('tournament-find-partner')
    expect(row).toHaveTextContent('No partner yet?')
    expect(row).toHaveTextContent('Players who fit this tournament, your community first')
    expect(row).toHaveTextContent('Find a partner')
  })

  it('says how many are looking once anyone is', () => {
    renderWithFinder({ phase: 'idle' }, 3)
    expect(screen.getByTestId('tournament-find-partner')).toHaveTextContent('3 players looking for a partner')
  })

  it('uses the singular for one player', () => {
    renderWithFinder({ phase: 'idle' }, 1)
    expect(screen.getByTestId('tournament-find-partner')).toHaveTextContent('1 player looking for a partner')
  })

  it('hands off on press', () => {
    const onPress = renderWithFinder({ phase: 'idle' }, 2)
    fireEvent.click(screen.getByRole('button', { name: /No partner yet\?/ }))
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it('is gone once a partner is picked', () => {
    renderWithFinder({ phase: 'selected', partner: { type: 'existing', id: 'p-2', displayName: 'Noa Cohen', avatarUrl: null } }, 2)
    expect(screen.queryByTestId('tournament-find-partner')).toBeNull()
  })
})
