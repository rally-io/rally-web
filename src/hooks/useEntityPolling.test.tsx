import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

vi.mock('@/services/api/bookings', () => ({
  getBooking: vi.fn(),
}))
vi.mock('@/services/api/tournaments', () => ({
  getRegistration: vi.fn(),
}))
vi.mock('@/services/api/events', () => ({
  getEvent: vi.fn(),
}))

import { useEntityPolling } from './useEntityPolling'
import { getBooking } from '@/services/api/bookings'
import { getRegistration } from '@/services/api/tournaments'
import { getEvent } from '@/services/api/events'

const mockGetBooking = vi.mocked(getBooking)
const mockGetRegistration = vi.mocked(getRegistration)
const mockGetEvent = vi.mocked(getEvent)

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  return (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
})

describe('useEntityPolling — booking', () => {
  it('returns confirmed when the first poll already sees status=confirmed', async () => {
    mockGetBooking.mockResolvedValue({
      success: true,
      data: { id: 'b-1', status: 'confirmed', payment_status: 'completed' },
      meta: null,
      error: null,
    } as any)

    const { result } = renderHook(
      () => useEntityPolling({ type: 'booking', entityId: 'b-1' }),
      { wrapper },
    )

    await vi.waitFor(() => {
      expect(result.current.status).toBe('confirmed')
    })
    expect(mockGetBooking).toHaveBeenCalledWith('b-1')
  })

  it('returns confirmed when payment_status flips first', async () => {
    mockGetBooking.mockResolvedValue({
      success: true,
      data: { id: 'b-1', status: 'pending', payment_status: 'completed' },
      meta: null,
      error: null,
    } as any)

    const { result } = renderHook(
      () => useEntityPolling({ type: 'booking', entityId: 'b-1' }),
      { wrapper },
    )

    await vi.waitFor(() => {
      expect(result.current.status).toBe('confirmed')
    })
  })
})

describe('useEntityPolling — tournament_registration', () => {
  it('routes to getRegistration with tournamentId', async () => {
    mockGetRegistration.mockResolvedValue({
      success: true,
      data: { id: 'r-1', status: 'confirmed', payment_status: 'completed' },
      meta: null,
      error: null,
    } as any)

    const { result } = renderHook(
      () =>
        useEntityPolling({
          type: 'tournament_registration',
          entityId: 'r-1',
          tournamentId: 't-1',
        }),
      { wrapper },
    )

    await vi.waitFor(() => {
      expect(result.current.status).toBe('confirmed')
    })
    expect(mockGetRegistration).toHaveBeenCalledWith('t-1', 'r-1')
  })
})

describe('useEntityPolling — event_participation', () => {
  it('routes to getEvent and confirms on joined=true', async () => {
    mockGetEvent.mockResolvedValue({
      success: true,
      data: { id: 'e-1', joined: true },
      meta: null,
      error: null,
    } as any)

    const { result } = renderHook(
      () =>
        useEntityPolling({
          type: 'event_participation',
          entityId: 'p-1',
          eventId: 'e-1',
        }),
      { wrapper },
    )

    await vi.waitFor(() => {
      expect(result.current.status).toBe('confirmed')
    })
    expect(mockGetEvent).toHaveBeenCalledWith('e-1')
  })
})

