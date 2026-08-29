import type { ReactNode } from 'react'
import { act, renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useRegistrationGate } from '../hooks/useRegistrationGate'
import type { GateAction, ScreenMessage } from '../types'

// useRegistrationGate reads messages through useScreenMessages — mock that,
// not the underlying API call, so this file is a pure unit test of the
// gate's own state machine (mirrors the mocking level ScreenMessageCard.test.tsx
// uses for useMessageActions).
const mockUseScreenMessages = vi.fn()
vi.mock('../hooks/useScreenMessages', () => ({
  useScreenMessages: (...args: unknown[]) => mockUseScreenMessages(...args),
}))

function gatingMessage(overrides: Partial<ScreenMessage> = {}): ScreenMessage {
  return {
    id: 'msg-1',
    version: 3,
    kind: 'terms',
    display_mode: 'inline',
    title: 'Tournament terms',
    body: 'Please read the rules before registering.',
    is_dismissible: false,
    requires_acknowledgment: true,
    gate_actions: ['tournament_registration'],
    is_acknowledged: false,
    acknowledged_at: null,
    ...overrides,
  }
}

function renderGate(messages: ScreenMessage[], action: GateAction = 'tournament_registration') {
  mockUseScreenMessages.mockReturnValue({ data: messages, isLoading: false, isError: false })
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
  function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
  const { result, rerender } = renderHook(
    () => useRegistrationGate({ scope: 'tournament', id: 't-1' }, action),
    { wrapper },
  )
  return { result, invalidateSpy, rerender }
}

beforeEach(() => {
  mockUseScreenMessages.mockReset()
})

