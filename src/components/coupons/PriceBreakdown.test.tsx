import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PriceBreakdown } from './PriceBreakdown'

describe('PriceBreakdown', () => {
  it('renders each row label and value, in order', () => {
    render(
      <PriceBreakdown
        rows={[
          { key: 'fee', label: 'Entry fee', value: '₪150' },
          { key: 'discount', label: 'Coupon (SAVE10)', value: '-₪15', tone: 'success' },
          { key: 'total', label: 'Total due', value: '₪135', bold: true },
        ]}
      />,
    )
    expect(screen.getByText('Entry fee')).toBeInTheDocument()
    expect(screen.getByText('₪150')).toBeInTheDocument()
    expect(screen.getByText('Coupon (SAVE10)')).toBeInTheDocument()
    expect(screen.getByText('-₪15')).toBeInTheDocument()
    expect(screen.getByText('Total due')).toBeInTheDocument()
    expect(screen.getByText('₪135')).toBeInTheDocument()
  })
})