describe('useEntityPolling — error fallback', () => {
  it('treats two consecutive fetch errors as confirmed only after at least one successful poll', async () => {
    // First: a successful poll that doesn't confirm.
    mockGetBooking.mockResolvedValueOnce({
      success: true,
      data: { id: 'b-1', status: 'payment_pending', payment_status: null },
      meta: null,
      error: null,
    } as any)
    // Then two failures — error fallback should fire after the second.
    mockGetBooking
      .mockResolvedValueOnce({
        success: false,
        error: { code: 'BOOM', message: 'boom', details: null },
      } as any)
      .mockResolvedValueOnce({
        success: false,
        error: { code: 'BOOM', message: 'boom', details: null },
      } as any)

    const { result } = renderHook(
      () => useEntityPolling({ type: 'booking', entityId: 'b-1' }),
      { wrapper },
    )

    // First poll: success but unconfirmed — stay polling.
    await vi.waitFor(() => {
      expect(mockGetBooking).toHaveBeenCalledTimes(1)
    })
    await vi.advanceTimersByTimeAsync(3000)
    await vi.waitFor(() => {
      expect(mockGetBooking).toHaveBeenCalledTimes(2)
    })
    await vi.advanceTimersByTimeAsync(3000)
    await vi.waitFor(() => {
      expect(mockGetBooking).toHaveBeenCalledTimes(3)
    })
    // After the success + 2 consecutive errors, fallback fires → confirmed.
    await vi.waitFor(() => {
      expect(result.current.status).toBe('confirmed')
    })
  })

  it('does NOT treat two consecutive errors as confirmed when no prior success exists', async () => {
    mockGetBooking.mockResolvedValue({
      success: false,
      error: { code: 'BOOM', message: 'boom', details: null },
    } as any)

    const { result } = renderHook(
      () => useEntityPolling({ type: 'booking', entityId: 'b-1' }),
      { wrapper },
    )

    // Initial mount fires the first query.
    await vi.waitFor(() => expect(mockGetBooking).toHaveBeenCalledTimes(1))
    // Drive through 10 refetch intervals. With no prior success the error
    // fallback does NOT fire; after 10 attempts the hook transitions to 'timeout'.
    // Note: the 10th query completion triggers the timeout effect which disables
    // the query, so the 11th interval does not produce a new call.
    for (let i = 0; i < 10; i++) {
      await vi.advanceTimersByTimeAsync(3000)
    }
    await vi.waitFor(() => {
      expect(result.current.status).toBe('timeout')
    })
  })
})

describe('useEntityPolling — timeout', () => {
  it('returns timeout after 10 attempts of unconfirmed but valid data', async () => {
    mockGetBooking.mockResolvedValue({
      success: true,
      data: { id: 'b-1', status: 'payment_pending', payment_status: null },
      meta: null,
      error: null,
    } as any)

    const { result } = renderHook(
      () => useEntityPolling({ type: 'booking', entityId: 'b-1' }),
      { wrapper },
    )

    // Drive through 10 attempts of 3 seconds each.
    for (let i = 0; i < 10; i++) {
      await vi.advanceTimersByTimeAsync(3000)
    }
    await vi.waitFor(() => {
      expect(result.current.status).toBe('timeout')
    })
  })
})

describe('useEntityPolling — tournament pre-auth hold (G2)', () => {
  it('confirms when payment_status=payment_held though status stays registered', async () => {
    mockGetRegistration.mockResolvedValue({
      success: true,
      data: { id: 'r-1', status: 'registered', payment_status: 'payment_held' },
      meta: null,
      error: null,
    } as any)

    const { result } = renderHook(
      () => useEntityPolling({ type: 'tournament_registration', entityId: 'r-1', tournamentId: 't-1' }),
      { wrapper },
    )

    await vi.waitFor(() => {
      expect(result.current.status).toBe('confirmed')
    })
    expect(result.current.entity).toMatchObject({ payment_status: 'payment_held' })
  })

  it('stays polling then times out for a still-pending registration', async () => {
    mockGetRegistration.mockResolvedValue({
      success: true,
      data: { id: 'r-1', status: 'registered', payment_status: 'pending' },
      meta: null,
      error: null,
    } as any)

    const { result } = renderHook(
      () => useEntityPolling({ type: 'tournament_registration', entityId: 'r-1', tournamentId: 't-1' }),
      { wrapper },
    )

    for (let i = 0; i < 10; i++) {
      await vi.advanceTimersByTimeAsync(3000)
    }
    await vi.waitFor(() => {
      expect(result.current.status).toBe('timeout')
    })
  })
})