describe('useRegistrationGate', () => {
  it('payload contains exactly the ticked {id, version} pairs', () => {
    const gating = gatingMessage({ id: 'msg-1', version: 3 })
    const otherGating = gatingMessage({ id: 'msg-2', version: 9 })
    const { result } = renderGate([gating, otherGating])

    act(() => result.current.toggle('msg-1', 3))
    expect(result.current.payload).toEqual([{ id: 'msg-1', version: 3 }])

    // Ticking a second one adds to the payload, not replaces it.
    act(() => result.current.toggle('msg-2', 9))
    expect(result.current.payload).toEqual(
      expect.arrayContaining([
        { id: 'msg-1', version: 3 },
        { id: 'msg-2', version: 9 },
      ]),
    )
    expect(result.current.payload).toHaveLength(2)

    // Untoggling removes it again.
    act(() => result.current.toggle('msg-1', 3))
    expect(result.current.payload).toEqual([{ id: 'msg-2', version: 9 }])
  })

  it('isSatisfied is false with an unticked gating message and true once ticked', () => {
    const gating = gatingMessage({ id: 'msg-1', version: 3 })
    const { result } = renderGate([gating])
    expect(result.current.isSatisfied).toBe(false)

    act(() => result.current.toggle('msg-1', 3))
    expect(result.current.isSatisfied).toBe(true)
  })

  it('isSatisfied is true when there are no gating messages at all', () => {
    const { result } = renderGate([])
    expect(result.current.isSatisfied).toBe(true)
    expect(result.current.blocking).toEqual([])
  })

  it('isSatisfied ignores a message that requires acknowledgment but does not gate this action', () => {
    const nonGating = gatingMessage({ id: 'msg-1', gate_actions: ['court_booking'] })
    const { result } = renderGate([nonGating])
    expect(result.current.blocking).toEqual([])
    expect(result.current.isSatisfied).toBe(true)
  })

  it('handleGateError returns false for an unrelated error, so the existing error path still runs', () => {
    const { result } = renderGate([])
    let consumed = true
    act(() => {
      consumed = result.current.handleGateError({ code: 'SERVER_ERROR', message: 'boom' })
    })
    expect(consumed).toBe(false)
  })

  it('handleGateError returns true for ACKNOWLEDGMENT_REQUIRED, clears ticks, invalidates the list, and records the outstanding messages', () => {
    const gating = gatingMessage({ id: 'msg-1', version: 3 })
    const { result, invalidateSpy } = renderGate([gating])

    act(() => result.current.toggle('msg-1', 3))
    expect(result.current.selectedIds.has('msg-1')).toBe(true)

    let consumed = false
    act(() => {
      consumed = result.current.handleGateError({
        code: 'ACKNOWLEDGMENT_REQUIRED',
        message: 'Acknowledgment required',
        details: { messages: [{ id: 'msg-1', version: 4, title: 'Tournament terms' }] },
      })
    })

    expect(consumed).toBe(true)
    // Never auto-tick after a 409 — the player hasn't seen the new text.
    expect(result.current.selectedIds.has('msg-1')).toBe(false)
    expect(result.current.outstanding).toEqual([
      { id: 'msg-1', version: 4, title: 'Tournament terms' },
    ])
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['screenMessages'] })
  })

  it('a malformed details.messages on the 409 still consumes the error but yields no outstanding entries to scroll to', () => {
    const { result } = renderGate([])
    let consumed = false
    act(() => {
      consumed = result.current.handleGateError({
        code: 'ACKNOWLEDGMENT_REQUIRED',
        details: 'not-an-object',
      })
    })
    expect(consumed).toBe(true)
    expect(result.current.outstanding).toEqual([])
  })

  it('reset() clears both ticks and outstanding', () => {
    const gating = gatingMessage({ id: 'msg-1', version: 3 })
    const { result } = renderGate([gating])
    act(() => result.current.toggle('msg-1', 3))
    act(() => {
      result.current.handleGateError({
        code: 'ACKNOWLEDGMENT_REQUIRED',
        details: { messages: [{ id: 'msg-1', version: 4, title: 'Tournament terms' }] },
      })
    })
    expect(result.current.outstanding).toHaveLength(1)

    act(() => result.current.reset())
    expect(result.current.selectedIds.size).toBe(0)
    expect(result.current.outstanding).toEqual([])
  })

  // Review finding 2: a sibling card's Accept/Dismiss on the same page also
  // invalidates ['screenMessages'], which can land a bumped version for a
  // message the player already ticked, between tick and submit. The payload
  // must still carry the version that was current WHEN IT WAS TICKED — that's
  // what lets assert_gate_satisfied correctly fail to match and 409 it, so
  // the player re-reads the new text instead of silently accepting it.
  it('captures the version at tick time — a later version bump in the live query data does not change the payload', () => {
    const gating = gatingMessage({ id: 'msg-1', version: 3 })
    const { result, rerender } = renderGate([gating])

    act(() => result.current.toggle('msg-1', 3))
    expect(result.current.payload).toEqual([{ id: 'msg-1', version: 3 }])

    // The query refetches with a bumped version for the SAME message id.
    mockUseScreenMessages.mockReturnValue({
      data: [gatingMessage({ id: 'msg-1', version: 4 })],
      isLoading: false,
      isError: false,
    })
    rerender()

    // Still considered ticked (same id) — but the payload keeps the OLD
    // version, not the live one.
    expect(result.current.selectedIds.has('msg-1')).toBe(true)
    expect(result.current.payload).toEqual([{ id: 'msg-1', version: 3 }])
  })

  it('is not satisfied while the messages query is loading, even with no known blocking messages yet', () => {
    mockUseScreenMessages.mockReturnValue({ data: undefined, isLoading: true, isError: false })
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    const { result } = renderHook(
      () => useRegistrationGate({ scope: 'tournament', id: 't-1' }, 'tournament_registration'),
      {
        wrapper: ({ children }: { children: ReactNode }) => (
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        ),
      },
    )
    expect(result.current.blocking).toEqual([])
    expect(result.current.isSatisfied).toBe(false)
  })

  it('IS satisfied when the messages query has errored — fail open, not closed', () => {
    // [2026-08-29 review] This used to assert `false`, and that was an outage
    // waiting to happen: `blocking` is [] on error and the reason text is driven
    // by `blocking.length > 0`, so a failing /messages endpoint disabled Register
    // on EVERY tournament page with nothing on screen explaining why —
    // permanently, since refetchOnWindowFocus is off. Deploying the web app
    // before the screen_messages DDL exists (the default here, since nothing runs
    // `alembic upgrade`) would have killed 100% of web registrations.
    //
    // Failing open is safe because THIS IS NOT THE GATE. `assert_gate_satisfied`
    // inside the register transaction is; if terms are genuinely outstanding the
    // POST 409s and `handleGateError` renders the checkbox. Worst case here is
    // one refused registration with a clear reason, versus silent and total.
    mockUseScreenMessages.mockReturnValue({ data: undefined, isLoading: false, isError: true })
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    const { result } = renderHook(
      () => useRegistrationGate({ scope: 'tournament', id: 't-1' }, 'tournament_registration'),
      {
        wrapper: ({ children }: { children: ReactNode }) => (
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        ),
      },
    )
    expect(result.current.isSatisfied).toBe(true)
    expect(result.current.blocking).toEqual([])
  })

  it('is satisfied once loading finishes with no gating messages — the fail-closed window is loading only, not permanent', () => {
    mockUseScreenMessages.mockReturnValue({ data: undefined, isLoading: true, isError: false })
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    const { result, rerender } = renderHook(
      () => useRegistrationGate({ scope: 'tournament', id: 't-1' }, 'tournament_registration'),
      {
        wrapper: ({ children }: { children: ReactNode }) => (
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        ),
      },
    )
    expect(result.current.isSatisfied).toBe(false)

    mockUseScreenMessages.mockReturnValue({ data: [], isLoading: false, isError: false })
    rerender()
    expect(result.current.isSatisfied).toBe(true)
  })
})
