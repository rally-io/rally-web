import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@/i18n'
import { PartnerSection } from './PartnerSection'
import type { PartnerSelectionState } from '@/types/api'

function setup(state: PartnerSelectionState, onChange = vi.fn()) {
  const qc = new QueryClient()
  render(
    <QueryClientProvider client={qc}>
      <PartnerSection state={state} onChange={onChange} />
    </QueryClientProvider>,
  )
  return onChange
}

describe('PartnerSection', () => {
  it('idle shows search + invite form', () => {
    setup({ phase: 'idle' })
    expect(screen.getByPlaceholderText('Search by name or phone')).toBeInTheDocument()
    expect(screen.getByText('Invite someone not on the app')).toBeInTheDocument()
  })

  it('invite button disabled until valid', () => {
    setup({ phase: 'idle' })
    const btn = screen.getByRole('button', { name: 'Invite Partner' })
    expect(btn).toBeDisabled()
    fireEvent.change(screen.getByPlaceholderText('First name'), { target: { value: 'A' } })
    fireEvent.change(screen.getByPlaceholderText('Last name'), { target: { value: 'B' } })
    fireEvent.change(screen.getByPlaceholderText('Mobile number'), {
      target: { value: '5012345' },
    })
    expect(btn).toBeEnabled()
  })

  it('selected phase shows chip with remove', () => {
    const onChange = setup({
      phase: 'selected',
      partner: { type: 'existing', id: 'p1', displayName: 'Dana Levi' },
    })
    expect(screen.getByText('Dana Levi')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /remove/i }))
    expect(onChange).toHaveBeenCalledWith({ phase: 'idle' })
  })
})
