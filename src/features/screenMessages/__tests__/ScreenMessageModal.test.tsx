import { useState, type ReactNode } from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ScreenMessageModal } from '../components/ScreenMessageModal'
import type { ScreenMessage } from '../types'
import type { FlatApiError } from '../hooks/useMessageActions'

const mockAcknowledgeMutateAsync = vi.fn()
const mockDismissMutateAsync = vi.fn()
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
    mutateAsync: mockAcknowledgeMutateAsync,
    isPending: acknowledgeState.isPending,
    error: acknowledgeState.error,
  }),
  useDismissMessage: () => ({
    mutateAsync: mockDismissMutateAsync,
    isPending: dismissState.isPending,
    error: dismissState.error,
  }),
}))

const mockSession: { current: { id: string } | null } = { current: { id: 'user-1' } }
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
    version: 3,
    kind: 'terms',
    display_mode: 'modal',
    title: 'Tournament terms',
    body: 'Please read the rules before playing.',
    is_dismissible: false,
    requires_acknowledgment: false,
    gate_actions: [],
    is_acknowledged: false,
    acknowledged_at: null,
    ...overrides,
  }
}

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

// Mirrors how ScreenMessageModalHost actually mounts/unmounts this
// component: it starts already open (an auto-opened modal, not one behind a
// trigger the player clicked — the realistic case for defects #1 and #4),
// and "closed" means removed from the tree in response to onOpenChange(false)
// — never an open->false prop transition. A harness that keeps rendering
// after a FAILED close attempt is exactly what proves defect #1 stays fixed;
// one that unmounts on a SUCCESSFUL close is what proves it doesn't regress.
function AutoOpenHarness({
  message,
  children,
}: {
  message: ScreenMessage
  children?: ReactNode
}) {
  const [mounted, setMounted] = useState(true)
  return (
    <>
      <button data-testid="page-anchor">Page anchor</button>
      {children}
      {mounted && (
        <ScreenMessageModal
          message={message}
          onOpenChange={(next) => {
            if (!next) setMounted(false)
          }}
        />
      )}
    </>
  )
}

beforeEach(() => {
  mockAcknowledgeMutateAsync.mockReset()
  mockAcknowledgeMutateAsync.mockResolvedValue({ acknowledged: true })
  mockDismissMutateAsync.mockReset()
  mockDismissMutateAsync.mockResolvedValue({ dismissed: true })
  acknowledgeState.isPending = false
  acknowledgeState.error = null
  dismissState.isPending = false
  dismissState.error = null
  mockRequireSignIn.mockReset()
  mockRequireSignIn.mockResolvedValue(undefined)
  mockSession.current = { id: 'user-1' }
})

