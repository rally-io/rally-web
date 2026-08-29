import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ScreenMessageCard } from '../components/ScreenMessageCard'
import { acknowledgeMessage } from '../api/messages'
import type { ScreenMessage } from '../types'
import type { FlatApiError } from '../hooks/useMessageActions'

// Component-level test: mock the mutation hooks directly (this repo's norm —
// see ParticipantsSection.test.tsx — rather than wiring a real QueryClient).
// The two mutation-error-handling tests below are the exception: they need
// the REAL useMessageActions hook (so the onError -> invalidateQueries side
// effect actually runs), so they unmock this module and re-import fresh.
const mockAcknowledgeMutate = vi.fn()
const mockDismissMutate = vi.fn()
const acknowledgeState: { isPending: boolean; error: FlatApiError | null } = {
  isPending: false,
  error: null,
}
const dismissState: { isPending: boolean; error: FlatApiError | null } = {
  isPending: false,
  error: null,
}

vi.mock('../hooks/useMessageActions', () => ({
  useAcknowledgeMessage: () => ({
    mutateAsync: mockAcknowledgeMutate,
    isPending: acknowledgeState.isPending,
    error: acknowledgeState.error,
  }),
  useDismissMessage: () => ({
    mutateAsync: mockDismissMutate,
    isPending: dismissState.isPending,
    error: dismissState.error,
  }),
}))

vi.mock('../api/messages', () => ({
  acknowledgeMessage: vi.fn(),
  dismissMessage: vi.fn(),
}))

const mockSession: { current: { id: string } | null } = { current: null }
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ session: mockSession.current }),
}))

const mockRequireSignIn = vi.fn()
vi.mock('@/hooks/useAuthGate', () => ({
  useAuthGate: () => ({ requireSignIn: mockRequireSignIn }),
}))

function baseMessage(overrides: Partial<ScreenMessage> = {}): ScreenMessage {
  return {
    id: 'msg-1',
    // Deliberately not 1 — the "not a hardcoded 1" assertion is meaningless
    // against a fixture where the real version happens to equal the bug.
    version: 7,
    kind: 'info',
    // The API's display_mode is 'modal' by default in every fixture here —
    // every test in this file therefore also proves rule 1 (inline
    // regardless) at zero extra cost.
    display_mode: 'modal',
    title: 'Court closed for maintenance',
    body: 'The east courts will be closed this weekend.',
    is_dismissible: false,
    requires_acknowledgment: false,
    gate_actions: [],
    is_acknowledged: false,
    acknowledged_at: null,
    ...overrides,
  }
}

beforeEach(() => {
  mockAcknowledgeMutate.mockReset()
  mockDismissMutate.mockReset()
  acknowledgeState.isPending = false
  acknowledgeState.error = null
  dismissState.isPending = false
  dismissState.error = null
  mockRequireSignIn.mockReset()
  mockRequireSignIn.mockResolvedValue(undefined)
  mockSession.current = { id: 'user-1' } // signed in by default
})

