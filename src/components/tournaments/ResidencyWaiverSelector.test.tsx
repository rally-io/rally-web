import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import i18n from '@/i18n'
import { ResidencyWaiverSelector } from './ResidencyWaiverSelector'

describe('ResidencyWaiverSelector', () => {
  it('renders None, One, Both options for doubles (seats = 2)', () => {
    const onSelect = vi.fn()
    render(
      <ResidencyWaiverSelector
        seats={2}
        residentCount={0}
        onSelectResidents={onSelect}
        myFiles={[]}
        onMyFilesChange={vi.fn()}
        partnerFiles={[]}
        onPartnerFilesChange={vi.fn()}
      />,
    )

    expect(screen.getByTestId('waiver-option-0')).toBeInTheDocument()
    expect(screen.getByTestId('waiver-option-1')).toBeInTheDocument()
    expect(screen.getByTestId('waiver-option-2')).toBeInTheDocument()
    expect(screen.getByText(i18n.t('corporate.reg.waiverNone'))).toBeInTheDocument()
    expect(screen.getByText(i18n.t('corporate.reg.waiverOneOfUs'))).toBeInTheDocument()
    expect(screen.getByText(i18n.t('corporate.reg.waiverBoth'))).toBeInTheDocument()
  })

  it('omits Both option for singles (seats = 1)', () => {
    const onSelect = vi.fn()
    render(
      <ResidencyWaiverSelector
        seats={1}
        residentCount={0}
        onSelectResidents={onSelect}
        myFiles={[]}
        onMyFilesChange={vi.fn()}
        partnerFiles={[]}
        onPartnerFilesChange={vi.fn()}
      />,
    )

    expect(screen.getByTestId('waiver-option-0')).toBeInTheDocument()
    expect(screen.getByTestId('waiver-option-1')).toBeInTheDocument()
    expect(screen.queryByTestId('waiver-option-2')).not.toBeInTheDocument()
    expect(screen.getByText(i18n.t('corporate.reg.waiverOne'))).toBeInTheDocument()
  })

  it('triggers onSelectResidents when clicking an option', () => {
    const onSelect = vi.fn()
    render(
      <ResidencyWaiverSelector
        seats={2}
        residentCount={0}
        onSelectResidents={onSelect}
        myFiles={[]}
        onMyFilesChange={vi.fn()}
        partnerFiles={[]}
        onPartnerFilesChange={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByTestId('waiver-option-1'))
    expect(onSelect).toHaveBeenCalledWith(1)
  })

  it('shows review warning banner and resident 1 evidence picker when residentCount is 1', () => {
    render(
      <ResidencyWaiverSelector
        seats={2}
        residentCount={1}
        onSelectResidents={vi.fn()}
        myFiles={[]}
        onMyFilesChange={vi.fn()}
        partnerFiles={[]}
        onPartnerFilesChange={vi.fn()}
      />,
    )

    expect(screen.getByText(i18n.t('corporate.reg.waiverReviewTitle'))).toBeInTheDocument()
    expect(document.getElementById('tournament-evidence-1')).toBeInTheDocument()
    expect(document.getElementById('tournament-evidence-2')).not.toBeInTheDocument()
  })

  it('shows both evidence pickers when residentCount is 2', () => {
    render(
      <ResidencyWaiverSelector
        seats={2}
        residentCount={2}
        onSelectResidents={vi.fn()}
        myFiles={[]}
        onMyFilesChange={vi.fn()}
        partnerFiles={[]}
        onPartnerFilesChange={vi.fn()}
      />,
    )

    expect(document.getElementById('tournament-evidence-1')).toBeInTheDocument()
    expect(document.getElementById('tournament-evidence-2')).toBeInTheDocument()
  })
})
