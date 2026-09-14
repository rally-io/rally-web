import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useSearchParams, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'

vi.mock('@/services/api/tournaments', () => ({ registerTournament: vi.fn() }))
vi.mock('@/services/api/payments', () => ({ confirmTournamentZeroPayment: vi.fn() }))

// A navigate spy that still records a post-unmount call even though there is
// no live Probe left to reflect it in `lastPath` — delegates to the real
// react-router navigate so every other test's `lastPath` assertions keep
// working unchanged.
const { navigateSpy } = vi.hoisted(() => ({ navigateSpy: vi.fn() }))
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => {
      const real = actual.useNavigate()
      return (...args: Parameters<typeof real>) => {
        navigateSpy(...args)
        return real(...args)
      }
    },
  }
})

import { useTournamentRegistration, buildRegisterPayload } from './useTournamentRegistration'
import { registerTournament } from '@/services/api/tournaments'
import { confirmTournamentZeroPayment } from '@/services/api/payments'

const mockRegister = vi.mocked(registerTournament)
const mockZero = vi.mocked(confirmTournamentZeroPayment)

let lastPath = ''
function Probe() {
  const loc = useLocation()
  const [sp] = useSearchParams()
  lastPath = `${loc.pathname}?${sp.toString()}`
  return null
}
function wrapper({ children }: { children: ReactNode }) {
  return (
    <MemoryRouter initialEntries={['/tournaments/t-1']}>
      <Routes>
        <Route path="*" element={<><Probe />{children}</>} />
      </Routes>
    </MemoryRouter>
  )
}
function gate(over: Record<string, unknown> = {}) {
  return {
    isSatisfied: true, payload: [], blocking: [], outstanding: [],
    selectedIds: new Set<string>(), toggle: vi.fn(), reset: vi.fn(),
    handleGateError: vi.fn(() => false), ...over,
  } as any
}
const T = { id: 't-1', format: 'doubles' } as any
const PARTNER = { phase: 'selected', partner: { type: 'existing', id: 'p-2', displayName: 'Dana' } } as const

beforeEach(() => { vi.clearAllMocks(); lastPath = '' })

describe('buildRegisterPayload', () => {
  it('sends partner_type none for singles', () => {
    expect(buildRegisterPayload('singles', { phase: 'idle' }, [])).toEqual({ partner_type: 'none', acknowledged_messages: [] })
  })
  it('maps an existing partner and an invited partner', () => {
    expect(buildRegisterPayload('doubles', PARTNER as any, [])).toEqual({ partner_type: 'existing', partner_player_id: 'p-2', acknowledged_messages: [] })
    const invite = { phase: 'selected', partner: { type: 'invite', firstName: 'A', lastName: 'B', countryCode: '+972', phone: '501234567' } } as any
    expect(buildRegisterPayload('mixed', invite, [{ id: 'm', version: 2 }])).toEqual({
      partner_type: 'invite', invite_first_name: 'A', invite_last_name: 'B', invite_country_code: '+972', invite_phone: '501234567',
      acknowledged_messages: [{ id: 'm', version: 2 }],
    })
  })
  it('does not add fee_waiver when omitted', () => {
    expect(buildRegisterPayload('singles', { phase: 'idle' }, [])).not.toHaveProperty('fee_waiver')
  })
  it('spreads fee_waiver into every partner variant when given', () => {
    const waiver = { type: 'holon_resident', resident_count: 1 } as const
    expect(buildRegisterPayload('singles', { phase: 'idle' }, [], waiver)).toEqual({
      partner_type: 'none', acknowledged_messages: [], fee_waiver: waiver,
    })
    expect(buildRegisterPayload('doubles', PARTNER as any, [], waiver)).toEqual({
      partner_type: 'existing', partner_player_id: 'p-2', acknowledged_messages: [], fee_waiver: waiver,
    })
    const invite = { phase: 'selected', partner: { type: 'invite', firstName: 'A', lastName: 'B', countryCode: '+972', phone: '501234567' } } as any
    expect(buildRegisterPayload('mixed', invite, [], waiver)).toEqual({
      partner_type: 'invite', invite_first_name: 'A', invite_last_name: 'B', invite_country_code: '+972', invite_phone: '501234567',
      acknowledged_messages: [], fee_waiver: waiver,
    })
  })
})