describe('ScreenMessageCard', () => {
  it('renders title and body inline, ignoring display_mode: modal', () => {
    render(<ScreenMessageCard message={baseMessage()} />)
    expect(screen.getByText('Court closed for maintenance')).toBeInTheDocument()
    expect(screen.getByText('The east courts will be closed this weekend.')).toBeInTheDocument()
    // No blocking surface — nothing modal ever renders in this slice.
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows the accept button only when required and unacknowledged', () => {
    const { rerender } = render(
      <ScreenMessageCard
        message={baseMessage({ requires_acknowledgment: true, is_acknowledged: false })}
      />,
    )
    expect(screen.getByRole('button', { name: 'Accept' })).toBeInTheDocument()

    rerender(<ScreenMessageCard message={baseMessage({ requires_acknowledgment: false })} />)
    expect(screen.queryByRole('button', { name: 'Accept' })).not.toBeInTheDocument()
  })

  it('clicking accept (already signed in) calls the mutation with the message id and its own version', () => {
    render(
      <ScreenMessageCard
        message={baseMessage({ requires_acknowledgment: true, is_acknowledged: false, version: 7 })}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Accept' }))
    expect(mockAcknowledgeMutate).toHaveBeenCalledWith({ messageId: 'msg-1', version: 7 })
    // Already signed in — the gate must not be consulted at all.
    expect(mockRequireSignIn).not.toHaveBeenCalled()
  })

  it('an acknowledged message renders the confirmed state and no accept button', () => {
    render(
      <ScreenMessageCard
        message={baseMessage({ requires_acknowledgment: true, is_acknowledged: true })}
      />,
    )
    expect(screen.getByText('Accepted')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Accept' })).not.toBeInTheDocument()
  })

  it('offers dismiss when dismissible, and withholds it on a gating message', () => {
    const { rerender } = render(
      <ScreenMessageCard message={baseMessage({ is_dismissible: true })} />,
    )
    expect(screen.getByRole('button', { name: 'Dismiss' })).toBeInTheDocument()

    // A gating message: dismissal is refused server-side, so the control
    // must never be offered — same flag, no cross-check against
    // requires_acknowledgment needed because the API never sets both.
    rerender(<ScreenMessageCard message={baseMessage({ is_dismissible: false })} />)
    expect(screen.queryByRole('button', { name: 'Dismiss' })).not.toBeInTheDocument()
  })

  describe('anonymous viewer', () => {
    it('sees the message and the accept control (not hidden)', () => {
      mockSession.current = null
      render(
        <ScreenMessageCard
          message={baseMessage({ requires_acknowledgment: true, is_acknowledged: false })}
        />,
      )
      expect(screen.getByText('Court closed for maintenance')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Accept' })).toBeInTheDocument()
    })

    it('clicking accept triggers requireSignIn and completes the acceptance only after the gate resolves', async () => {
      mockSession.current = null
      let resolveGate: () => void = () => {}
      mockRequireSignIn.mockReturnValue(
        new Promise<void>((resolve) => {
          resolveGate = resolve
        }),
      )

      render(
        <ScreenMessageCard
          message={baseMessage({ requires_acknowledgment: true, is_acknowledged: false, version: 7 })}
        />,
      )
      fireEvent.click(screen.getByRole('button', { name: 'Accept' }))

      await waitFor(() => expect(mockRequireSignIn).toHaveBeenCalledTimes(1))
      // Gate is still pending — acceptance must not fire early.
      expect(mockAcknowledgeMutate).not.toHaveBeenCalled()

      resolveGate()
      await waitFor(() =>
        expect(mockAcknowledgeMutate).toHaveBeenCalledWith({ messageId: 'msg-1', version: 7 }),
      )
    })

    it('never sees Dismiss on a dismissible message (chosen fix: hide, not gate — see ScreenMessageCard.tsx)', () => {
      mockSession.current = null
      render(<ScreenMessageCard message={baseMessage({ is_dismissible: true })} />)
      // Anonymous + dismissible would otherwise render Dismiss with no session
      // check: click -> POST with no token -> silent 403. Hiding the control
      // is the chosen fix (see the comment above showDismiss), so it must
      // never be clickable, and the gate must never even be consulted.
      expect(screen.queryByRole('button', { name: 'Dismiss' })).not.toBeInTheDocument()
      expect(mockRequireSignIn).not.toHaveBeenCalled()
    })
  })

  it("carries dir='auto' on the message content, so the author's own language decides", () => {
    // No stored locale to render from — the browser reads direction off the first
    // strong character the author actually typed. A Hebrew notice renders RTL
    // inside an English page and vice versa, with no language field to get wrong.
    render(<ScreenMessageCard message={baseMessage({ body: '\u05d6\u05d4\u05d5 \u05d4\u05d5\u05d3\u05e2\u05d4 \u05d1\u05e2\u05d1\u05e8\u05d9\u05ea' })} />)
    const body = screen.getByText('\u05d6\u05d4\u05d5 \u05d4\u05d5\u05d3\u05e2\u05d4 \u05d1\u05e2\u05d1\u05e8\u05d9\u05ea')
    expect(body.closest('[dir]')).toHaveAttribute('dir', 'auto')
  })

  describe('registration gate (selection prop)', () => {
    // `selection` is only ever passed by a page enforcing a gate (today:
    // TournamentDetailPage). These tests exercise the third branch it adds
    // alongside accept/confirmed — see the comment above `showCheckbox` in
    // ScreenMessageCard.tsx.
    function selection(
      overrides: Partial<{
        selectedIds: Set<string>
        onToggle: (id: string, version: number) => void
      }> = {},
    ) {
      return {
        action: 'tournament_registration' as const,
        selectedIds: overrides.selectedIds ?? new Set<string>(),
        onToggle: overrides.onToggle ?? vi.fn<(id: string, version: number) => void>(),
      }
    }

    it('renders a checkbox, not the Accept button, when selection is given and the message gates that action', () => {
      render(
        <ScreenMessageCard
          message={baseMessage({
            requires_acknowledgment: true,
            is_acknowledged: false,
            gate_actions: ['tournament_registration'],
          })}
          selection={selection()}
        />,
      )
      expect(screen.getByRole('checkbox')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Accept' })).not.toBeInTheDocument()
    })

    it('still renders the Accept button when selection is given but the message does not gate that action', () => {
      render(
        <ScreenMessageCard
          message={baseMessage({
            requires_acknowledgment: true,
            is_acknowledged: false,
            gate_actions: ['court_booking'],
          })}
          selection={selection()}
        />,
      )
      expect(screen.getByRole('button', { name: 'Accept' })).toBeInTheDocument()
      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    })

    it('ticking the checkbox never calls the acknowledge mutation — the orphan-receipt regression', () => {
      const onToggle = vi.fn<(id: string, version: number) => void>()
      render(
        <ScreenMessageCard
          message={baseMessage({
            id: 'msg-1',
            version: 4,
            requires_acknowledgment: true,
            is_acknowledged: false,
            gate_actions: ['tournament_registration'],
          })}
          selection={selection({ onToggle })}
        />,
      )
      fireEvent.click(screen.getByRole('checkbox'))
      // The card reports the tick up to the page — it must never call the API
      // itself. assert_gate_satisfied writes the receipt from the register
      // request; a POST here would record acceptance for a registration that
      // might still fail.
      expect(onToggle).toHaveBeenCalledWith('msg-1', 4)
      expect(mockAcknowledgeMutate).not.toHaveBeenCalled()
      // Belt and suspenders: not just the mutation hook unused, but the raw
      // API call it wraps too — catches a regression that bypasses the
      // mutation entirely and POSTs straight from the card.
      expect(vi.mocked(acknowledgeMessage)).not.toHaveBeenCalled()
    })

    it('shows a Required badge on a blocking, unticked message, and hides it once ticked', () => {
      const gatingMessage = baseMessage({
        id: 'msg-1',
        requires_acknowledgment: true,
        is_acknowledged: false,
        gate_actions: ['tournament_registration'],
      })
      const { rerender } = render(
        <ScreenMessageCard message={gatingMessage} selection={selection()} />,
      )
      expect(screen.getByText('Required')).toBeInTheDocument()
      expect(screen.getByRole('checkbox')).toHaveAttribute('aria-required', 'true')

      rerender(
        <ScreenMessageCard
          message={gatingMessage}
          selection={selection({ selectedIds: new Set(['msg-1']) })}
        />,
      )
      expect(screen.queryByText('Required')).not.toBeInTheDocument()
    })
  })

  describe('mutation error handling', () => {
    // These two need the REAL useMessageActions hook, not the mocked
    // stand-in above — the assertion is that onError's invalidateQueries
    // side effect actually runs, and a mocked mutate() can't exercise that.
    // Unmock the module and reset the module registry so a dynamic re-import
    // of ScreenMessageCard binds to the real hook; '../api/messages' stays
    // mocked (registered at the top of this file) so no real HTTP call is
    // ever made — only its resolved/rejected value is controlled per test.
    beforeEach(() => {
      vi.doUnmock('../hooks/useMessageActions')
      vi.resetModules()
    })

    afterEach(() => {
      vi.doMock('../hooks/useMessageActions', () => ({
        useAcknowledgeMessage: () => ({
          mutateAsync: mockAcknowledgeMutate,
          isPending: acknowledgeState.isPending,
          error: acknowledgeState.error,
        }),
        useDismissMessage: () => ({
          mutateAsync: mockDismissMutate,
          isPending: dismissState.isPending,
          error: dismissState.error,
        }),
      }))
    })

    async function renderWithRealHook(message: ScreenMessage) {
      const { ScreenMessageCard: RealCard } = await import('../components/ScreenMessageCard')
      const messagesApi = await import('../api/messages')
      // resetModules() above also gives '@/i18n' a fresh module instance,
      // which loses the 'en' override src/test-setup.ts applied to the
      // ORIGINAL instance and falls back to defaultLanguage ('he'). Force it
      // again on this fresh instance so button/note text is deterministic.
      const { default: freshI18n } = await import('@/i18n')
      await freshI18n.changeLanguage('en')
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      })
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
      render(
        <QueryClientProvider client={queryClient}>
          <RealCard message={message} />
        </QueryClientProvider>,
      )
      return { messagesApi, invalidateSpy }
    }

    it('a 409 MESSAGE_VERSION_STALE surfaces the inline note and invalidates the screenMessages list', async () => {
      const { messagesApi, invalidateSpy } = await renderWithRealHook(
        baseMessage({ requires_acknowledgment: true, is_acknowledged: false, version: 7 }),
      )
      // Matches the flat shape the axios interceptor actually rejects with
      // (services/api/client.ts) — err.code, not err.response.data.error.code.
      vi.mocked(messagesApi.acknowledgeMessage).mockRejectedValue({
        code: 'MESSAGE_VERSION_STALE',
        message: 'The message has changed.',
      })

      fireEvent.click(screen.getByRole('button', { name: 'Accept' }))

      await screen.findByRole('alert')
      expect(screen.getByRole('alert')).toHaveTextContent(
        'This message was updated. Please read it again.',
      )
      // Without the fix, retrying just 409s again until the 5-minute
      // staleTime expires — this is the invalidation that prevents that.
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['screenMessages'] })
    })

    it('a non-409 failure surfaces the generic failure note (and does not invalidate)', async () => {
      const { messagesApi, invalidateSpy } = await renderWithRealHook(
        baseMessage({ requires_acknowledgment: true, is_acknowledged: false, version: 7 }),
      )
      vi.mocked(messagesApi.acknowledgeMessage).mockRejectedValue({
        code: 'SERVER_ERROR',
        message: 'boom',
      })

      fireEvent.click(screen.getByRole('button', { name: 'Accept' }))

      await screen.findByRole('alert')
      expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong. Please try again.')
      expect(invalidateSpy).not.toHaveBeenCalledWith({ queryKey: ['screenMessages'] })
    })
  })
})
