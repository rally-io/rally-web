import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import i18n from '@/i18n'
import { PartnerActions } from './PartnerActions'

/* Ported from rally-mobile's PartnerActions.test.tsx. */

afterEach(async () => {
  await act(() => i18n.changeLanguage('en'))
})

describe('PartnerActions', () => {
  it('reads pass, undo, like from left to right in both languages (dir="ltr")', async () => {
    await act(() => i18n.changeLanguage('he'))
    render(<PartnerActions onPass={vi.fn()} onLike={vi.fn()} onUndo={vi.fn()} canUndo />)
    const order = screen.getAllByTestId(/^partner-(pass|undo|like)$/).map((el) => el.dataset.testid)
    expect(order).toEqual(['partner-pass', 'partner-undo', 'partner-like'])
    expect(screen.getByTestId('partner-actions')).toHaveAttribute('dir', 'ltr')
  })

  it('like is a padel ball, not a heart; each button is named', () => {
    render(<PartnerActions onPass={vi.fn()} onLike={vi.fn()} onUndo={vi.fn()} />)
    expect(within(screen.getByTestId('partner-like')).getByTestId('padel-ball')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Pass' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Like' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Undo pass' })).toBeTruthy()
  })

  it('calls pass, like and undo', () => {
    const onPass = vi.fn()
    const onLike = vi.fn()
    const onUndo = vi.fn()
    render(<PartnerActions onPass={onPass} onLike={onLike} onUndo={onUndo} canUndo />)
    fireEvent.click(screen.getByTestId('partner-pass'))
    fireEvent.click(screen.getByTestId('partner-like'))
    fireEvent.click(screen.getByTestId('partner-undo'))
    expect([onPass, onLike, onUndo].map((fn) => fn.mock.calls.length)).toEqual([1, 1, 1])
  })

  it('undo is disabled when there is nothing to undo', () => {
    const onUndo = vi.fn()
    render(<PartnerActions onPass={vi.fn()} onLike={vi.fn()} onUndo={onUndo} canUndo={false} />)
    fireEvent.click(screen.getByTestId('partner-undo'))
    expect(onUndo).not.toHaveBeenCalled()
    expect(screen.getByTestId('partner-undo')).toBeDisabled()
  })

  it('without onUndo (the detail drawer) there is no undo button', () => {
    render(<PartnerActions onPass={vi.fn()} onLike={vi.fn()} />)
    expect(screen.queryByTestId('partner-undo')).toBeNull()
  })

  it('disabled turns every button off', () => {
    render(<PartnerActions onPass={vi.fn()} onLike={vi.fn()} onUndo={vi.fn()} canUndo disabled />)
    for (const id of ['partner-pass', 'partner-undo', 'partner-like']) expect(screen.getByTestId(id)).toBeDisabled()
  })

  it('names the arrow keys only where they work', () => {
    const { rerender } = render(<PartnerActions onPass={vi.fn()} onLike={vi.fn()} keyShortcuts />)
    expect(screen.getByTestId('partner-pass')).toHaveAttribute('aria-keyshortcuts', 'ArrowLeft')
    expect(screen.getByTestId('partner-like')).toHaveAttribute('aria-keyshortcuts', 'ArrowRight')
    rerender(<PartnerActions onPass={vi.fn()} onLike={vi.fn()} />)
    expect(screen.getByTestId('partner-like')).not.toHaveAttribute('aria-keyshortcuts')
  })
})
