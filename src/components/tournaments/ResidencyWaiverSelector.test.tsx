import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import i18n from '@/i18n'
import { ResidencyWaiverSelector } from './ResidencyWaiverSelector'

describe('ResidencyWaiverSelector', () => {
  it('Scenario 1: returns null when no fee waiver and no document required', () => {
    const { container } = render(
      <ResidencyWaiverSelector
        seats={2}
        feeWaiverType={null}
        isDocumentRequired={false}
        residentCount={0}
        onSelectResidents={vi.fn()}
        myFiles={[]}
        onMyFilesChange={vi.fn()}
        partnerFiles={[]}
        onPartnerFilesChange={vi.fn()}
      />,
    )

    expect(container.firstChild).toBeNull()
  })

  it('Scenario 2: renders document upload with instructions and no waiver pills when document required without waiver', () => {
    render(
      <ResidencyWaiverSelector
        seats={2}
        feeWaiverType={null}
        isDocumentRequired={true}
        documentInstructions="Please upload your health certificate"
        residentCount={0}
        onSelectResidents={vi.fn()}
        myFiles={[]}
        onMyFilesChange={vi.fn()}
        partnerFiles={[]}
        onPartnerFilesChange={vi.fn()}
      />,
    )

    expect(screen.getByText(i18n.t('tournament.documentRequiredTitle'))).toBeInTheDocument()
    expect(screen.getByText('Details')).toBeInTheDocument()
    expect(screen.queryByText('Please upload your health certificate')).not.toBeInTheDocument()

    // Expand accordion to see instructions
    fireEvent.click(screen.getByTestId('documents-required-accordion-toggle'))
    expect(screen.getByText('Please upload your health certificate')).toBeInTheDocument()

    // No waiver pills
    expect(screen.queryByTestId('waiver-option-0')).not.toBeInTheDocument()
    // Both evidence pickers present for doubles
    expect(document.getElementById('tournament-evidence-1')).toBeInTheDocument()
    expect(document.getElementById('tournament-evidence-2')).toBeInTheDocument()
  })

  it('Scenario 3: renders dynamic waiver pills and NO evidence pickers when waiver added without document requirement', () => {
    const onSelect = vi.fn()
    render(
      <ResidencyWaiverSelector
        seats={2}
        feeWaiverType="club_member"
        isDocumentRequired={false}
        residentCount={1}
        onSelectResidents={onSelect}
        myFiles={[]}
        onMyFilesChange={vi.fn()}
        partnerFiles={[]}
        onPartnerFilesChange={vi.fn()}
      />,
    )

    // Formatted title: "Club Member Discount"
    expect(screen.getByText('Club Member Discount')).toBeInTheDocument()
    expect(screen.getByTestId('waiver-option-0')).toBeInTheDocument()
    expect(screen.getByTestId('waiver-option-1')).toBeInTheDocument()
    expect(screen.getByTestId('waiver-option-2')).toBeInTheDocument()
    // Clean option labels without duplicated (Club Member)
    expect(screen.getByText('One of us qualifies')).toBeInTheDocument()
    expect(screen.getByText('Both of us qualify')).toBeInTheDocument()

    // Crucial: NO file pickers rendered because isDocumentRequired is false
    expect(document.getElementById('tournament-evidence-1')).not.toBeInTheDocument()
    expect(document.getElementById('tournament-evidence-2')).not.toBeInTheDocument()

    fireEvent.click(screen.getByTestId('waiver-option-2'))
    expect(onSelect).toHaveBeenCalledWith(2)
  })

  it('Scenario 4: renders both dynamic waiver pills, evidence pickers, and expandable Details accordion (collapsed by default)', () => {
    render(
      <ResidencyWaiverSelector
        seats={2}
        feeWaiverType="club_member"
        isDocumentRequired={true}
        documentInstructions="Attach club member card"
        residentCount={2}
        onSelectResidents={vi.fn()}
        myFiles={[]}
        onMyFilesChange={vi.fn()}
        partnerFiles={[]}
        onPartnerFilesChange={vi.fn()}
      />,
    )

    expect(screen.getByText('Club Member Discount')).toBeInTheDocument()
    expect(screen.getByTestId('waiver-option-2')).toBeInTheDocument()
    expect(screen.getByText('Details')).toBeInTheDocument()
    expect(document.getElementById('tournament-evidence-1')).toBeInTheDocument()
    expect(document.getElementById('tournament-evidence-2')).toBeInTheDocument()

    // Accordion should be collapsed by default
    expect(screen.queryByTestId('documents-required-accordion-content')).not.toBeInTheDocument()
    expect(screen.queryByText('Attach club member card')).not.toBeInTheDocument()

    // Test accordion expand on click
    const accordionToggle = screen.getByTestId('documents-required-accordion-toggle')
    fireEvent.click(accordionToggle)
    expect(screen.getByTestId('documents-required-accordion-content')).toBeInTheDocument()
    expect(screen.getByText('Attach club member card')).toBeInTheDocument()

    // Test accordion collapse on second click
    fireEvent.click(accordionToggle)
    expect(screen.queryByTestId('documents-required-accordion-content')).not.toBeInTheDocument()
  })

  it('Holon resident: preserves Holon title when feeWaiverType is holon_resident', () => {
    render(
      <ResidencyWaiverSelector
        seats={1}
        feeWaiverType="holon_resident"
        isDocumentRequired={true}
        residentCount={1}
        onSelectResidents={vi.fn()}
        myFiles={[]}
        onMyFilesChange={vi.fn()}
        partnerFiles={[]}
        onPartnerFilesChange={vi.fn()}
      />,
    )

    expect(screen.getByText(i18n.t('tournament.waiverTitleHolon'))).toBeInTheDocument()
    expect(screen.getByText('I qualify')).toBeInTheDocument()
    expect(screen.queryByTestId('waiver-option-2')).not.toBeInTheDocument()
    expect(document.getElementById('tournament-evidence-1')).toBeInTheDocument()
  })
})
