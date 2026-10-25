import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import i18n from '@/i18n'

vi.mock('@/services/api/tournaments', () => ({ leaveTournamentWaitlist: vi.fn() }))

import { useLeaveWaitlist } from './useLeaveWaitlist'
import { leaveTournamentWaitlist } from '@/services/api/tournaments'

const mockLeave = vi.mocked(leaveTournamentWaitlist)

beforeEach(() => vi.clearAllMocks())

function setup() {
  const refetch = vi.fn()
  const onLeft = vi.fn()
  const onEntryGone = vi.fn()
  const hook = renderHook(() => useLeaveWaitlist('t-1', { refetch, onLeft, onEntryGone }))
  return { ...hook, refetch, onLeft, onEntryGone }
}

describe('useLeaveWaitlist', () => {
  it('a successful leave tells the caller and refetches', async () => {
    mockLeave.mockResolvedValue({ success: true, data: { left: true } } as any)
    const { result, refetch, onLeft } = setup()
    await act(() => result.current.leave())
    expect(mockLeave).toHaveBeenCalledWith('t-1')
    expect(onLeft).toHaveBeenCalledOnce()
    expect(refetch).toHaveBeenCalledOnce()
    expect(result.current.leaveError).toBeNull()
  })

  it('a refusal because the entry is gone says so, tells the caller, and refetches', async () => {
    mockLeave.mockRejectedValue({
      status: 404, code: 'WAITLIST_ENTRY_NOT_FOUND', message: 'You are not on the waiting list',
    })
    const { result, refetch, onLeft, onEntryGone } = setup()
    await act(() => result.current.leave())
    expect(result.current.leaveError).toBe(i18n.t('tournament.registrationErrors.notOnWaitlist'))
    expect(onEntryGone).toHaveBeenCalledOnce()
    expect(onLeft).not.toHaveBeenCalled()
    expect(refetch).toHaveBeenCalledOnce()
  })

  it('a server refusal shows the server text and keeps the entry', async () => {
    mockLeave.mockRejectedValue({ status: 500, code: 'SERVER_ERROR', message: 'An unexpected error occurred' })
    const { result, refetch, onEntryGone } = setup()
    await act(() => result.current.leave())
    expect(result.current.leaveError).toBe('An unexpected error occurred')
    expect(onEntryGone).not.toHaveBeenCalled()
    expect(refetch).toHaveBeenCalledOnce()
  })

  it('a call that never reached the server says so and does not refetch', async () => {
    mockLeave.mockRejectedValue({ code: 'NETWORK_ERROR', message: 'Network error' })
    const { result, refetch } = setup()
    await act(() => result.current.leave())
    expect(result.current.leaveError).toBe(i18n.t('tournament.tournamentLeaveWaitlistFailed'))
    expect(refetch).not.toHaveBeenCalled()
    expect(result.current.isLeaving).toBe(false)
  })

  it('does nothing without a tournament id', async () => {
    const refetch = vi.fn()
    const { result } = renderHook(() => useLeaveWaitlist(undefined, { refetch }))
    await act(() => result.current.leave())
    expect(mockLeave).not.toHaveBeenCalled()
  })
})