describe('ScreenMessageModal', () => {
  it('renders real dialog semantics: role=dialog, aria-modal, labelled by the title', () => {
    const onOpenChange = vi.fn()
    render(
      <ScreenMessageModal message={baseMessage()} onOpenChange={onOpenChange} />,
    )
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    const labelledBy = dialog.getAttribute('aria-labelledby')
    expect(labelledBy).toBeTruthy()
    expect(document.getElementById(labelledBy!)).toHaveTextContent('Tournament terms')
  })

  it("carries dir='auto' on the content, so the author's own language decides", () => {
    // Same rule as ScreenMessageCard: direction comes from the text itself, not
    // from a locale the server had to resolve and store.
    render(
      <ScreenMessageModal
        message={baseMessage({ body: '\u05d6\u05d4\u05d5 \u05d4\u05d5\u05d3\u05e2\u05d4 \u05d1\u05e2\u05d1\u05e8\u05d9\u05ea' })}
        onOpenChange={vi.fn()}
      />,
    )
    const body = screen.getByText('\u05d6\u05d4\u05d5 \u05d4\u05d5\u05d3\u05e2\u05d4 \u05d1\u05e2\u05d1\u05e8\u05d9\u05ea')
    expect(body.closest('[dir]')).toHaveAttribute('dir', 'auto')
  })

  describe('gating modal (defect: an orphan receipt from calling /acknowledge here)', () => {
    it('ticking accept fires no network call, calls onToggle, and closes — SCREEN_MESSAGES_WEB_SPEC.md §6a', () => {
      const onToggle = vi.fn<(id: string, version: number) => void>()
      const onOpenChange = vi.fn()
      render(
        <ScreenMessageModal
          message={baseMessage({
            id: 'msg-1',
            version: 5,
            requires_acknowledgment: true,
            is_acknowledged: false,
            gate_actions: ['tournament_registration'],
          })}
          selection={selection({ onToggle })}
          onOpenChange={onOpenChange}
        />,
      )
      const checkbox = screen.getByRole('checkbox', { name: 'I accept the tournament terms' })
      expect(checkbox).toHaveAttribute('aria-required', 'true')
      fireEvent.click(checkbox)

      expect(onToggle).toHaveBeenCalledWith('msg-1', 5)
      expect(mockAcknowledgeMutateAsync).not.toHaveBeenCalled()
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
  })

  describe('informational modal — dismissible ("Don\'t show again")', () => {
    function dismissibleMessage() {
      return baseMessage({
        kind: 'info',
        is_dismissible: true,
        requires_acknowledgment: false,
        gate_actions: [],
      })
    }

    it("ticking Don't show again then closing calls dismiss with the message's id and version", async () => {
      const onOpenChange = vi.fn()
      render(<ScreenMessageModal message={dismissibleMessage()} onOpenChange={onOpenChange} />)
      fireEvent.click(screen.getByRole('checkbox', { name: "Don't show again" }))
      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })

      await waitFor(() =>
        expect(mockDismissMutateAsync).toHaveBeenCalledWith({ messageId: 'msg-1', version: 3 }),
      )
      await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
    })

    it('closing WITHOUT ticking it never calls dismiss — the defect: firing dismiss just for reading the notice', async () => {
      const onOpenChange = vi.fn()
      render(<ScreenMessageModal message={dismissibleMessage()} onOpenChange={onOpenChange} />)
      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })

      await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
      expect(mockDismissMutateAsync).not.toHaveBeenCalled()
    })

    it('a failing dismiss leaves the modal open and shows the error — catches Task 9 #1 (the "Don\'t show again" half)', async () => {
      mockDismissMutateAsync.mockImplementation(async () => {
        const err: FlatApiError = { code: 'DISMISS_FAILED', message: 'boom' }
        dismissState.error = err
        throw err
      })
      const message = dismissibleMessage()
      const { rerender } = render(<AutoOpenHarness message={message} />)
      fireEvent.click(screen.getByRole('checkbox', { name: "Don't show again" }))
      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })

      // Give the rejected mutateAsync's catch block a full macrotask to
      // settle, then force a re-render so the (fully mocked) hook's updated
      // `.error` shows up in the DOM.
      await new Promise((resolve) => setTimeout(resolve, 0))
      rerender(<AutoOpenHarness message={message} />)

      expect(screen.getByRole('dialog')).toBeInTheDocument() // never unmounted — onOpenChange(false) was never called
      expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong. Please try again.')
    })
  })

  describe('modal gating an action outside this page\'s selection — Accept button, not checkbox', () => {
    // Renamed and re-fixtured from the previous "informational modal —
    // requires acknowledgment, gates nothing" block. That framing described
    // an impossible state: rally-api derives `requires_acknowledgment` as
    // `bool(gate_actions)` (app/models/screen_message.py:82-85), so a message
    // that requires acknowledgment always gates *something*. The real
    // reachable shape for the Accept-button branch is a message that gates
    // an action this page's `selection` doesn't cover — e.g. ClubDetailPage
    // mounts ScreenMessageModalHost with no `selection` prop at all, so any
    // acknowledgeable modal there (SCREEN_REACHABLE_ACTIONS['club'] includes
    // court_booking) takes this path, never the checkbox.
    function acceptButtonMessage(overrides: Partial<ScreenMessage> = {}) {
      return baseMessage({
        requires_acknowledgment: true,
        is_acknowledged: false,
        gate_actions: ['court_booking'],
        ...overrides,
      })
    }

    it('Accept calls the acknowledge mutation (already signed in) and closes once it resolves', async () => {
      const onOpenChange = vi.fn()
      render(<ScreenMessageModal message={acceptButtonMessage()} onOpenChange={onOpenChange} />)
      fireEvent.click(screen.getByRole('button', { name: 'Accept' }))
      expect(mockAcknowledgeMutateAsync).toHaveBeenCalledWith({ messageId: 'msg-1', version: 3 })
      expect(mockRequireSignIn).not.toHaveBeenCalled()
      expect(onOpenChange).not.toHaveBeenCalled() // not yet — still awaiting the write
      await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
    })

    it('an anonymous viewer is gated through requireSignIn before the mutation fires', async () => {
      mockSession.current = null
      const onOpenChange = vi.fn()
      render(<ScreenMessageModal message={acceptButtonMessage()} onOpenChange={onOpenChange} />)
      fireEvent.click(screen.getByRole('button', { name: 'Accept' }))
      await waitFor(() => expect(mockRequireSignIn).toHaveBeenCalledTimes(1))
      await waitFor(() =>
        expect(mockAcknowledgeMutateAsync).toHaveBeenCalledWith({ messageId: 'msg-1', version: 3 }),
      )
      await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
    })

    it('an already-acknowledged message shows the confirmed state, not a second Accept control', () => {
      const onOpenChange = vi.fn()
      render(
        <ScreenMessageModal
          message={acceptButtonMessage({ is_acknowledged: true })}
          onOpenChange={onOpenChange}
        />,
      )
      expect(screen.getByText('Accepted')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Accept' })).not.toBeInTheDocument()
    })

    it('a failing acknowledge mutation leaves the modal open and renders the error — catches Task 9 #1', async () => {
      mockAcknowledgeMutateAsync.mockImplementation(async () => {
        const err: FlatApiError = { code: 'ACK_FAILED', message: 'boom' }
        acknowledgeState.error = err
        throw err
      })
      const message = acceptButtonMessage()
      const { rerender } = render(<AutoOpenHarness message={message} />)
      fireEvent.click(screen.getByRole('button', { name: 'Accept' }))

      // Give the rejected mutateAsync's catch block a full macrotask to
      // settle, then force a re-render so the (fully mocked) hook's updated
      // `.error` shows up in the DOM.
      await new Promise((resolve) => setTimeout(resolve, 0))
      rerender(<AutoOpenHarness message={message} />)

      expect(screen.getByRole('dialog')).toBeInTheDocument() // never unmounted — onOpenChange(false) was never called
      expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong. Please try again.')
    })

    it('a MESSAGE_VERSION_STALE failure renders the stale-version copy, not the generic one', async () => {
      mockAcknowledgeMutateAsync.mockImplementation(async () => {
        const err: FlatApiError = { code: 'MESSAGE_VERSION_STALE', message: 'stale' }
        acknowledgeState.error = err
        throw err
      })
      const message = acceptButtonMessage()
      const { rerender } = render(<AutoOpenHarness message={message} />)
      fireEvent.click(screen.getByRole('button', { name: 'Accept' }))
      await new Promise((resolve) => setTimeout(resolve, 0))
      rerender(<AutoOpenHarness message={message} />)
      expect(screen.getByRole('alert')).toHaveTextContent(
        'This message was updated. Please read it again.',
      )
    })

    it('Escape is ignored while an accept this player started is still in flight — does not close mid-write', async () => {
      let resolveAccept: (() => void) | undefined
      mockAcknowledgeMutateAsync.mockImplementation(
        () =>
          new Promise<{ acknowledged: boolean }>((resolve) => {
            resolveAccept = () => resolve({ acknowledged: true })
          }),
      )
      const message = acceptButtonMessage()
      const { rerender } = render(<AutoOpenHarness message={message} />)
      fireEvent.click(screen.getByRole('button', { name: 'Accept' }))

      // Simulate the isPending the real TanStack hook would report while
      // the click above is still awaiting mutateAsync.
      acknowledgeState.isPending = true
      rerender(<AutoOpenHarness message={message} />)

      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
      expect(screen.getByRole('dialog')).toBeInTheDocument() // Escape ignored — write still in flight

      // Let the write resolve so nothing dangles into later tests.
      resolveAccept?.()
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
  })

  describe('closing never traps the player', () => {
    it('Escape calls onOpenChange(false) even on a gating message with nothing ticked', () => {
      const onOpenChange = vi.fn()
      render(
        <ScreenMessageModal
          message={baseMessage({
            requires_acknowledgment: true,
            is_acknowledged: false,
            gate_actions: ['tournament_registration'],
          })}
          selection={selection()}
          onOpenChange={onOpenChange}
        />,
      )
      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
  })

  describe('focus management', () => {
    // Mirrors how ScreenMessageModalHost actually mounts/unmounts this
    // component: it is always `open`, and "closed" means removed from the
    // tree entirely, not an open->false prop transition. This harness
    // reproduces exactly that sequence — focus the page, THEN mount, THEN
    // unmount — rather than assuming Radix's onCloseAutoFocus fires on a
    // path this component never takes.
    function MountToggleHarness({ message }: { message: ScreenMessage }) {
      const [mounted, setMounted] = useState(false)
      return (
        <>
          <button data-testid="page-anchor">Page anchor</button>
          <button data-testid="toggle-mount" onClick={() => setMounted((m) => !m)}>
            toggle
          </button>
          {mounted && (
            <ScreenMessageModal message={message} onOpenChange={() => setMounted(false)} />
          )}
        </>
      )
    }

    it('moves focus into the dialog on open', async () => {
      render(<MountToggleHarness message={baseMessage()} />)
      const anchor = screen.getByTestId('page-anchor')
      anchor.focus()
      expect(document.activeElement).toBe(anchor)

      fireEvent.click(screen.getByTestId('toggle-mount')) // mounts the modal

      const dialog = await screen.findByRole('dialog')
      await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true))
    })

    it('restores focus to the page (not lost to <body>) once the modal is removed from the tree', async () => {
      render(<MountToggleHarness message={baseMessage()} />)
      const anchor = screen.getByTestId('page-anchor')
      anchor.focus()
      expect(document.activeElement).toBe(anchor)

      fireEvent.click(screen.getByTestId('toggle-mount')) // mount — captures `anchor`
      await screen.findByRole('dialog')

      fireEvent.click(screen.getByTestId('toggle-mount')) // unmount — the only close path
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      await waitFor(() => expect(document.activeElement).toBe(anchor))
      expect(document.activeElement).not.toBe(document.body)
    })

    it('on close, focus moves to the inline card fallback (#screen-message-<id>) when one exists — catches Task 9 #4', async () => {
      const message = baseMessage() // id: 'msg-1'
      render(
        <AutoOpenHarness message={message}>
          <div id={`screen-message-${message.id}`} data-testid="inline-card">
            Inline card
          </div>
        </AutoOpenHarness>,
      )
      const dialog = screen.getByRole('dialog')
      fireEvent.keyDown(dialog, { key: 'Escape' })
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

      const card = screen.getByTestId('inline-card')
      await waitFor(() => expect(document.activeElement).toBe(card))
      expect(card).toHaveAttribute('tabindex', '-1')
    })

    it('on close, focus moves to the page main container when no inline card exists — catches Task 9 #4', async () => {
      const message = baseMessage({ id: 'no-card-msg' })
      render(
        <AutoOpenHarness message={message}>
          <main data-testid="page-main">Page content</main>
        </AutoOpenHarness>,
      )
      const dialog = screen.getByRole('dialog')
      fireEvent.keyDown(dialog, { key: 'Escape' })
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

      const main = screen.getByTestId('page-main')
      await waitFor(() => expect(document.activeElement).toBe(main))
      expect(main).toHaveAttribute('tabindex', '-1')
    })
  })
})