describe('useTournamentRegistration', () => {
  it('paid registration → /payment-method with amount, carrying return_to when given', async () => {
    mockRegister.mockResolvedValue({ success: true, data: { id: 'r-1', amount_to_pay: 150 } } as any)
    const { result } = renderHook(() => useTournamentRegistration(T, gate(), { returnTo: '/join/acme' }), { wrapper })
    await act(() => result.current.register(PARTNER as any))
    expect(mockRegister).toHaveBeenCalledWith('t-1', expect.objectContaining({ partner_type: 'existing' }))
    expect(lastPath).toBe('/payment-method?registration_id=r-1&tournament_id=t-1&amount=150&return_to=%2Fjoin%2Facme')
  })

  it('free registration → confirm-zero-payment → /payments/confirming', async () => {
    mockRegister.mockResolvedValue({ success: true, data: { id: 'r-1', amount_to_pay: 0 } } as any)
    mockZero.mockResolvedValue({ success: true, data: { confirmed: true } } as any)
    const { result } = renderHook(() => useTournamentRegistration(T, gate()), { wrapper })
    await act(() => result.current.register(PARTNER as any))
    expect(mockZero).toHaveBeenCalledWith('r-1')
    expect(lastPath).toBe('/payments/confirming?type=tournament_registration&id=r-1&tournament_id=t-1')
  })

  it('a 409 the gate recognises sets gateError and never navigates', async () => {
    mockRegister.mockRejectedValue({ code: 'ACKNOWLEDGMENT_REQUIRED', status: 409 })
    const g = gate({ handleGateError: vi.fn(() => true) })
    const { result } = renderHook(() => useTournamentRegistration(T, g), { wrapper })
    await act(() => result.current.register(PARTNER as any))
    expect(result.current.gateError).toMatch(/accept the tournament terms/i)
    expect(lastPath).toBe('/tournaments/t-1?')
  })

  it('TOURNAMENT_FULL with an onTournamentFull handler → full-line error and the callback', async () => {
    mockRegister.mockRejectedValue({ code: 'TOURNAMENT_FULL', status: 409, message: 'Tournament is full' })
    const onFull = vi.fn()
    const { result } = renderHook(() => useTournamentRegistration(T, gate(), { onTournamentFull: onFull }), { wrapper })
    await act(() => result.current.register(PARTNER as any))
    expect(onFull).toHaveBeenCalled()
    expect(result.current.registerError).toBeTruthy()
  })

  it('a backend message is translated into registerError', async () => {
    mockRegister.mockRejectedValue({ message: 'You are already registered for this tournament', status: 400 })
    const { result } = renderHook(() => useTournamentRegistration(T, gate()), { wrapper })
    await act(() => result.current.register(PARTNER as any))
    expect(result.current.registerError).toBeTruthy()
    expect(result.current.isRegistering).toBe(false)
  })

  // M2 — the club clears fee_waiver_type (or the tournament never had one)
  // while the form is open. Unlike most register_tournament errors this one
  // carries a distinct code, so it is translated by code, not by matching the
  // backend's English text.
  it('FEE_WAIVER_NOT_AVAILABLE shows a translated message, not the raw backend text', async () => {
    mockRegister.mockRejectedValue({
      code: 'FEE_WAIVER_NOT_AVAILABLE', status: 400,
      message: 'Fee waiver is not available for this tournament',
    })
    const { result } = renderHook(() => useTournamentRegistration(T, gate()), { wrapper })
    await act(() => result.current.register(PARTNER as any))
    expect(result.current.registerError).toBe(
      "The residents' discount isn't available for this tournament. Choose \"Not residents\" and try again.",
    )
    expect(result.current.registerError).not.toMatch(/Fee waiver is not available/)
  })

  it('passes skipProfileRedirect through to the API call only when set', async () => {
    mockRegister.mockResolvedValue({ success: true, data: { id: 'r-1', amount_to_pay: 10 } } as any)
    const { result } = renderHook(() => useTournamentRegistration(T, gate(), { skipProfileRedirect: true }), { wrapper })
    await act(() => result.current.register(PARTNER as any))
    expect(mockRegister).toHaveBeenCalledWith('t-1', expect.anything(), { skipProfileRedirect: true })
  })

  it('includes fee_waiver in the payload only when register() is called with one', async () => {
    mockRegister.mockResolvedValue({ success: true, data: { id: 'r-1', amount_to_pay: 150 } } as any)
    const { result } = renderHook(() => useTournamentRegistration(T, gate()), { wrapper })
    const waiver = { type: 'holon_resident' as const, resident_count: 2 as const }
    await act(() => result.current.register(PARTNER as any, waiver))
    expect(mockRegister).toHaveBeenCalledWith('t-1', expect.objectContaining({ fee_waiver: waiver }))

    mockRegister.mockClear()
    await act(() => result.current.register(PARTNER as any))
    const [, payloadWithoutWaiver] = mockRegister.mock.calls[0]
    expect(payloadWithoutWaiver).not.toHaveProperty('fee_waiver')
  })

  it('onRegistered receives the created registration', async () => {
    mockRegister.mockResolvedValue({ success: true, data: { id: 'r-1', amount_to_pay: 150, entry_fee: 30 } } as any)
    const onRegistered = vi.fn()
    const { result } = renderHook(() => useTournamentRegistration(T, gate(), { onRegistered }), { wrapper })
    await act(() => result.current.register(PARTNER as any))
    expect(onRegistered).toHaveBeenCalledWith(expect.objectContaining({ id: 'r-1', amount_to_pay: 150, entry_fee: 30 }))
  })

  it('waits for an async onRegistered before navigating', async () => {
    mockRegister.mockResolvedValue({ success: true, data: { id: 'r-1', amount_to_pay: 150 } } as any)
    let resolveOnRegistered: () => void = () => {}
    const onRegistered = vi.fn(
      () => new Promise<void>((resolve) => { resolveOnRegistered = resolve }),
    )
    const { result } = renderHook(() => useTournamentRegistration(T, gate(), { onRegistered }), { wrapper })

    let registerPromise!: Promise<void>
    act(() => {
      registerPromise = result.current.register(PARTNER as any)
    })

    // Flush the microtasks up through the registerTournament await, but not
    // past the still-pending onRegistered promise.
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(onRegistered).toHaveBeenCalledWith(expect.objectContaining({ id: 'r-1' }))
    expect(lastPath).toBe('/tournaments/t-1?')

    await act(async () => {
      resolveOnRegistered()
      await registerPromise
    })
    expect(lastPath).toBe('/payment-method?registration_id=r-1&tournament_id=t-1&amount=150')
  })

  it('does not navigate if the owner unmounts while onRegistered is still pending', async () => {
    mockRegister.mockResolvedValue({ success: true, data: { id: 'r-1', amount_to_pay: 150 } } as any)
    let resolveOnRegistered: () => void = () => {}
    const onRegistered = vi.fn(
      () => new Promise<void>((resolve) => { resolveOnRegistered = resolve }),
    )
    const { result, unmount } = renderHook(() => useTournamentRegistration(T, gate(), { onRegistered }), { wrapper })

    let registerPromise!: Promise<void>
    act(() => {
      registerPromise = result.current.register(PARTNER as any)
    })
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(onRegistered).toHaveBeenCalled()

    // Simulates TournamentDetailPage remounting on an account change while
    // the evidence upload is still in flight — the in-flight register must
    // not push a new owner to a payment page for a row it doesn't own.
    unmount()
    resolveOnRegistered()
    await registerPromise
    expect(navigateSpy).not.toHaveBeenCalled()
  })

  it('an onRegistered that rejects still navigates — an evidence-upload failure must never strand the registration', async () => {
    mockRegister.mockResolvedValue({ success: true, data: { id: 'r-1', amount_to_pay: 0 } } as any)
    mockZero.mockResolvedValue({ success: true, data: { confirmed: true } } as any)
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const onRegistered = vi.fn().mockRejectedValue(new Error('evidence upload failed'))
    const { result } = renderHook(() => useTournamentRegistration(T, gate(), { onRegistered }), { wrapper })
    await act(() => result.current.register(PARTNER as any))
    expect(onRegistered).toHaveBeenCalled()
    expect(consoleErrorSpy).toHaveBeenCalled()
    expect(mockZero).toHaveBeenCalledWith('r-1')
    expect(lastPath).toBe('/payments/confirming?type=tournament_registration&id=r-1&tournament_id=t-1')
    consoleErrorSpy.mockRestore()
  })
})
