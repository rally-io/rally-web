import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DeckToast, TOAST_MS } from './DeckToast'

describe('DeckToast', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('shows nothing without a toast', () => {
    render(<DeckToast toast={null} onDone={vi.fn()} />)
    expect(screen.queryByTestId('partner-toast')).toBeNull()
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  it('shows the line, then leaves after TOAST_MS', () => {
    const onDone = vi.fn()
    render(<DeckToast toast={{ id: 1, text: 'Link copied' }} onDone={onDone} />)
    expect(screen.getByTestId('partner-toast')).toHaveTextContent('Link copied')
    act(() => vi.advanceTimersByTime(TOAST_MS - 1))
    expect(onDone).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(1))
    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('the same text again restarts the clock', () => {
    const onDone = vi.fn()
    const { rerender } = render(<DeckToast toast={{ id: 1, text: 'Slow down' }} onDone={onDone} />)
    act(() => vi.advanceTimersByTime(TOAST_MS - 1000))
    rerender(<DeckToast toast={{ id: 2, text: 'Slow down' }} onDone={onDone} />)
    act(() => vi.advanceTimersByTime(TOAST_MS - 1))
    expect(onDone).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(1))
    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('a new parent callback does not restart the clock', () => {
    const toast = { id: 1, text: 'Link copied' }
    const first = vi.fn()
    const second = vi.fn()
    const { rerender } = render(<DeckToast toast={toast} onDone={first} />)
    act(() => vi.advanceTimersByTime(TOAST_MS - 1000))
    rerender(<DeckToast toast={toast} onDone={second} />)
    act(() => vi.advanceTimersByTime(1000))
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
  })
})
