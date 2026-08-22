import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import i18n from '@/i18n'

vi.mock('@/hooks/usePlayerSearch', () => ({ usePlayerSearch: vi.fn() }))

import { PartnerSection } from './PartnerSection'
import { usePlayerSearch } from '@/hooks/usePlayerSearch'
import type { PartnerSelectionState } from '@/types/partner'

const mockUsePlayerSearch = vi.mocked(usePlayerSearch)

function renderSection(state: PartnerSelectionState, onPartnerChange = vi.fn()) {
  render(
    <I18nextProvider i18n={i18n}>
      <PartnerSection selectionState={state} onPartnerChange={onPartnerChange} />
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
      results: [{ id: 'p-1', first_name: 'Dana', last_name: 'Levi', avatar_url: null }],
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
})
